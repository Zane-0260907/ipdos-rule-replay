import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const base = process.env.BACKEND_URL || 'http://127.0.0.1:3018';
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)) {
  throw new Error(
    'Backend smoke checks are restricted to a local development server.',
  );
}
async function json(path, body) {
  const response = await fetch(
    base + path,
    body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  assert.equal(response.status, body ? 201 : 200);
  const envelope = await response.json();
  assert.equal(envelope.error, null);
  return envelope.data;
}
const health = await json('/health');
assert.equal(health.status, 'ok');
const sales = await json('/predictions/sales', {});
assert.equal(sales.metrics.dataOrigin, 'synthetic');
assert.match(sales.metrics.evaluation, /not measured accuracy/);
assert.ok(sales.items.length > 0);
const traffic = await json('/predictions/traffic', {});
assert.ok(traffic.points.length > 0);
const decisions = await json('/decisions/overview');
assert.ok(Array.isArray(decisions.rules));
const result = {
  passed: true,
  sourceMode: process.env.BACKEND_MODE || 'fixture',
  checks: [
    'health response envelope',
    'stored sales snapshot with synthetic metric label',
    'stored traffic snapshot',
    'decision overview with registry rule hits',
  ],
  salesItems: sales.items.length,
  trafficPoints: traffic.points.length,
};
writeFileSync(
  process.env.BACKEND_EVIDENCE || 'artifacts/backend-fixture-evidence.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(JSON.stringify(result, null, 2));
