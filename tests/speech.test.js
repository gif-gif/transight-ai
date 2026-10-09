import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { createSpeechController, selectLocalVoice, speechChunks, installSpeech } from '../src/shared/speech.js';

const voice = (lang, extra = {}) => ({ voiceName: `Local ${lang}`, lang, remote: false, eventTypes: ['start', 'end', 'error'], ...extra });
function setup(voices = [voice('en-US'), voice('zh-CN'), voice('ja-JP')]) {
  const calls = [], timers = new Map(), events = []; let n = 0, stops = 0;
  const runtime = {};
  const tts = {
    getVoices: callback => callback(voices),
    speak(text, options, callback) { calls.push({ text, options, callback }); },
    stop() { stops++; }
  };
  const controller = createSpeechController(tts, runtime, { setTimeout(fn) { timers.set(++n, fn); return n; }, clearTimeout(id) { timers.delete(id); } });
  return { controller, calls, timers, tts, runtime, events, get stops() { return stops; },
    start(owner = 'a', id = 'one', text = 'Hello.', language = 'en') { controller.start(owner, { id, text, language }, event => events.push({ owner, ...event })); } };
}
test('voice selection requires known local voices, a matching language and completion support', () => {
  assert.equal(selectLocalVoice([voice('en-US'), voice('en-GB')], 'en-GB').lang, 'en-GB');
  assert.equal(selectLocalVoice([voice('en-US')], 'en').lang, 'en-US');
  assert.equal(selectLocalVoice([voice('zh-CN'), voice('zh-TW')], 'zh-TW').lang, 'zh-TW');
  assert.equal(selectLocalVoice([voice('ja-JP')], 'ja').lang, 'ja-JP');
  assert.equal(selectLocalVoice([voice('en-US')], 'ko'), undefined);
  for (const extra of [{ remote: true }, { remote: undefined }, { eventTypes: ['start'] }, { voiceName: '' }]) {
    assert.equal(selectLocalVoice([voice('en-US', extra)], 'en'), undefined);
  }
});
test('every translation language uses the same local Chinese voice without changing the text', () => {
  const s = setup([voice('en-US'), voice('zh-TW'), voice('zh-CN'), voice('ja-JP')]);
  for (const language of ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt']) {
    const text = `Result ${language}: Hello, 世界。`;
    s.start('a', language, text, language);
    assert.equal(s.calls.at(-1).options.voiceName, 'Local zh-CN');
    assert.equal(s.calls.at(-1).options.lang, 'zh-CN');
    assert.equal(s.calls.at(-1).text, text);
  }
  s.controller.stop('a');
});
test('another local Chinese locale is used when zh-CN is unavailable', () => {
  const s = setup([voice('en-US'), voice('zh-TW')]); s.start();
  assert.equal(s.calls[0].options.lang, 'zh-TW'); s.controller.stop('a');
});
test('chunks preserve non-whitespace content, sentence boundaries and Unicode', () => {
  const text = 'Hello world.\n日本語です。한국어입니다！' + '🙂'.repeat(500) + '\n' + 'word '.repeat(160);
  const chunks = speechChunks(text);
  assert.equal(chunks[0], 'Hello world.');
  assert.ok(chunks.every(chunk => Array.from(chunk).length <= 240 && chunk.trim()));
  assert.equal(chunks.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
  assert.ok(!chunks.some(chunk => /[\uD800-\uDBFF]$|^[\uDC00-\uDFFF]/.test(chunk)));
  assert.deepEqual(speechChunks(' \n\t '), []);
});
test('plays chunks sequentially and handles duplicate/late callbacks only once', () => {
  const s = setup(); s.start('a', 'one', 'First. Second.');
  assert.equal(s.calls.length, 1); s.calls[0].options.onEvent({ type: 'start' });
  s.calls[0].options.onEvent({ type: 'end' }); assert.equal(s.calls.length, 2);
  s.calls[0].options.onEvent({ type: 'end' }); assert.equal(s.calls.length, 2);
  s.calls[0].callback();
  s.calls[1].options.onEvent({ type: 'end' });
  assert.equal(s.events.at(-1).state, 'ended'); assert.equal(s.timers.size, 0); assert.equal(s.stops, 0);
});
test('new model/window replaces playback; old owner and stale IDs cannot stop it', () => {
  const s = setup(); s.start(); s.start('b', 'two');
  assert.equal(s.stops, 1); assert.equal(s.events[1].state, 'stopped');
  s.controller.stop('a'); s.controller.stop('b', 'one'); assert.equal(s.stops, 1);
  s.calls[0].options.onEvent({ type: 'end' }); assert.equal(s.calls.length, 2);
  s.controller.stop('b', 'two'); assert.equal(s.stops, 2); assert.equal(s.timers.size, 0);
  s.calls[1].options.onEvent({ type: 'end' }); assert.equal(s.events.at(-1).state, 'stopped');
});
test('stop during voice discovery and newest-request wins prevent late audio', () => {
  const s = setup(), callbacks = []; s.tts.getVoices = callback => callbacks.push(callback);
  s.start(); s.controller.stop('a'); callbacks.shift()([voice('zh-CN')]); assert.equal(s.calls.length, 0);
  s.start('a', 'two'); s.start('b', 'three');
  callbacks.shift()([voice('zh-CN')]); assert.equal(s.calls.length, 0);
  callbacks.shift()([voice('zh-CN')]); assert.equal(s.calls.length, 1);
  s.controller.stop('b');
});
test('missing voices never trigger remote or wrong-language fallback', () => {
  const s = setup([voice('zh-CN', { remote: true }), voice('en-US'), voice('ja-JP')]); s.start();
  assert.equal(s.calls.length, 0); assert.equal(s.events.at(-1).error, 'speechNoLocalVoice'); assert.equal(s.timers.size, 0);
});
test('voice and speaking timeouts clean up playback and permit retry', () => {
  const s = setup(); s.tts.getVoices = () => {}; s.start();
  [...s.timers.values()][0](); assert.equal(s.events.at(-1).error, 'speechFailed');
  s.tts.getVoices = callback => callback([voice('zh-CN')]); s.start();
  [...s.timers.values()][0](); assert.equal(s.stops, 1); assert.equal(s.timers.size, 0);
  s.start(); assert.equal(s.calls.length, 2); s.controller.stop('a');
});
for (const failure of ['throw', 'callback', 'event', 'interrupted', 'cancelled']) test(`speech ${failure} cleans up without playing later chunks`, () => {
  const s = setup(); if (failure === 'throw') s.tts.speak = () => { throw Error('engine failed'); };
  s.start('a', 'one', 'First. Second.');
  if (failure === 'callback') { s.runtime.lastError = { message: 'private engine details' }; s.calls[0].callback(); }
  else if (failure !== 'throw') s.calls[0].options.onEvent({ type: failure === 'event' ? 'error' : failure });
  assert.equal(s.events.at(-1).state, ['interrupted', 'cancelled'].includes(failure) ? 'stopped' : 'error');
  assert.equal(s.timers.size, 0); assert.ok(s.calls.length <= 1);
  assert.ok(!JSON.stringify(s.events).includes('private engine'));
});
test('invalid requests cannot interrupt current playback', () => {
  const s = setup(); s.start();
  for (const override of [{ text: '' }, { text: 'a'.repeat(100001) }, { language: 'bad' }, { id: null }]) {
    s.controller.start('b', { id: 'invalid', text: 'Hello', language: 'en', ...override }, () => {});
  }
  assert.equal(s.stops, 0); assert.equal(s.calls.length, 1); s.controller.stop('a');
});
const event = () => ({ listeners: [], addListener(fn) { this.listeners.push(fn); }, fire(...args) { this.listeners.forEach(fn => fn(...args)); } });
function port(sender) { return { name: 'transight-speech', sender, messages: [], onMessage: event(), onDisconnect: event(),
  postMessage(message) { this.messages.push(message); }, disconnect() { this.disconnected = true; this.onDisconnect.fire(); } }; }
test('port access is limited to our popup/content; disconnect stops only its own session', () => {
  const calls = []; let stops = 0;
  const runtime = { id: 'ours', getURL: p => `chrome-extension://ours/${p}`, onConnect: event() };
  installSpeech({ runtime, tts: { getVoices: cb => cb([voice('zh-CN')]), speak: (text, options) => calls.push(options), stop: () => stops++ } });
  for (const sender of [{ id: 'external', url: 'https://example.test', tab: { id: 1 }, frameId: 0 },
    { id: 'ours', url: 'https://example.test' }, { id: 'ours', url: runtime.getURL('src/options/options.html') }]) {
    const p = port(sender); runtime.onConnect.fire(p); assert.equal(p.disconnected, true);
  }
  const a = port({ id: 'ours', url: runtime.getURL('src/popup/popup.html?fallback=1') });
  const b = port({ id: 'ours', url: 'https://example.test', tab: { id: 1 }, frameId: 2 });
  runtime.onConnect.fire(a); runtime.onConnect.fire(b);
  a.onMessage.fire({ type: 'PLAY', id: '1', text: 'Hello', language: 'en' });
  b.onMessage.fire({ type: 'PLAY', id: '2', text: 'Hello', language: 'en' });
  assert.equal(stops, 1); a.disconnect(); assert.equal(stops, 1);
  b.onMessage.fire({ type: 'PING' }); assert.equal(b.messages.at(-1).type, 'PONG');
  b.disconnect(); assert.equal(stops, 2);
});
test('client filters stale events, stops by ID, reconnects after worker loss and disposes', async () => {
  const ports = [], states = [], intervals = new Map(); let seq = 0;
  const sandbox = { chrome: { runtime: { connect() { const p = port(); ports.push(p); return p; } } },
    crypto: { randomUUID: () => String(++seq) }, queueMicrotask,
    setInterval(fn) { intervals.set(seq, fn); return seq; }, clearInterval(id) { intervals.delete(id); } };
  vm.createContext(sandbox);
  vm.runInContext(await readFile(new URL('../src/shared/request-id.js', import.meta.url), 'utf8'), sandbox);
  vm.runInContext(await readFile(new URL('../src/shared/speech-client.js', import.meta.url), 'utf8'), sandbox);
  const client = new sandbox.TransightSpeechClient(message => states.push(message));
  const a = client.play('one', 'en'); const b = client.play('two', 'ja');
  assert.equal(ports.length, 1); assert.equal(ports[0].messages[1].type, 'STOP'); assert.equal(ports[0].messages[1].id, a);
  ports[0].onMessage.fire({ id: a, state: 'error' }); assert.equal(states.length, 0);
  ports[0].onMessage.fire({ id: b, state: 'playing' }); assert.equal(states.length, 1);
  [...intervals.values()][0](); assert.equal(ports[0].messages.at(-1).type, 'PING');
  ports[0].disconnect(); assert.equal(states.at(-1).error, 'speechFailed'); assert.equal(intervals.size, 0);
  const c = client.play('three', 'ko'); assert.equal(ports.length, 2);
  ports[1].onMessage.fire({ id: c, state: 'ended' }); assert.equal(intervals.size, 0);
  client.play('four', 'en'); client.dispose(); assert.equal(ports[1].disconnected, true); assert.equal(intervals.size, 0);
});
