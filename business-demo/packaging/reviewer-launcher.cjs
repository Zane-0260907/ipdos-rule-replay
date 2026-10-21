'use strict';
// Packaging entrypoint only: unchanged R2 compiled Nest bootstrap and static UI.
const { createServer } = require('node:http');
const { readFileSync, existsSync, statSync, mkdirSync } = require('node:fs');
const { resolve, join, extname, sep } = require('node:path');
const root = __dirname;
const staticRoot = join(root, 'frontend');
const database = join(root, 'data', 'simulation.sqlite');
let app, server, stopping = false;

async function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  if (server?.listening) await new Promise(done => server.close(done));
  if (app) await app.close().catch(error => console.error(error.message));
  process.exit(code);
}

async function main() {
  if (process.versions.node.split('.')[0] !== '24') {
    throw new Error('Node.js 24 required. This package was verified with Node.js 24.19.0 on Windows x64. No install or build is performed.');
  }
  require('node:sqlite');
  mkdirSync(join(root, 'data'), { recursive: true });
  // Always the package's own synthetic database, regardless of inherited env.
  process.env.BUSINESS_DATA_FILE = database;
  process.env.BUSINESS_PORT = '3037';
  const { createBusinessApp } = require('./backend/dist/business/bootstrap.js');
  app = await createBusinessApp();
  await app.listen(3037, '127.0.0.1');
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
  server = createServer((request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405); response.end(); return; }
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1:3038').pathname); }
    catch { response.writeHead(400); response.end(); return; }
    let file = resolve(staticRoot, '.' + pathname);
    if (file !== staticRoot && !file.startsWith(staticRoot + sep)) { response.writeHead(403); response.end(); return; }
    if (file === staticRoot || (existsSync(file) && statSync(file).isDirectory())) file = join(file, 'index.html');
    if (!existsSync(file) && !extname(pathname)) file = join(staticRoot, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) { response.writeHead(404); response.end('Not found'); return; }
    const bytes = readFileSync(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : bytes);
  });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(3038, '127.0.0.1', done); });
  console.log('IPDOS PREBUILT REVIEW PACKAGE R1 - SYNTHETIC DATA / SIMULATED PROCUREMENT ONLY');
  console.log('Open http://127.0.0.1:3038/  |  API: http://127.0.0.1:3037/');
  console.log('No npm install, compiler, external database, model or supplier is used.');
  console.log('Press Ctrl+C to stop. Changes persist only in this package/data/simulation.sqlite.');
  console.log(JSON.stringify({ ready: true, node: process.version, platform: process.platform, architecture: process.arch, synthetic: true, package: 'ipdos-business-prebuilt-r1' }));
}
process.on('SIGINT', () => { void stop(); });
process.on('SIGTERM', () => { void stop(); });
// Available only to a local parent process which explicitly opens Node IPC.
process.on('message', message => { if (message?.command === 'shutdown') void stop(); });
main().catch(error => { console.error('Startup failed:', error.code || '', error.message); void stop(1); });
