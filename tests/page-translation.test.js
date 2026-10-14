import { mockChromeI18n } from '../test-support/chrome-i18n.js';
mockChromeI18n();
import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePageBlocks, parsePageTranslation, translatePageBatch } from '../src/shared/page-translation.js';
import { DEFAULT_SETTINGS } from '../src/shared/settings.js';
const blocks = [{ id: 'b1', segments: [{ id: 's1', text: 'Read ' }, { id: 's2', text: 'the guide' }, { id: 's3', text: ' first.' }] }];
const config = { ...DEFAULT_SETTINGS, model: 'first', models: ['first'], consent: true, apiKey: 'test-secret' };
test('page protocol accepts bounded semantic blocks and rejects duplicate or unsafe IDs', () => {
  assert.equal(validatePageBlocks(blocks), 21);
  for (const bad of [[], null, [{ ...blocks[0], id: '__proto__' }], [...blocks, blocks[0]], [{ id: 'b1', segments: [{ id: 's1', text: '' }] }], [{ id: 'b1', segments: [{ id: 's1', text: 'x'.repeat(6001) }] }]]) assert.throws(() => validatePageBlocks(bad), /pageInvalidBatch/);
});
test('page protocol fails closed for missing/duplicate/extra IDs and malformed output', () => {
  const segments = blocks[0].segments;
  assert.deepEqual(parsePageTranslation(JSON.stringify({ segments }), blocks), { s1: 'Read ', s2: 'the guide', s3: ' first.' });
  for (const response of ['not json', '```json\n{}\n```', '{}', JSON.stringify({ segments: segments.slice(1) }), JSON.stringify({ segments: [segments[0], segments[0], segments[2]] }), JSON.stringify({ segments: [...segments, { id: 's99', text: 'extra' }] }), JSON.stringify({ segments: segments.map(item => ({ ...item, text: '' })) })]) assert.throws(() => parsePageTranslation(response, blocks), /pageInvalidResponse/);
});
test('page requests use their own structured prompt, first model, no URL or custom prompt', async () => {
  const result = await translatePageBatch(blocks, { ...config, systemPrompt: 'CUSTOM PROMPT MUST NOT APPEAR' }, 'ja', { fetchImpl: async (url, init) => {
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'first'); assert.match(body.messages[0].content, /日本語/);
    assert.doesNotMatch(body.messages[0].content, /CUSTOM PROMPT/);
    assert.deepEqual(JSON.parse(body.messages[1].content), { blocks });
    assert.equal(init.credentials, 'omit'); assert.equal(init.redirect, 'error');
    return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ segments: blocks[0].segments }) } }] }));
  } });
  assert.equal(result.s2, 'the guide');
});
test('page API cancellation is propagated and target language is validated', async () => {
  await assert.rejects(translatePageBatch(blocks, config, '__proto__'), /invalidTarget/);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(translatePageBatch(blocks, config, 'en', { signal: controller.signal, fetchImpl: async (_, init) => { assert.equal(init.signal.aborted, true); throw new DOMException('aborted', 'AbortError'); } }));
});
