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
  for (const page of ['', 'guide']) {
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
        assert.ok(html.includes('npm run build'));
        assert.ok(html.includes('chrome://extensions'));
      } else {
        assert.ok(html.includes('id="features"'));
        assert.ok(html.includes('id="how-it-works"'));
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
  const files = ['index.html', '404.html', ...locales.flatMap((locale) => [`${locale}/index.html`, `${locale}/guide/index.html`])];
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
      for (const page of ['', 'guide']) assert.ok(sitemap.includes(`<loc>${new URL(localePath(locale, page), process.env.SITE_URL)}</loc>`));
    }
    assert.ok(!sitemap.includes(`<loc>${new URL('/', process.env.SITE_URL)}</loc>`));
    assert.ok(!sitemap.includes('/404'));
  } else {
    assert.match(robots, /Disallow: \//);
    await assert.rejects(access(new URL('sitemap-index.xml', dist)));
  }
});
