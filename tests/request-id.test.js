import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';

const read = file => readFile(new URL(`../${file}`, import.meta.url), 'utf8');
const source = await read('src/shared/request-id.js');
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
function load(crypto) {
  const context = vm.createContext({ crypto });
  vm.runInContext(source, context);
  return context;
}

test('request IDs use native randomUUID with the correct receiver when available', () => {
  const crypto = { randomUUID() { assert.equal(this, crypto); return 'native-id'; },
    getRandomValues() { assert.fail('native path should not use fallback'); } };
  assert.equal(load(crypto).TransightRequestId(), 'native-id');
});
for (const randomUUID of [undefined, null, 'unavailable']) {
  test(`HTTP-compatible request IDs work when randomUUID is ${String(randomUUID)}`, () => {
    let calls = 0;
    const crypto = { randomUUID, getRandomValues(array) {
      assert.equal(this, crypto); calls++; return webcrypto.getRandomValues(array);
    } };
    const context = load(crypto), ids = new Set();
    for (let n = 0; n < 1000; n++) {
      const id = context.TransightRequestId(); assert.match(id, uuidV4); ids.add(id);
    }
    assert.equal(ids.size, 1000); assert.equal(calls, 1000);
    const original = context.TransightRequestId;
    vm.runInContext(source, context);
    assert.equal(context.TransightRequestId, original, 'right-click reinjection is idempotent');
  });
}

test('fallback sets UUID version/variant bits and pads bytes correctly', () => {
  assert.equal(load({ getRandomValues: bytes => bytes.fill(0) }).TransightRequestId(),
    '00000000-0000-4000-8000-000000000000');
  assert.equal(load({ getRandomValues: bytes => bytes.fill(255) }).TransightRequestId(),
    'ffffffff-ffff-4fff-bfff-ffffffffffff');
});

test('every UI entry loads the helper before its consumers', async () => {
  const manifest = JSON.parse(await read('manifest.json'));
  assert.equal(manifest.content_scripts[0].js[0], 'src/shared/request-id.js');
  for (const file of ['src/popup/popup.html', 'src/screenshot/screenshot.html']) {
    const html = await read(file);
    assert.ok(html.indexOf('../shared/request-id.js') >= 0);
    assert.ok(html.indexOf('../shared/request-id.js') < html.indexOf('../shared/speech-client.js'));
  }
  for (const file of ['src/content/selection.js', 'src/shared/speech-client.js', 'src/popup/popup.js', 'src/screenshot/screenshot.js']) {
    const code = await read(file);
    assert.ok(code.includes('TransightRequestId()'), file);
    assert.ok(!code.includes('crypto.randomUUID()'), file);
  }
});

test('speech can play and stop on HTTP without randomUUID', async () => {
  const sent = [], listeners = [], intervals = new Map();
  const port = { postMessage(message) { sent.push(message); },
    onMessage: { addListener(fn) { listeners.push(fn); } },
    onDisconnect: { addListener() {} }, disconnect() {} };
  const context = load({ getRandomValues: bytes => webcrypto.getRandomValues(bytes) });
  Object.assign(context, {
    chrome: { runtime: { connect: () => port } }, queueMicrotask,
    setInterval(fn) { intervals.set(1, fn); return 1; }, clearInterval(id) { intervals.delete(id); }
  });
  vm.runInContext(await read('src/shared/speech-client.js'), context);
  const states = [], client = new context.TransightSpeechClient(state => states.push(state));
  const id = client.play('Hello world.', 'en');
  assert.match(id, uuidV4);
  assert.equal(sent[0].type, 'PLAY'); assert.equal(sent[0].id, id);
  assert.equal(sent[0].text, 'Hello world.');
  listeners[0]({ id, state: 'playing' }); assert.equal(states[0].state, 'playing');
  client.stop(); assert.equal(sent[1].type, 'STOP'); assert.equal(sent[1].id, id);
  assert.equal(intervals.size, 0); client.dispose();
});
