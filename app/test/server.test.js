const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../server');

let server, base;
before(() => new Promise(r => { server = app.listen(0, () => { base = `http://127.0.0.1:${server.address().port}`; r(); }); }));
after(() => server.close());

test('health endpoint returns ok', async () => {
  const res = await fetch(`${base}/healthz`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { status: 'ok' });
});

test('info endpoint exposes build + pod details', async () => {
  const body = await (await fetch(`${base}/api/info`)).json();
  for (const k of ['version', 'buildNumber', 'pod', 'uptimeSeconds']) assert.ok(k in body, k);
});

test('home page is served', async () => {
  const res = await fetch(`${base}/`);
  assert.strictEqual(res.status, 200);
  assert.match(await res.text(), /Shipyard/);
});

test('all pages load', async () => {
  for (const p of ['/pipeline', '/architecture', '/status', '/contact']) {
    assert.strictEqual((await fetch(base + p)).status, 200, p);
  }
});

test('contact validates input', async () => {
  const bad = await fetch(`${base}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
  assert.strictEqual(bad.status, 400);
  const ok = await fetch(`${base}/api/contact`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'a', email: 'a@b.c', message: 'hi' }) });
  assert.strictEqual(ok.status, 200);
});

test('unknown route returns 404', async () => {
  assert.strictEqual((await fetch(`${base}/nope`)).status, 404);
});
