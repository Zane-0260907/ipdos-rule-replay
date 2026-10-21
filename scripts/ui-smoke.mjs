// Real Chromium check through CDP; uses a new isolated browser profile and the
// already-installed browser. It never opens a user's existing profile.
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  mkdtempSync,
} from 'node:fs';
import { resolve, join } from 'node:path';
import assert from 'node:assert/strict';

const executable =
  process.env.CHROME_PATH ||
  [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ].find(existsSync);
if (!executable)
  throw new Error(
    'Set CHROME_PATH to an installed Chromium browser. No browser is auto-installed.',
  );
mkdirSync('artifacts/local', { recursive: true });
const profile = mkdtempSync(resolve('artifacts/local/chromium-'));
const child = spawn(
  executable,
  [
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-networking',
    '--remote-debugging-address=127.0.0.1',
    '--remote-debugging-port=0',
    `--user-data-dir=${profile}`,
    'about:blank',
  ],
  { windowsHide: true, stdio: 'ignore' },
);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
let socket;
let sequence = 0;
const pending = new Map();
const errors = [];
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`CDP timeout: ${method}`));
    }, 15000);
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      reject,
    });
    socket.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (result.exceptionDetails)
    throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
};
const until = async (expression) => {
  for (let attempt = 0; attempt < 80; attempt++) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error(`UI condition timed out: ${expression}`);
};
try {
  const portFile = join(profile, 'DevToolsActivePort');
  for (let attempt = 0; attempt < 100 && !existsSync(portFile); attempt++)
    await delay(100);
  const port = readFileSync(portFile, 'utf8').split(/\r?\n/)[0];
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  socket = new WebSocket(
    targets.find((t) => t.type === 'page').webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.method === 'Runtime.exceptionThrown')
      errors.push(data.params.exceptionDetails.text);
    const request = pending.get(data.id);
    if (request) {
      pending.delete(data.id);
      data.error
        ? request.reject(new Error(JSON.stringify(data.error)))
        : request.resolve(data.result);
    }
  };
  await send('Runtime.enable');
  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 1120,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send('Page.navigate', {
    url: process.env.REPLAY_URL || 'http://127.0.0.1:3017/demo',
  });
  await until(
    "document.querySelector('#candidate-pass')?.textContent==='9 / 10'",
  );
  assert.equal(
    await evaluate("document.querySelectorAll('[data-scenario]').length"),
    10,
  );
  assert.match(
    await evaluate("document.querySelector('#assertion').textContent"),
    /Regression caught/,
  );
  await evaluate("document.querySelector('#rerun').click()");
  await until(
    "document.querySelector('#repeat')?.textContent==='Identical digests on replay.'",
  );
  const exportUrl = await evaluate("document.querySelector('#export').href");
  const bundle = await (await fetch(exportUrl)).json();
  assert.equal(bundle.assertion.passed, false);
  writeFileSync(
    'artifacts/local/browser-export.json',
    JSON.stringify(bundle, null, 2),
  );
  await evaluate(
    'document.querySelector(\'[data-scenario="menu-conflict"]\').click()',
  );
  assert.match(
    await evaluate("document.querySelector('#detail h2').textContent"),
    /Conflicting menu/,
  );
  await evaluate(
    'document.querySelector(\'[data-scenario="traffic-three"]\').click()',
  );
  const desktop = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  writeFileSync(
    'artifacts/replay-desktop.png',
    Buffer.from(desktop.data, 'base64'),
  );
  await evaluate(
    "document.querySelector('#candidate').value='registry-v1';document.querySelector('#candidate').dispatchEvent(new Event('change'))",
  );
  await until(
    "document.querySelector('#candidate-pass').textContent==='10 / 10'",
  );
  assert.equal(
    await evaluate("document.querySelector('#changed').textContent"),
    '0',
  );
  await evaluate(
    "document.querySelector('#candidate').value='sparse-v2-seeded-regression';document.querySelector('#candidate').dispatchEvent(new Event('change'))",
  );
  await until(
    "document.querySelector('#candidate-pass').textContent==='9 / 10'",
  );
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate('document.documentElement.scrollWidth > innerWidth'),
    false,
  );
  const mobile = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
  });
  writeFileSync(
    'artifacts/replay-mobile.png',
    Buffer.from(mobile.data, 'base64'),
  );
  assert.deepEqual(errors, []);
  const result = {
    browser: (await send('Browser.getVersion')).product,
    passed: true,
    checks: [
      'catalog and ten scenarios rendered',
      'seeded regression displayed',
      'repeated replay identity',
      'JSON export fetched',
      'scenario navigation',
      'same-policy comparison clears change',
      '390px layout without horizontal overflow',
      'no runtime exceptions',
    ],
    screenshots: [
      'artifacts/replay-desktop.png',
      'artifacts/replay-mobile.png',
    ],
  };
  writeFileSync(
    'artifacts/ui-evidence.json',
    JSON.stringify(result, null, 2) + '\n',
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (socket?.readyState === WebSocket.OPEN) {
    await send('Browser.close').catch(() => {});
    socket.close();
  }
  // This is only the browser child created above; existing browser sessions are untouched.
  child.kill();
}
