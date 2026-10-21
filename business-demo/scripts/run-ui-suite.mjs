import { spawn } from 'node:child_process';
import { mkdtempSync, createWriteStream, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { delay } from './browser-client.mjs';

mkdirSync(resolve('artifacts'), { recursive: true });
const run = mkdtempSync(resolve('artifacts/ui-suite-'));
const database = resolve(run, 'simulation.sqlite');
const children = new Set();
function service(name, script, args, cwd, env = {}) {
  const log = createWriteStream(resolve(run, name + '.log'));
  const child = spawn(process.execPath, [script, ...args], { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(log); child.stderr.pipe(log, { end: false }); children.add(child);
  child.once('exit', () => { log.end(); children.delete(child); }); return child;
}
async function healthy(url) {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(url); if (r.ok) return; }
    catch (error) { if (error.cause?.code === 'EACCES') throw error; }
    await delay(200);
  }
  throw new Error('Service did not become ready: ' + url);
}
function check(mode) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, ['scripts/ui-acceptance.mjs', mode], { cwd: process.cwd(), windowsHide: true, stdio: 'inherit' }); children.add(child);
    child.once('error', reject); child.once('exit', code => { children.delete(child); code === 0 ? resolvePromise() : reject(new Error('Browser acceptance failed: ' + mode + ', exit=' + code)); });
  });
}
async function stop(child) { if (child.exitCode !== null) return; const exited = new Promise(resolvePromise => child.once('exit', resolvePromise)); child.kill(); await exited; }
let backend;
try {
  backend = service('backend', resolve('backend/dist/business/main.js'), [], resolve('backend'), { BUSINESS_PORT: '3037', BUSINESS_DATA_FILE: database });
  service('frontend', resolve('frontend/node_modules/vite/bin/vite.js'), ['--host', '127.0.0.1', '--port', '3038', '--strictPort'], resolve('frontend'));
  await healthy('http://127.0.0.1:3037/health'); await healthy('http://127.0.0.1:3038/');
  await check('flow');
  await stop(backend);
  backend = service('backend-restarted', resolve('backend/dist/business/main.js'), [], resolve('backend'), { BUSINESS_PORT: '3037', BUSINESS_DATA_FILE: database });
  await healthy('http://127.0.0.1:3037/health');
  await check('existing'); await check('viewer');
  writeFileSync('artifacts/ui-suite-result.json', JSON.stringify({ passed: true, database: relative(process.cwd(), database), modes: ['flow', 'existing', 'viewer'], backendProcessRestarted: true, scope: 'Only task-owned synthetic local processes and new browser profiles.' }, null, 2));
} finally {
  for (const child of [...children]) await stop(child);
}
