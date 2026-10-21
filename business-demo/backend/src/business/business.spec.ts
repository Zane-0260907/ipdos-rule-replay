import { describe, it, beforeEach, afterEach } from 'node:test';
import { expect } from 'expect';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { join } from 'node:path';
import { createBusinessApp } from './bootstrap';
import { BusinessStore } from './store';
import JSZip from 'jszip';
import { xml2js } from 'xml-js';
import { writeFileSync } from 'node:fs';

describe('Original business UI procurement API: isolated synthetic SQLite flow', () => {
  let app: INestApplication;
  let store: BusinessStore;
  let filename: string;
  let token: string;
  const auth = () => ({ Authorization: 'Bearer ' + token });
  const orders = async () => (await request(app.getHttpServer()).get('/orders').set(auth()).expect(200)).body.data.orders;
  async function start() { process.env.BUSINESS_DATA_FILE = filename; app = await createBusinessApp(); await app.listen(0, '127.0.0.1'); store = app.get(BusinessStore); token = (await request(app.getHttpServer()).post('/auth/login').send({ role: 'manager' }).expect(201)).body.data.token; }
  async function preview(changes?: unknown[]) { return (await request(app.getHttpServer()).post('/procurement/plans').set(auth()).send({ ...(changes ? { changes } : {}) }).expect(201)).body.data; }
  async function reviewed(changes?: unknown[]) {
    const plan = await preview(changes);
    const review = (await request(app.getHttpServer()).post('/procurement/plans/' + plan.id + '/review').set(auth()).send({ contentHash: plan.contentHash, acknowledged: true }).expect(201)).body.data;
    return { plan, review, body: { planId: plan.id, reviewId: review.id, contentHash: plan.contentHash } };
  }
  const confirm = (body: object, key = 'synthetic-request-001') => request(app.getHttpServer()).post('/orders/confirm').set(auth()).set('Idempotency-Key', key).send(body);
  beforeEach(async () => {
    const testRoot = resolve('../artifacts/test-databases');
    mkdirSync(testRoot, { recursive: true });
    filename = join(mkdtempSync(join(testRoot, 'case-')), 'synthetic.sqlite');
    await start();
  });
  afterEach(async () => { await app.close(); });

  it('returns enveloped forecast items and traffic points from one explicit synthetic snapshot', async () => {
    const sales = (await request(app.getHttpServer()).post('/predictions/sales').set(auth()).send({}).expect(201)).body;
    expect(sales.error).toBeNull(); expect(sales.data.synthetic).toBe(true);
    expect(sales.data.items.map((x: any) => [x.sku, x.recommendedAmount])).toEqual([['SYN-RICE', 30], ['SYN-CHICKEN', 25], ['SYN-GREENS', 0]]);
    const traffic = (await request(app.getHttpServer()).post('/predictions/traffic').set(auth()).send({}).expect(201)).body.data;
    expect(traffic.points).toHaveLength(3); expect(traffic.snapshotId).toBe(sales.data.id);
  });
  it('preview and review create no orders; valid confirmation persists linked content, review and receipt', async () => {
    const r = await reviewed(); expect(await orders()).toHaveLength(0);
    const saved = (await confirm(r.body).expect(201)).body.data;
    expect(saved.repeated).toBe(false); expect(saved.receipt.execution).toBe('SIMULATED_ONLY_NO_SUPPLIER');
    expect(saved.receipt.plan.contentHash).toBe(r.plan.contentHash); expect(saved.receipt.review.id).toBe(r.review.id);
    expect(await orders()).toEqual([saved.receipt]);
  });
  it('rejects inventory changed during human review and requires a newly reviewed plan', async () => {
    const old = await reviewed();
    await request(app.getHttpServer()).post('/procurement/demo/inventory').set(auth()).send({ sku: 'SYN-RICE', delta: -5, expectedRevision: 1 }).expect(201);
    const rejected = await confirm(old.body).expect(409); expect(rejected.body.code).toBe('INVENTORY_CHANGED'); expect(await orders()).toHaveLength(0);
    const fresh = await reviewed(); expect(fresh.plan.items[0].quantity).toBe(35); expect(fresh.plan.inputVersion).not.toBe(old.plan.inputVersion);
    expect((await confirm(fresh.body).expect(201)).body.data.receipt.plan.source.revision).toBe(2);
  });
  it('binds manual quantities to new content and refuses the old review for a modified plan', async () => {
    const original = await reviewed(); const modified = await preview([{ sku: 'SYN-RICE', quantity: 31.5 }]);
    expect(modified.contentHash).not.toBe(original.plan.contentHash); expect(await orders()).toHaveLength(0);
    const rejected = await confirm({ planId: modified.id, contentHash: modified.contentHash, reviewId: original.review.id }).expect(409);
    expect(rejected.body.code).toBe('REVIEW_REQUIRED');
    const fresh = await reviewed([{ sku: 'SYN-RICE', quantity: 31.5 }]);
    expect((await confirm(fresh.body).expect(201)).body.data.receipt.plan.items[0].quantity).toBe(31.5);
  });
  it('repeats the same request with its original durable receipt, including concurrent HTTP submissions', async () => {
    const r = await reviewed(); const [a, b] = await Promise.all([confirm(r.body), confirm(r.body)]);
    expect(a.status).toBe(201); expect(b.status).toBe(201); expect(a.body.data.receipt).toEqual(b.body.data.receipt);
    expect([a.body.data.repeated, b.body.data.repeated].sort()).toEqual([false, true]); expect(await orders()).toHaveLength(1);
  });
  it('rejects the same key with different content and another key for an already confirmed plan', async () => {
    const r = await reviewed(); await confirm(r.body).expect(201);
    const alternate = await reviewed([{ sku: 'SYN-RICE', quantity: 31 }]);
    expect((await confirm(alternate.body).expect(409)).body.code).toBe('IDEMPOTENCY_CONFLICT');
    expect((await confirm(r.body, 'different-request-002').expect(409)).body.code).toBe('PLAN_ALREADY_CONFIRMED'); expect(await orders()).toHaveLength(1);
  });
  it('rechecks server-side permissions and rejects missing sessions and viewer writes', async () => {
    const r = await reviewed(); const viewer = (await request(app.getHttpServer()).post('/auth/login').send({ role: 'viewer' }).expect(201)).body.data.token;
    await request(app.getHttpServer()).get('/inventory').expect(401);
    await request(app.getHttpServer()).get('/inventory').set('Authorization', 'Bearer ' + viewer).expect(200);
    token = viewer; expect((await confirm(r.body).expect(403)).body.code).toBe('PERMISSION_DENIED');
    await request(app.getHttpServer()).post('/procurement/demo/inventory').set(auth()).send({ sku: 'SYN-RICE', delta: -5, expectedRevision: 1 }).expect(403);
    expect(await orders()).toHaveLength(0);
  });
  it('rolls back a real SQLite write refusal and allows retry with the same key after recovery', async () => {
    const r = await reviewed(); store.db.exec('PRAGMA query_only=ON');
    expect((await confirm(r.body).expect(503)).body.code).toBe('WRITE_FAILED'); expect(await orders()).toHaveLength(0);
    expect(store.db.prepare('SELECT count(*) AS n FROM confirmations').get()!.n).toBe(0);
    store.db.exec('PRAGMA query_only=OFF'); expect((await confirm(r.body).expect(201)).body.data.repeated).toBe(false);
  });
  it('reads the same order after application/database restart and replays the persisted confirmation', async () => {
    const r = await reviewed(); const first = (await confirm(r.body).expect(201)).body.data;
    await app.close(); await start(); expect(await orders()).toEqual([first.receipt]);
    const repeated = (await confirm(r.body).expect(201)).body.data; expect(repeated.repeated).toBe(true); expect(repeated.receipt).toEqual(first.receipt);
  });
  it('exports a DOCX from the saved order and keeps the original input after subsequent inventory changes', async () => {
    const r = await reviewed([{ sku: 'SYN-RICE', quantity: 31.5 }]); const receipt = (await confirm(r.body).expect(201)).body.data.receipt;
    await request(app.getHttpServer()).post('/procurement/demo/inventory').set(auth()).send({ sku: 'SYN-RICE', delta: -5, expectedRevision: 1 }).expect(201);
    const saved = (await request(app.getHttpServer()).get('/orders/' + receipt.id).set(auth()).expect(200)).body.data;
    expect(saved).toEqual(receipt); expect(saved.plan.source.inventory[0].currentStock).toBe(25);
    // Superagent has no explicit DOCX parser; capture the actual response bytes.
    const report = await request(app.getHttpServer()).get('/orders/' + receipt.id + '/report').set(auth()).buffer(true)
      .parse((response: any, done: (error: Error | null, body?: Buffer) => void) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(chunk));
        response.on('end', () => done(null, Buffer.concat(chunks)));
        response.on('error', done);
      }).expect(200);
    expect(report.headers['content-type']).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(report.headers['content-disposition']).toContain(receipt.id + '.docx');
    expect(Buffer.isBuffer(report.body)).toBe(true);
    expect(Number(report.headers['content-length'])).toBe(report.body.length);
    expect(report.body.subarray(0, 2).toString()).toBe('PK');
    const zip = await JSZip.loadAsync(report.body, { checkCRC32: true });
    expect(zip.file('[Content_Types].xml')).not.toBeNull();
    const xml = await zip.file('word/document.xml')!.async('string');
    for (const value of [receipt.id, receipt.receiptId, receipt.plan.contentHash, receipt.plan.inputVersion, receipt.plan.ruleHash, receipt.review.id]) expect(xml).toContain(value);
    const find = (node: any, name: string): any[] => [...(node.name === name ? [node] : []), ...(node.elements ?? []).flatMap((child: any) => find(child, name))];
    const text = (node: any): string => (node.text ?? '') + (node.elements ?? []).map(text).join('');
    const rows = find(xml2js(xml), 'w:tr').map(row => find(row, 'w:tc').map(text));
    for (const item of receipt.plan.items) {
      const row = rows.find(cells => cells[0].endsWith(' / ' + item.sku));
      expect(row?.slice(1).map(Number)).toEqual([item.demand, item.currentStock, item.recommendedAmount, item.quantity]);
    }
    expect(xml).toContain('未向供应商发送');
    writeFileSync(resolve('../artifacts/api-example-report.docx'), report.body);
    writeFileSync(resolve('../artifacts/api-example-receipt.json'), JSON.stringify(saved, null, 2));
  });
  it('rejects unreviewed, zero, duplicate, negative and overprecision quantities', async () => {
    const p = await preview(); expect((await confirm({ planId: p.id, contentHash: p.contentHash, reviewId: 'nonexistent-review' }).expect(409)).body.code).toBe('REVIEW_REQUIRED');
    for (const quantity of [-1, 1.234, 10001]) await request(app.getHttpServer()).post('/procurement/plans').set(auth()).send({ changes: [{ sku: 'SYN-RICE', quantity }] }).expect(400);
    await request(app.getHttpServer()).post('/procurement/plans').set(auth()).send({ changes: [{ sku: 'SYN-RICE', quantity: 1 }, { sku: 'SYN-RICE', quantity: 2 }] }).expect(400);
    const empty = await reviewed(['SYN-RICE', 'SYN-CHICKEN', 'SYN-GREENS'].map(sku => ({ sku, quantity: 0 })));
    expect((await confirm(empty.body).expect(400)).body.code).toBe('EMPTY_ORDER'); expect(await orders()).toHaveLength(0);
  });
  it('detects a changed rule binding or modified stored content instead of trusting a plan ID', async () => {
    const r = await reviewed(); const altered = { ...r.plan, ruleHash: 'changed-rule-artifact' };
    store.db.prepare('UPDATE plans SET body=? WHERE id=?').run(JSON.stringify(altered), r.plan.id);
    expect((await confirm(r.body).expect(409)).body.code).toBe('RULE_CHANGED');
    altered.ruleHash = r.plan.ruleHash; altered.items[0].quantity = 999;
    store.db.prepare('UPDATE plans SET body=? WHERE id=?').run(JSON.stringify(altered), r.plan.id);
    expect((await confirm(r.body).expect(409)).body.code).toBe('CONTENT_CHANGED'); expect(await orders()).toHaveLength(0);
  });
});
