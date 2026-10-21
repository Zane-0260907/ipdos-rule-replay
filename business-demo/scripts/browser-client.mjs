import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
export async function openBrowser() {
  const executable = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ].find(existsSync);
  if (!executable) throw new Error('No installed Chromium browser found. No browser is installed automatically.');
  mkdirSync('artifacts/browser-profiles', { recursive: true });
  const profile = mkdtempSync(resolve('artifacts/browser-profiles/run-'));
  const child = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-background-networking', '--disable-sync', '--remote-debugging-address=127.0.0.1', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let socket, sequence = 0;
  const pending = new Map(), exceptions = [], responses = [], blockedExternal = [];
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  async function until(expression) {
    for (let attempt = 0; attempt < 120; attempt++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); }
    throw new Error('UI condition timed out: ' + expression);
  }
  async function click(text) {
    const query = `[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(text)})`;
    const bounds = await evaluate(`(()=>{const b=${query};if(!b)throw Error('Button not found');if(b.disabled)throw Error('Button disabled');b.scrollIntoView({block:'center'});const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', clickCount: 1, ...bounds });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', clickCount: 1, ...bounds });
  }
  async function screenshot(name) {
    await delay(250);
    const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    const filename = resolve('artifacts/' + name + '.png');
    writeFileSync(filename, Buffer.from(shot.data, 'base64')); return filename;
  }
  async function close() {
    if (socket?.readyState === WebSocket.OPEN) { await send('Browser.close').catch(() => {}); socket.close(); }
    child.kill();
  }
  try {
    const portFile = join(profile, 'DevToolsActivePort');
    for (let i = 0; i < 100 && !existsSync(portFile); i++) await delay(100);
    if (!existsSync(portFile)) throw new Error('Isolated browser did not open a local CDP port.');
    const port = readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(x => x.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    socket.onmessage = event => {
      const packet = JSON.parse(event.data);
      const call = pending.get(packet.id);
      if (call) { pending.delete(packet.id); packet.error ? call.reject(new Error(JSON.stringify(packet.error))) : call.resolve(packet.result); }
      if (packet.method === 'Runtime.exceptionThrown') exceptions.push(packet.params.exceptionDetails.text);
      if (packet.method === 'Network.responseReceived') {
        const r = packet.params.response;
        if (r.url.startsWith('http://127.0.0.1:3037/')) responses.push({ path: new URL(r.url).pathname, status: r.status, mimeType: r.mimeType });
      }
      if (packet.method === 'Fetch.requestPaused') {
        const { requestId, request } = packet.params;
        const u = new URL(request.url);
        const permitted = ['data:', 'blob:', 'about:'].includes(u.protocol) || (['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol) && ['127.0.0.1', 'localhost'].includes(u.hostname));
        if (!permitted) blockedExternal.push(u.origin);
        void send(permitted ? 'Fetch.continueRequest' : 'Fetch.failRequest', permitted ? { requestId } : { requestId, errorReason: 'BlockedByClient' }).catch(error => exceptions.push(error.message));
      }
    };
    await send('Runtime.enable'); await send('Page.enable'); await send('Network.enable');
    await send('Fetch.enable', { patterns: [{ urlPattern: '*', requestStage: 'Request' }] });
    await send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1150, deviceScaleFactor: 1, mobile: false });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] });
    return { send, evaluate, until, click, screenshot, close, exceptions, responses, blockedExternal };
  } catch (error) { await close(); throw error; }
}
