import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import ts from 'typescript';

async function load(relative) {
  const source = await readFile(new URL(`../src/i18n/${relative}.ts`, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
}
function shape(value) {
  if (typeof value === 'string') {
    assert.ok(value.trim().length > 0, 'Translations must not be blank');
    return 'string';
  }
  if (Array.isArray(value)) return value.map(shape);
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, shape(child)]));
}
const { en } = await load('en');
const { enPrivacy } = await load('privacy/en');
for (const [locale, name] of [['zh-cn', 'zhCN'], ['zh-tw', 'zhTW'], ['ja', 'ja'], ['ko', 'ko']]) {
  test(`${locale}: complete dictionary, guide and privacy section parity`, async () => {
    const dictionary = (await load(locale))[name];
    const policy = (await load(`privacy/${locale}`))[`${name}Privacy`];
    assert.deepEqual(shape(dictionary), shape(en));
    assert.deepEqual(shape(policy), shape(enPrivacy));
    assert.deepEqual(policy.sections.map(section => section.id), enPrivacy.sections.map(section => section.id));
    assert.equal(dictionary.facts[0].value, '5');
    if (locale === 'ja' || locale === 'ko') {
      assert.notEqual(dictionary.hero.title, en.hero.title);
      assert.notEqual(dictionary.guide.intro, en.guide.intro);
      for (const [index, section] of policy.sections.entries()) {
        assert.notEqual(section.title, enPrivacy.sections[index].title);
        for (const [i, paragraph] of section.paragraphs.entries()) assert.notEqual(paragraph, enPrivacy.sections[index].paragraphs[i]);
      }
    }
  });
}
test('all five screenshot sets have unique local assets and accurate intrinsic dimensions', async () => {
  const manifest = JSON.parse(await readFile(new URL('../src/config/screenshots.json', import.meta.url), 'utf8'));
  const { locales } = await load('locales');
  assert.deepEqual(Object.keys(manifest).sort(), [...locales].sort());
  const seen = new Set();
  for (const [locale, images] of Object.entries(manifest)) {
    assert.deepEqual(images.map(image => image.id), ['ai-page-confirm', 'ai-page-result', 'simple', 'google', 'popup-simple', 'images', 'selection', 'comparison', 'settings', 'unlock']);
    for (const image of images) {
      assert.ok(image.src.startsWith(`/screenshots/${locale}/`));
      const buffer = await readFile(new URL(`../public${image.src}`, import.meta.url));
      const { width, height, format } = await sharp(buffer).metadata();
      assert.equal(format, 'webp');
      assert.equal(image.width, width);
      assert.equal(image.height, height);
      const content = buffer.toString('base64');
      assert.ok(!seen.has(content), `Duplicate screenshot: ${image.src}`);
      seen.add(content);
    }
  }
});

