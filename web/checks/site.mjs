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
    [['ja'], 'ja'], [['ja-JP'], 'ja'], [['JA_jp'], 'ja'],
    [['ko'], 'ko'], [['ko-KR'], 'ko'], [['KO_kr'], 'ko'],
    [['fr-FR', 'ja-JP', 'ko-KR'], 'ja'], [['ko-KR', 'en-US'], 'ko'],
    [['en-US', 'ja-JP'], 'en'],
  ]) assert.equal(detectLocale(input), expected, input.join(','));
  assert.equal(isLocale(null), false);
  assert.equal(isLocale('unknown'), false);
  for (const locale of locales) assert.equal(isLocale(locale), true);
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
      assert.ok(html.includes(`property="og:locale" content="${localeInfo[locale].og}"`));
      assert.match(html, /href="#main"/);
      assert.match(html, /id="main"/);
      assert.doesNotMatch(html, /\bundefined\b|\[object Object\]|TODO|Lorem ipsum/);
      for (const target of locales) assert.ok(html.includes(`href="${localePath(target, page)}"`));
      if (page === '' || page === 'guide') {
        assert.ok(html.includes('id="selection-trigger"'));
        for (const id of ['ai-page', 'modes', 'images', 'speech', 'controls', 'google', 'website']) assert.ok(html.includes(`id="capability-${id}"`));
        assert.match(html, /Simple Translate/);
        assert.match(html, /Full Translate/);
        assert.ok(html.includes('aria-labelledby="selection-trigger-title"'));
        assert.ok(html.includes(`src="/screenshots/${locale}/selection-trigger-detail.webp"`));
        assert.ok(html.includes(`href="/screenshots/${locale}/selection-trigger-full.webp"`));
        assert.match(html, /Selecting text alone sends nothing|仅选中文字不会发送内容|僅選取文字不會傳送內容|文章を選択するだけでは送信されません|텍스트를 선택하기만 해서는 전송되지 않습니다/);
      }
      if (page === 'guide') {
        const storeHref = html.match(/href="(https:\/\/chromewebstore\.google\.com\/detail\/[^"]+)"/)?.[1];
        assert.ok(storeHref, 'Official store link must be present without JavaScript');
        const storeUrl = new URL(storeHref.replaceAll('&amp;', '&'));
        assert.equal(storeUrl.pathname, '/detail/transight-ai/aocmejffpcbcfnmbpiilnlikapmlhocm');
        assert.equal(storeUrl.searchParams.get('utm_source'), 'item-ow-cb');
        const storeLanguages = { 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW', en: 'en', ja: 'ja', ko: 'ko' };
        assert.deepEqual(storeUrl.searchParams.getAll('hl'), [storeLanguages[locale]]);
        assert.ok(!html.includes('chromewebstore.google.com/search/'));
        assert.ok(html.includes('id="screenshots"'));
        for (const image of ['ai-page-confirm', 'ai-page-result', 'simple', 'google', 'popup-simple', 'images', 'selection', 'comparison', 'settings', 'unlock']) {
          assert.ok(html.includes(`src="/screenshots/${locale}/${image}.webp"`));
          assert.ok(html.includes(`href="/screenshots/${locale}/${image}.webp"`));
        }
        const screenshots = [...html.matchAll(/<img[^>]+src="\/screenshots\/[^>]+>/g)];
        assert.equal(screenshots.length, 11);
        for (const [image] of screenshots) {
          assert.match(image, /alt="[^"]+"/);
          assert.match(image, /width="[1-9][0-9]*"/);
          assert.match(image, /height="[1-9][0-9]*"/);
          assert.match(image, /loading="lazy"/);
        }
        assert.doesNotMatch(html, /npm run build|Node\.js|chrome:\/\/extensions|Load unpacked|开发者模式|開發人員模式/);
      } else if (page === '') {
        assert.ok(html.includes('id="features"'));
        assert.ok(html.includes('id="how-it-works"'));
      }
      assert.ok(html.includes(`href="${localePath(locale, 'privacy')}"`));
      if (page === 'privacy') {
        assert.ok(html.includes('datetime="2026-10-14"'));
        for (const term of ['chrome.tts', '2,048', '0.6', '{{title_prompt}}', '{{summary_prompt}}']) assert.ok(html.includes(term), `Missing privacy disclosure: ${term}`);
        assert.ok(html.includes('href="https://github.com/gif-gif/transight-ai/issues"'));
        for (const id of ['data', 'requests', 'ai-page', 'providers', 'storage', 'permissions', 'security', 'choices', 'website', 'updates', 'contact']) {
          assert.ok(html.includes(`id="${id}"`));
          assert.ok(html.includes(`href="#${id}"`));
        }
        for (const detail of ['chrome.storage.local', 'chrome.storage.session.contextDraft', '/chat/completions', '/models', 'Authorization: Bearer', 'Hello, world!', '127.0.0.1', 'yijian-site-locale']) assert.ok(html.includes(detail), detail);
        for (const detail of ['AES-256-GCM', 'PBKDF2-SHA-256', '600,000', 'chrome.storage.session']) assert.ok(html.includes(detail));
        assert.doesNotMatch(html, /no application-layer encryption|没有应用层静态加密|沒有應用層靜態加密/);
        // Keep lifecycle and security limits visible in every translated policy.
        for (const disclosure of [
          /Passwords and derived encryption keys are not saved|解锁密码和派生加密密钥不保存|解鎖密碼和衍生加密金鑰不保存|パスワードと派生暗号鍵は保存されません|비밀번호와 파생 암호화 키는 저장하지 않습니다/,
          /ordinary settings.*are not encrypted|普通设置不作加密|一般設定不作加密|通常の設定は暗号化されません|일반 설정은 암호화하지 않습니다/,
          /old plaintext remains until the encrypted vault is successfully saved|密文保存成功后才移除旧明文|密文保存成功後才移除舊明文|暗号化データの保存が成功してから旧平文キーを削除|암호문 저장이 성공한 뒤에만 기존 평문 키를 삭제/,
          /Lock now|立即锁定|立即鎖定|今すぐロック|지금 잠그기/,
          /Forgotten passwords cannot be recovered|忘记密码无法恢复|忘記密碼無法復原|忘れたパスワードは復元できません|잊어버린 비밀번호는 복구할 수 없습니다/,
          /Encryption at rest does not hide your API key|本地加密保存不代表.*隐藏 API Key|本機加密保存不代表.*隱藏 API Key|保存時の暗号化は.*API キーを隠すものではありません|저장 시 암호화는.*API 키를 숨기는 기능이 아닙니다/
        ]) assert.match(html, disclosure);
        assert.match(html, /before confirming translation consent|确认翻译同意之前|確認翻譯同意之前|翻訳への同意を確認する前|번역 동의를 확인하기 전/);
        assert.match(html, /Issues are public|Issues 是公开渠道|Issues 是公開管道|Issues は公開されています|Issues는 공개됩니다/);
        if (locale === 'en') assert.match(html, /<h1>Privacy Policies<\/h1>/);
      }
      assert.ok(html.includes('href="https://github.com/gif-gif/transight-ai"'));
      assert.doesNotMatch(html, /Yijian AI/);
      if (locale === 'en') assert.match(html, /<title>[^<]*Transight AI[^<]*<\/title>/);
      if (page === '') {
        assert.ok(html.includes('id="open-source"'));
        assert.ok(html.includes('class="selection-flow"'));
        assert.match(html, /<strong>5<span aria-hidden="true"> \/ <\/span><\/strong>/);
        if (locale === 'ja' || locale === 'ko') assert.ok(html.includes(`class="translated-text" lang="${locale}"`));
        assert.ok(html.includes({ en: 'Fully open source', 'zh-cn': '完全开源', 'zh-tw': '完全開源', ja: '完全オープンソース', ko: '완전한 오픈 소스' }[locale]));
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
