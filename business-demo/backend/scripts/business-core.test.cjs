const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
require('reflect-metadata');
const { BusinessStore } = require('../dist/business/store');
const { BusinessService } = require('../dist/business/business.service');
const { BusinessController } = require('../dist/business/business.controller');
const { RulesRegistryService } = require('../dist/rules/rules-registry.service');
const { plainToInstance } = require('class-transformer');
const { validateSync } = require('class-validator');
const { PreviewDto } = require('../dist/business/dto');
const { digest } = require('../dist/business/domain');

describe('Production business service and SQLite, without HTTP transport', () => {
  let store, service, controller, auth, filename;
  const root = path.resolve('../artifacts/core-databases');
  fs.mkdirSync(root, { recursive: true });
  function open() {
    store = new BusinessStore(filename);
    service = new BusinessService(store, new RulesRegistryService());
    controller = new BusinessController(service);
    auth = 'Bearer ' + controller.login({ role: 'manager' }).token;
  }
  const count = () => controller.orders(auth).orders.length;
  function reviewed(changes) {
    const plan = controller.preview(auth, { ...(changes ? { changes } : {}) });
    const review = controller.review(auth, plan.id, { contentHash: plan.contentHash, acknowledged: true });
    return { plan, review, body: { planId: plan.id, reviewId: review.id, contentHash: plan.contentHash } };
  }
  const confirm = (r, key = 'synthetic-core-request-001') => controller.confirm(auth, key, r.body);
  function failure(operation, status, code) {
    assert.throws(operation, error => error.getStatus?.() === status && error.getResponse().code === code);
  }
  beforeEach(() => { filename = path.join(fs.mkdtempSync(path.join(root, 'case-')), 'synthetic.sqlite'); open(); });
  afterEach(() => store.db.close());

  it('serves synthetic forecast items, traffic and the same inventory source', () => {
    const sales = controller.sales(auth), traffic = controller.traffic(auth), inventory = controller.inventory(auth);
    assert.deepEqual(sales.items.map(x => x.recommendedAmount), [30, 25, 0]);
    assert.equal(sales.synthetic, true); assert.equal(traffic.snapshotId, sales.id);
    assert.equal(traffic.points.length, 3); assert.equal(inventory.inputVersion, sales.inputVersion);
  });
  it('keeps preview and review separate from orders and persists the exact approved content', () => {
    const r = reviewed(); assert.equal(count(), 0);
    const saved = confirm(r); assert.equal(saved.repeated, false); assert.equal(count(), 1);
    assert.equal(saved.receipt.execution, 'SIMULATED_ONLY_NO_SUPPLIER');
    assert.deepEqual(saved.receipt.plan, r.plan); assert.deepEqual(saved.receipt.review, r.review);
    assert.deepEqual(controller.order(auth, saved.receipt.id), saved.receipt);
  });
  it('rejects inventory changed during review, then accepts a newly calculated and reviewed plan', () => {
    const old = reviewed(); controller.changeInventory(auth, { sku: 'SYN-RICE', delta: -5, expectedRevision: 1 });
    failure(() => confirm(old), 409, 'INVENTORY_CHANGED'); assert.equal(count(), 0);
    const fresh = reviewed(); assert.equal(fresh.plan.items[0].quantity, 35);
    assert.notEqual(old.plan.inputVersion, fresh.plan.inputVersion); assert.equal(confirm(fresh).receipt.plan.source.revision, 2);
  });
  it('requires review of manually modified quantities', () => {
    const old = reviewed(); const edited = controller.preview(auth, { changes: [{ sku: 'SYN-RICE', quantity: 31.5 }] });
    assert.notEqual(old.plan.contentHash, edited.contentHash);
    failure(() => controller.confirm(auth, 'modified-plan-request', { planId: edited.id, reviewId: old.review.id, contentHash: edited.contentHash }), 409, 'REVIEW_REQUIRED');
    assert.equal(count(), 0); assert.equal(confirm(reviewed([{ sku: 'SYN-RICE', quantity: 31.5 }])).receipt.plan.items[0].quantity, 31.5);
  });
  it('returns one persisted order and receipt for a repeated request', () => {
    const r = reviewed(), first = confirm(r), second = confirm(r);
    assert.equal(first.repeated, false); assert.equal(second.repeated, true);
    assert.deepEqual(first.receipt, second.receipt); assert.equal(count(), 1);
  });
  it('rejects a reused key for different content and a second key for the same confirmed plan', () => {
    const r = reviewed(); confirm(r);
    failure(() => confirm(reviewed([{ sku: 'SYN-RICE', quantity: 32 }])), 409, 'IDEMPOTENCY_CONFLICT');
    failure(() => confirm(r, 'another-confirmation-key'), 409, 'PLAN_ALREADY_CONFIRMED'); assert.equal(count(), 1);
  });
  it('rechecks session and role in production controller methods', () => {
    const r = reviewed(); failure(() => controller.orders('Bearer missing-session'), 401, 'LOGIN_REQUIRED');
    const viewer = 'Bearer ' + controller.login({ role: 'viewer' }).token;
    assert.equal(controller.inventory(viewer).source.revision, 1);
    failure(() => controller.confirm(viewer, 'viewer-request-key', r.body), 403, 'PERMISSION_DENIED');
    failure(() => controller.changeInventory(viewer, { sku: 'SYN-RICE', delta: -5, expectedRevision: 1 }), 403, 'PERMISSION_DENIED');
    assert.equal(count(), 0);
  });
  it('rolls back an actual SQLite write refusal and retries the same request after recovery', () => {
    const r = reviewed(); store.db.exec('PRAGMA query_only=ON');
    failure(() => confirm(r), 503, 'WRITE_FAILED'); assert.equal(count(), 0);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM confirmations').get().n, 0);
    store.db.exec('PRAGMA query_only=OFF'); assert.equal(confirm(r).repeated, false); assert.equal(count(), 1);
  });
  it('rolls back an order insert if the linked confirmation insert fails', () => {
    const r = reviewed();
    store.db.exec("CREATE TRIGGER refuse_confirmation BEFORE INSERT ON confirmations BEGIN SELECT RAISE(ABORT, 'synthetic test failure'); END");
    failure(() => confirm(r), 503, 'WRITE_FAILED'); assert.equal(count(), 0);
    assert.equal(store.db.prepare('SELECT count(*) AS n FROM confirmations').get().n, 0);
    store.db.exec('DROP TRIGGER refuse_confirmation'); assert.equal(confirm(r).repeated, false);
  });
  it('reads and replays the persisted receipt in an independent new Node process', () => {
    const r = reviewed(), first = confirm(r); store.db.close();
    const script = `const {BusinessStore}=require('./dist/business/store');const {BusinessService}=require('./dist/business/business.service');const {RulesRegistryService}=require('./dist/rules/rules-registry.service');const store=new BusinessStore(process.argv[1]);const service=new BusinessService(store,new RulesRegistryService());const login=service.login('manager');const actor=service.actor('Bearer '+login.token,true);const result=service.confirm(JSON.parse(process.argv[2]),'synthetic-core-request-001',actor);process.stdout.write(JSON.stringify(result));store.db.close();`;
    const result = spawnSync(process.execPath, ['-e', script, filename, JSON.stringify(r.body)], { cwd: process.cwd(), encoding: 'utf8', windowsHide: true });
    assert.equal(result.status, 0, result.stderr); const second = JSON.parse(result.stdout);
    assert.equal(second.repeated, true); assert.deepEqual(second.receipt, first.receipt); open(); assert.equal(count(), 1);
  });
  it('exports the original saved record after inventory changes, without recalculation', async () => {
    const r = reviewed([{ sku: 'SYN-RICE', quantity: 31.5 }]), saved = confirm(r).receipt;
    controller.changeInventory(auth, { sku: 'SYN-RICE', delta: -5, expectedRevision: 1 });
    assert.deepEqual(controller.order(auth, saved.id), saved); assert.equal(saved.plan.source.inventory[0].currentStock, 25);
    const docx = await service.report(saved.id); assert.equal(docx.subarray(0, 2).toString(), 'PK');
    fs.writeFileSync(path.resolve('../artifacts/core-example-receipt.json'), JSON.stringify(saved, null, 2));
    fs.writeFileSync(path.resolve('../artifacts/core-example-report.docx'), docx);
  });
  it('rejects missing review, absent request key and an all-zero order', () => {
    const p = controller.preview(auth, {});
    failure(() => controller.confirm(auth, 'unreviewed-request-key', { planId: p.id, contentHash: p.contentHash, reviewId: 'missing-review' }), 409, 'REVIEW_REQUIRED');
    const r = reviewed(); failure(() => controller.confirm(auth, undefined, r.body), 400, 'REQUEST_KEY_REQUIRED');
    const zero = reviewed(['SYN-RICE', 'SYN-CHICKEN', 'SYN-GREENS'].map(sku => ({ sku, quantity: 0 })));
    failure(() => confirm(zero), 400, 'EMPTY_ORDER'); assert.equal(count(), 0);
  });
  it('validates quantity precision and bounds using the actual request DTO definitions', () => {
    for (const quantity of [-1, 1.234, 10001, null]) {
      const dto = plainToInstance(PreviewDto, { changes: [{ sku: 'SYN-RICE', quantity }] });
      assert.ok(validateSync(dto, { whitelist: true, forbidNonWhitelisted: true }).length > 0);
    }
    failure(() => controller.preview(auth, { changes: [{ sku: 'SYN-RICE', quantity: 1 }, { sku: 'SYN-RICE', quantity: 2 }] }), 400, 'INVALID_ITEM');
  });
  it('binds rule implementation, policy values and concrete saved plan contents', () => {
    const r = reviewed(); assert.match(r.plan.policy.implementation.registrySha256, /^[a-f0-9]{64}$/);
    assert.match(r.plan.policy.implementation.calculationSha256, /^[a-f0-9]{64}$/);
    assert.equal(r.plan.ruleHash, digest(r.plan.policy));
    const changed = { ...r.plan, ruleHash: 'different-rule-code' };
    store.db.prepare('UPDATE plans SET body=? WHERE id=?').run(JSON.stringify(changed), r.plan.id);
    failure(() => confirm(r), 409, 'RULE_CHANGED');
    changed.ruleHash = r.plan.ruleHash; changed.items[0].quantity = 999;
    store.db.prepare('UPDATE plans SET body=? WHERE id=?').run(JSON.stringify(changed), r.plan.id);
    failure(() => confirm(r), 409, 'CONTENT_CHANGED'); assert.equal(count(), 0);
  });
});
