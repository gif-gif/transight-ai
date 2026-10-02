import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile, access } from 'node:fs/promises';
import ts from 'typescript';

const dist = new URL('../dist/', import.meta.url);
const read = (path) => readFile(new URL(path, dist), 'utf8');
const source = await readFile(new URL('../src/i18n/locales.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const { detectLocale, localePath, isLocale, locales, localeInfo } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`);

test('browser language matching, script precedence, and English fallback', () => {
  for (const [input, expected] of [
    [[], 'en'], [['fr-FR'], 'en'], [['en-US'], 'en'], [['zh'], 'zh-cn'],
    [['zh-CN'], 'zh-cn'], [['zh-SG'], 'zh-cn'], [['zh_TW'], 'zh-tw'],
    [['zh-HK'], 'zh-tw'], [['zh-MO'], 'zh-tw'], [['zh-Hans-HK'], 'zh-cn'],
    [['zh-Hant-CN'], 'zh-tw'], [['fr-FR', 'zh-TW'], 'zh-tw'], [['en-GB', 'zh-CN'], 'en'],
  ]) assert.equal(detectLocale(input), expected, input.join(','));
  assert.equal(isLocale(null), false);
  assert.equal(isLocale('unknown'), false);
  assert.equal(isLocale('zh-cn'), true);
});

for (const locale of locales) {
  for (const page of ['', 'guide', 'privacy']) {
    const route = localePath(locale, page);
    test(`${route}: prerendered language, navigation, content and metadata`, async () => {
      const html = await read(`${route.slice(1)}index.html`);
      assert.match(html, new RegExp(`<html lang="${localeInfo[locale].lang}"`));
      assert.equal((html.match(/<h1(?:\s|>)/g) ?? []).length, 1);
      assert.match(html, /<title>[^<]+<\/title>/);
      assert.match(html, /<meta name="description" content="[^"]+"/);
      assert.match(html, /<meta property="og:title"/);
      assert.match(html, /href="#main"/);
      assert.match(html, /id="main"/);
      assert.doesNotMatch(html, /\bundefined\b|\[object Object\]|TODO|Lorem ipsum/);
      for (const target of locales) assert.ok(html.includes(`href="${localePath(target, page)}"`));
      if (page === 'guide') {
        assert.ok(html.includes('https://chromewebstore.google.com/search/Transight%20AI'));
        assert.doesNotMatch(html, /npm run build|Node\.js|chrome:\/\/extensions|Load unpacked|开发者模式|開發人員模式/);
      } else if (page === '') {
        assert.ok(html.includes('id="features"'));
        assert.ok(html.includes('id="how-it-works"'));
      }
      assert.ok(html.includes(`href="${localePath(locale, 'privacy')}"`));
      if (page === 'privacy') {
        assert.ok(html.includes('datetime="2026-10-02"'));
        assert.ok(html.includes('href="https://github.com/gif-gif/transight-ai/issues"'));
        for (const id of ['data', 'requests', 'providers', 'storage', 'permissions', 'security', 'choices', 'website', 'updates', 'contact']) {
          assert.ok(html.includes(`id="${id}"`));
          assert.ok(html.includes(`href="#${id}"`));
        }
        for (const detail of ['chrome.storage.local', 'chrome.storage.session.contextDraft', '/chat/completions', '/models', 'Authorization: Bearer', 'Hello, world!', '127.0.0.1', 'yijian-site-locale']) assert.ok(html.includes(detail), detail);
        for (const detail of ['AES-256-GCM', 'PBKDF2-SHA-256', '600,000', 'chrome.storage.session']) assert.ok(html.includes(detail));
        assert.doesNotMatch(html, /no application-layer encryption|没有应用层静态加密|沒有應用層靜態加密/);
        // Keep lifecycle and security limits visible in every translated policy.
        for (const disclosure of [
          /Passwords and derived encryption keys are not saved|解锁密码和派生加密密钥不保存|解鎖密碼和衍生加密金鑰不保存/,
          /ordinary settings.*are not encrypted|普通设置不作加密|一般設定不作加密/,
          /old plaintext remains until the encrypted vault is successfully saved|密文保存成功后才移除旧明文|密文保存成功後才移除舊明文/,
          /Lock now|立即锁定|立即鎖定/,
          /Forgotten passwords cannot be recovered|忘记密码无法恢复|忘記密碼無法復原/,
          /Encryption at rest does not hide your API key|本地加密保存不代表.*隐藏 API Key|本機加密保存不代表.*隱藏 API Key/
        ]) assert.match(html, disclosure);
        assert.match(html, /before confirming translation consent|确认翻译同意之前|確認翻譯同意之前/);
        assert.match(html, /Issues are public|Issues 是公开渠道|Issues 是公開管道/);
        if (locale === 'en') assert.match(html, /<h1>Privacy Policies<\/h1>/);
      }
      assert.ok(html.includes('href="https://github.com/gif-gif/transight-ai"'));
      assert.doesNotMatch(html, /Yijian AI/);
      if (locale === 'en') assert.match(html, /<title>[^<]*Transight AI[^<]*<\/title>/);
      if (page === '') {
        assert.ok(html.includes('id="open-source"'));
        assert.ok(html.includes('class="selection-flow"'));
        assert.ok(html.includes({ en: 'Fully open source', 'zh-cn': '完全开源', 'zh-tw': '完全開源' }[locale]));
      }
      if (process.env.SITE_URL) {
        assert.ok(html.includes(`rel="canonical" href="${new URL(route, process.env.SITE_URL)}"`));
        for (const target of locales) assert.ok(html.includes(`hreflang="${localeInfo[target].lang}" href="${new URL(localePath(target, page), process.env.SITE_URL)}"`));
        assert.match(html, /hreflang="x-default"/);
        assert.doesNotMatch(html, /noindex/);
      } else {
        assert.doesNotMatch(html, /rel="canonical"/);
        assert.match(html, /noindex, nofollow/);
      }
    });
  }
}

test('every local link, anchor and static asset resolves', async () => {
  const files = ['index.html', '404.html', ...locales.flatMap((locale) => [`${locale}/index.html`, `${locale}/guide/index.html`, `${locale}/privacy/index.html`])];
  for (const file of files) {
    const html = await read(file);
    for (const [, reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!reference.startsWith('/') && !reference.startsWith('#')) continue;
      const url = new URL(reference, `https://test.invalid/${file}`);
      const target = url.pathname.endsWith('/') ? `${url.pathname.slice(1)}index.html` : url.pathname.slice(1);
      await access(new URL(target, dist));
      if (url.hash) assert.ok((await read(target)).includes(`id="${url.hash.slice(1)}"`), `${file} → ${reference}`);
    }
  }
});

test('no-JavaScript root and 404 both provide all language links', async () => {
  for (const file of ['index.html', '404.html']) {
    const html = await read(file);
    for (const locale of locales) assert.ok(html.includes(`href="${localePath(locale)}"`));
  }
});

test('robots and sitemap match deployment configuration', async () => {
  const robots = await read('robots.txt');
  if (process.env.SITE_URL) {
    assert.ok(robots.includes(`Sitemap: ${new URL('/sitemap-index.xml', process.env.SITE_URL)}`));
    const index = await read('sitemap-index.xml');
    const sitemapLocation = index.match(/<loc>([^<]+)<\/loc>/)?.[1];
    assert.ok(sitemapLocation);
    const sitemap = await read(new URL(sitemapLocation).pathname.slice(1));
    for (const locale of locales) {
      for (const page of ['', 'guide', 'privacy']) assert.ok(sitemap.includes(`<loc>${new URL(localePath(locale, page), process.env.SITE_URL)}</loc>`));
    }
    assert.ok(!sitemap.includes(`<loc>${new URL('/', process.env.SITE_URL)}</loc>`));
    assert.ok(!sitemap.includes('/404'));
  } else {
    assert.match(robots, /Disallow: \//);
    await assert.rejects(access(new URL('sitemap-index.xml', dist)));
  }
});


test('favicon has transparent background, no white frame, and a separate page logo', async () => {
  const icon = await read('favicon.svg');
  assert.match(icon, /viewBox="0 0 24 24"/);
  assert.match(icon, /fill="none"/);
  assert.match(icon, /stroke="#126754"/);
  assert.doesNotMatch(icon, /<rect|#fff|white/i);
  assert.match(await read('brand.svg'), /<rect/);
  for (const file of ['index.html', '404.html', 'en/index.html']) {
    const html = await read(file);
    assert.ok(html.includes('href="/favicon.svg?v=2"'));
    assert.ok(html.includes('src="/brand.svg"'));
    assert.doesNotMatch(html, /Yijian AI/);
  }
});