test('selection-trigger walkthroughs have complete translations and valid full-size/close-up assets', async () => {
  const { selectionTrigger } = await load('selection-trigger');
  const { locales } = await load('locales');
  const manifest = JSON.parse(await readFile(new URL('../src/config/selection-trigger.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(manifest).sort(), [...locales].sort());
  assert.deepEqual(Object.keys(selectionTrigger).sort(), [...locales].sort());
  for (const locale of locales) {
    assert.deepEqual(shape(selectionTrigger[locale]), shape(selectionTrigger.en));
    assert.equal(selectionTrigger[locale].steps.length, 3);
    for (const variant of ['full', 'detail']) {
      const image = manifest[locale][variant];
      assert.equal(image.src, `/screenshots/${locale}/selection-trigger-${variant}.webp`);
      const { width, height, format } = await sharp(await readFile(new URL(`../public${image.src}`, import.meta.url))).metadata();
      assert.equal(format, 'webp');
      assert.equal(image.width, width);
      assert.equal(image.height, height);
      assert.deepEqual([width, height], variant === 'full' ? [1280, 800] : [424, 160]);
    }
  }
});

test('current feature guides and privacy disclosures cover all five languages', async () => {
  const { capabilities } = await load('capabilities');
  const { locales } = await load('locales');
  const names = { en: 'en', 'zh-cn': 'zhCN', 'zh-tw': 'zhTW', ja: 'ja', ko: 'ko' };
  const dates = { en: 'October 14, 2026', 'zh-cn': '2026 年 10 月 14 日', 'zh-tw': '2026 年 10 月 14 日', ja: '2026年10月14日', ko: '2026년 10월 14일' };
  assert.deepEqual(Object.keys(capabilities).sort(), [...locales].sort());
  for (const locale of locales) {
    const copy = capabilities[locale];
    assert.deepEqual(shape(copy), shape(capabilities.en));
    assert.deepEqual(copy.items.map(item => item.id), ['ai-page', 'modes', 'images', 'speech', 'controls', 'google', 'website']);
    const text = JSON.stringify(copy);
    for (const term of ['0.6', 'Ctrl+V / Cmd+V', 'Chat Completions', '{{from}}', '{{title_prompt}}', '{{summary_prompt}}', 'Google', '5,000', 'HTTP/HTTPS', 'zh-CN']) assert.ok(text.includes(term));
    const policy = (await load(`privacy/${locale}`))[`${names[locale]}Privacy`];
    assert.equal(policy.date, dates[locale]);
    const pagePolicy = policy.sections.find(section => section.id === 'ai-page');
    assert.ok(pagePolicy);
    for (const term of ['chrome.storage.session', '/chat/completions', '60,000', '100', 'HTML', 'Cookie', 'URL', 'Shadow DOM']) assert.ok(JSON.stringify(pagePolicy).toLowerCase().includes(term.toLowerCase()), `Missing AI page disclosure: ${locale}/${term}`);
    const aiPage = copy.items.find(item => item.id === 'ai-page');
    for (const term of ['HTTP/HTTPS', '60,000', '100', 'Google', 'Simple', 'Full', 'iframe', 'Shadow DOM']) assert.ok(JSON.stringify(aiPage).includes(term), `Missing AI page boundary: ${locale}/${term}`);
    const disclosures = JSON.stringify(policy);
    for (const term of ['chrome.tts', 'JPEG', '2,048', 'Simple', '0.6', '{{title_prompt}}', '{{summary_prompt}}', 'Google', '5,000', 'URL', 'zh-CN']) assert.ok(disclosures.includes(term));
  }
});

// New control rows must not be cropped by the old fixed-height gallery extracts.
test('release screenshots use fresh versionless captures and measured panel bounds', async () => {
  const release = JSON.parse(await readFile(new URL('../../manifest.json', import.meta.url), 'utf8')).version;
  const manifest = JSON.parse(await readFile(new URL('../src/config/screenshots.json', import.meta.url), 'utf8'));
  const { screenshots } = await load('screenshots');
  const captures = JSON.parse(await readFile(new URL('../src/config/screenshots-capture.json', import.meta.url), 'utf8'));
  for (const locale of ['en', 'zh-cn', 'zh-tw', 'ja', 'ko']) {
    const info = captures[locale];
    assert.equal(info.version, release);
    assert.equal(info.versionWatermarks, 'hidden');
    assert.ok(info.features.includes('ai-page-translation'));
    for (const id of ['ai-page-confirm', 'ai-page-result']) {
      const image = manifest[locale].find(image => image.id === id);
      assert.deepEqual([image.width, image.height], [1280, 850]);
    }
    assert.deepEqual(shape(screenshots[locale]), shape(screenshots.en));
    for (const [id, filename, bounds] of [['simple', 'selection-simple.png', info.cropBoxes], ['images', 'selection-image-strip.png', info.inputBoxes]]) {
      const [left, top, right, bottom] = bounds[filename];
      const image = manifest[locale].find(image => image.id === id);
      assert.deepEqual([image.width, image.height], [right - left, bottom - top]);
    }
    for (const image of manifest[locale]) assert.ok(screenshots[locale].items[image.id]);
  }
});
