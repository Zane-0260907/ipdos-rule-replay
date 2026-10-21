import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { createRequire } from 'node:module';
import { openBrowser, delay } from './browser-client.mjs';
const require = createRequire(new URL('../backend/package.json', import.meta.url));
const JSZip = require('jszip');
const { xml2js } = require('xml-js');
const mode = process.argv[2] || 'flow';
const browser = await openBrowser();
const { send, evaluate, until, click, screenshot } = browser;
const shots = [];
const hasButton = text => `[...document.querySelectorAll('button')].some(x=>x.textContent.trim()===${JSON.stringify(text)})`;
const disabled = text => `[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)})?.disabled`;
const orderList = () => evaluate(`fetch('http://127.0.0.1:3037/orders',{headers:{Authorization:'Bearer '+sessionStorage.getItem('businessToken')}}).then(r=>r.json()).then(x=>x.data.orders)`);
const top = () => evaluate("document.querySelector('main').scrollTop=0");
async function quantity(value) {
  await evaluate(`(()=>{const e=document.querySelector('[data-testid="quantity-SYN-RICE"]');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(String(value))});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await until(disabled('确认模拟采购'));
  assert.equal(await evaluate(disabled('我已核对当前方案')), true);
  await click('保存修改后的方案');
  await until("document.querySelector('[data-testid=flow-status]')?.textContent.includes('尚未创建订单')");
}
try {
  const downloads = mkdtempSync(resolve('artifacts/browser-downloads-' + mode + '-'));
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads, eventsEnabled: true });
  if (mode === 'viewer') await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
  await send('Page.navigate', { url: 'http://127.0.0.1:3038/' });
  await until(hasButton(mode === 'viewer' ? '进入模拟观察员（只读）' : '进入模拟店长（可审阅与确认）'));
  await click(mode === 'viewer' ? '进入模拟观察员（只读）' : '进入模拟店长（可审阅与确认）');
  await until("document.querySelector('[data-testid=inventory-table] tbody tr')");
  assert.equal(await evaluate("document.querySelector('[data-testid=synthetic-notice]').textContent.includes('合成数据')"), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  for (const name of ['智能预测', '库存管理', '订单记录', '智能排班']) assert.equal(await evaluate(hasButton(name)), true);
  if (mode === 'existing') {
    const expected = JSON.parse(readFileSync('artifacts/ui-evidence.json', 'utf8'));
    await click('订单记录'); await until("document.querySelector('[data-testid=order-id]')");
    assert.equal(await evaluate("document.querySelector('[data-testid=order-id]').textContent"), expected.orderId);
    assert.equal(await evaluate("document.querySelector('[data-testid=receipt]').textContent.includes('36.5 kg')"), true);
    shots.push(await screenshot('ui-05-after-backend-restart'));
    writeFileSync('artifacts/ui-restart-evidence.json', JSON.stringify({ passed: true, orderId: expected.orderId, screenshot: shots[0], description: 'Fresh browser role selection and persisted order read after real backend process restart.', exceptions: browser.exceptions }, null, 2));
  } else if (mode === 'viewer') {
    await click('计算补货方案'); await until("document.querySelector('[data-testid=review-panel]')");
    await click('库存管理'); await top();
    assert.equal(await evaluate(disabled('我已核对当前方案')), true);
    assert.equal(await evaluate(disabled('确认模拟采购')), true);
    assert.equal(await evaluate(disabled('模拟大米库存变动 5 kg')), true);
    shots.push(await screenshot('ui-06-viewer-permissions'));
    writeFileSync('artifacts/ui-viewer-evidence.json', JSON.stringify({ passed: true, disabledActions: ['review', 'confirm', 'change synthetic inventory'], screenshot: shots[0], exceptions: browser.exceptions }, null, 2));
  } else {
    assert.equal((await orderList()).length, 0, 'Use a new isolated synthetic UI database for the main acceptance run.');
    await top(); await delay(1600); shots.push(await screenshot('ui-01-demand-snapshot'));
    await click('计算补货方案'); await until("document.querySelector('[data-testid=review-panel]')");
    assert.equal((await orderList()).length, 0);
    await click('库存管理'); await quantity(31.5);
    await click('我已核对当前方案'); await until('!' + disabled('确认模拟采购'));
    await top(); shots.push(await screenshot('ui-02-inventory-reviewed-plan'));
    await click('模拟审阅期间库存变动'); await until("document.querySelector('[data-testid=flow-status]')?.textContent.includes('库存已变动')");
    await click('确认模拟采购'); await until("document.querySelector('[data-testid=flow-error]')?.textContent.includes('旧方案未生成订单')");
    assert.equal((await orderList()).length, 0);
    assert.equal(await evaluate(disabled('确认模拟采购')), true);
    await top(); shots.push(await screenshot('ui-03-stale-inventory-rejected'));
    await click('按当前库存重新计算方案'); await until("document.querySelector('[data-testid=flow-status]')?.textContent.includes('尚未创建订单')");
    assert.equal(await evaluate("document.querySelector('[data-testid=quantity-SYN-RICE]').value"), '35');
    await quantity(36.5); await click('我已核对当前方案'); await until('!' + disabled('确认模拟采购'));
    await click('确认模拟采购'); await until("document.querySelector('[data-testid=receipt]')");
    const orderId = await evaluate("document.querySelector('[data-testid=order-id]').textContent");
    const orders = await orderList(); assert.equal(orders.length, 1); assert.equal(orders[0].id, orderId);
    assert.equal(orders[0].plan.source.revision, 2); assert.equal(orders[0].plan.items[0].quantity, 36.5);
    await click('重试同一确认请求'); await until("document.querySelector('[data-testid=flow-status]')?.textContent.includes('没有新增订单')");
    assert.equal((await orderList()).length, 1); assert.equal(await evaluate("document.querySelector('[data-testid=order-id]').textContent"), orderId);
    await click('订单记录'); await until("document.querySelector('[data-testid=order-id]')");
    assert.equal(await evaluate("document.querySelector('[data-testid=order-id]').textContent"), orderId);
    const uiReceiptText = await evaluate("document.querySelector('[data-testid=receipt]').textContent");
    for (const item of orders[0].plan.items) assert.ok(uiReceiptText.includes(item.ingredient + ' ' + item.quantity + ' kg'));
    await top(); shots.push(await screenshot('ui-04-persisted-order-receipt'));
    await click('导出同记录报告'); await click('下载回执 JSON');
    let files;
    for (let attempt = 0; attempt < 100; attempt++) { files = readdirSync(downloads); if (files.some(x => x.endsWith('.docx')) && files.some(x => x.endsWith('.json')) && !files.some(x => x.endsWith('.crdownload'))) break; await delay(100); }
    const docxPath = resolve(downloads, files.find(x => x.endsWith('.docx')) || 'missing.docx');
    const jsonPath = resolve(downloads, files.find(x => x.endsWith('.json')) || 'missing.json');
    const saved = JSON.parse(readFileSync(jsonPath, 'utf8')); assert.deepEqual(saved, orders[0]);
    const zip = await JSZip.loadAsync(readFileSync(docxPath), { checkCRC32: true });
    assert.ok(zip.file('[Content_Types].xml')); const xml = await zip.file('word/document.xml').async('string');
    for (const value of [saved.id, saved.receiptId, saved.plan.contentHash, saved.plan.inputVersion, saved.plan.ruleHash, saved.review.id]) assert.ok(xml.includes(value));
    const find = (node, name) => [...(node.name === name ? [node] : []), ...(node.elements || []).flatMap(x => find(x, name))];
    const text = node => (node.text || '') + (node.elements || []).map(text).join('');
    const rows = find(xml2js(xml), 'w:tr').map(row => find(row, 'w:tc').map(text));
    for (const item of saved.plan.items) assert.deepEqual(rows.find(row => row[0].endsWith(' / ' + item.sku)).slice(1).map(Number), [item.demand, item.currentStock, item.recommendedAmount, item.quantity]);
    assert.ok(browser.responses.some(x => x.path === '/orders/confirm' && x.status === 409));
    assert.deepEqual(browser.exceptions, []);
    const result = { passed: true, browser: (await send('Browser.getVersion')).product, viewport: { width: 1600, height: 1150 }, synthetic: true, orderId, receiptId: saved.receiptId, inputRevision: 2, finalRiceQuantity: 36.5,
      checks: ['original business navigation, header and chart rendered', 'snapshot and live synthetic inventory read', 'preview creates zero orders', 'manual modification disables confirmation until saved and reviewed', 'stale inventory rejected by real server; zero orders', 'recalculation and fresh human review accepted', 'identical retry returns one persisted order', 'order page reads same persisted receipt', 'browser DOCX/JSON downloads equal the saved record'],
      screenshots: shots.map(x => 'artifacts/' + basename(x)), docxDownload: docxPath, jsonDownload: jsonPath, backendResponses: browser.responses, blockedExternalOrigins: browser.blockedExternal, exceptions: browser.exceptions };
    writeFileSync('artifacts/ui-evidence.json', JSON.stringify(result, null, 2));
  }
  assert.deepEqual(browser.exceptions, []);
  console.log(JSON.stringify({ passed: true, mode, screenshots: shots, exceptions: browser.exceptions, blockedExternalOrigins: browser.blockedExternal }, null, 2));
} catch (error) {
  await screenshot('ui-failure-' + mode).catch(() => {});
  writeFileSync('artifacts/ui-failure-' + mode + '.json', JSON.stringify({ passed: false, message: error.message, exceptions: browser.exceptions, backendResponses: browser.responses }, null, 2));
  throw error;
} finally { await browser.close(); }
