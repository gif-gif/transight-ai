// Run against an already-started local preview. Never contacts external services.
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.SITE_PREVIEW_URL || 'http://127.0.0.1:4321';
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_EXECUTABLE });
const errors = [];
const output = new URL('../../docs/screenshots/website/', import.meta.url);
async function localContext(options) {
  const context = await browser.newContext(options);
  await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
  context.on('page', page => {
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()}: ${response.url()}`); });
  });
  return context;
}
async function layout(page) {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, `Horizontal overflow: ${page.url()}`);
}
try {
  for (const locale of ['ja', 'ko']) {
    const context = await localContext({ locale: locale === 'ja' ? 'ja-JP' : 'ko-KR', viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const folder = new URL(`${locale}/`, output);
    await mkdir(folder, { recursive: true });
    const capture = name => fileURLToPath(new URL(`${name}.png`, folder));
    await page.goto(`${base}/?test=locale#features`);
    await page.waitForURL(`**/${locale}/?test=locale#features`);
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    for (const route of ['', 'guide/', 'privacy/']) {
      await page.goto(`${base}/${locale}/${route}`);
      await layout(page);
      assert.equal(await page.locator('h1').count(), 1);
      if (!route) {
        assert.equal(await page.locator('.translated-text').getAttribute('lang'), locale);
        await page.screenshot({ path: capture('home-desktop'), animations: 'disabled' });
      }
      if (route === 'guide/') {
        const images = page.locator('.screenshot-gallery img');
        assert.equal(await images.count(), 10);
        for (const image of await images.all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(image => image.decode());
          assert.ok((await image.getAttribute('src')).startsWith(`/screenshots/${locale}/`));
        }
        await page.locator('.screenshot-gallery').screenshot({ path: capture('guide-screenshots'), animations: 'disabled' });
      }
      if (route === 'privacy/') await page.screenshot({ path: capture('privacy-desktop'), animations: 'disabled' });
      for (const width of [390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        await layout(page);
        if (!route && width === 390) {
          await page.screenshot({ path: capture('home-mobile'), fullPage: true, animations: 'disabled' });
          await page.locator('.language-switcher summary').press('Enter');
          assert.equal(await page.locator('.language-options a:visible').count(), 5);
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('.language-switcher').getAttribute('open'), null);
        }
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    }
    // The page and section survive a manual switch; the saved choice wins at /.
    const other = locale === 'ja' ? 'ko' : 'ja';
    await page.goto(`${base}/${locale}/privacy/#security`);
    await page.locator('.language-switcher summary').press('Enter');
    await page.locator(`.language-options a[data-locale="${other}"]`).click();
    await page.waitForURL(`**/${other}/privacy/#security`);
    assert.equal(await page.evaluate(() => localStorage.getItem('yijian-site-locale')), other);
    await page.goto(`${base}/`);
    await page.waitForURL(`**/${other}/`);
    await page.goto(`${base}/${locale}/`);
    assert.equal(await page.locator('html').getAttribute('lang'), locale);
    await context.close();
    console.log(`${locale}: desktop/mobile layouts, screenshots, auto-detection and language switching passed`);
  }
  // Every locale exposes the pre-translation selection state on home and guide.
  for (const locale of ['zh-cn', 'zh-tw', 'en', 'ja', 'ko']) {
    const context = await localContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const folder = new URL(`${locale}/`, output);
    await mkdir(folder, { recursive: true });
    for (const route of ['', 'guide/']) {
      await page.goto(`${base}/${locale}/${route}#selection-trigger`);
      const section = page.locator('#selection-trigger');
      assert.equal(await section.locator('li').count(), 3);
      const image = section.locator('img');
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(image => image.decode());
      assert.ok((await image.getAttribute('src')).startsWith(`/screenshots/${locale}/`));
      const link = section.locator('a');
      const response = await page.request.get(new URL(await link.getAttribute('href'), base).href);
      assert.equal(response.status(), 200);
      assert.match(response.headers()['content-type'], /image\/webp/);
      const capabilities = page.locator('#capabilities');
      assert.equal(await capabilities.locator('article').count(), 7);
      for (const id of ['ai-page', 'modes', 'images', 'speech', 'controls', 'google', 'website']) {
        assert.equal(await capabilities.locator(`#capability-${id}`).count(), 1);
        if (route) assert.ok(await capabilities.locator(`#capability-${id} li`).count() >= 2);
        else assert.equal(await capabilities.locator(`#capability-${id} .text-link`).getAttribute('href'), `/${locale}/guide/#capability-${id}`);
      }
      for (const preview of await capabilities.locator('img').all()) {
        await preview.scrollIntoViewIfNeeded();
        await preview.evaluate(image => image.decode());
        assert.ok((await preview.getAttribute('src')).startsWith(`/screenshots/${locale}/`));
      }
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        await layout(page);
        if (!route) {
          await section.screenshot({ path: fileURLToPath(new URL(`selection-trigger-${width}.png`, folder)), animations: 'disabled' });
          await capabilities.screenshot({ path: fileURLToPath(new URL(`capabilities-${width}.png`, folder)), animations: 'disabled' });
        }
      }
    }
    await context.close();
    console.log(`${locale}: capabilities, guide anchors, screenshots and full-size links passed at desktop/mobile widths`);
  }
  for (const [languages, expected] of [[['fr-FR', 'ja-JP', 'ko-KR'], 'ja'], [['ko-KR', 'en-US'], 'ko'], [['fr-FR'], 'en']]) {
    const context = await localContext();
    await context.addInitScript(languages => {
      Object.defineProperty(navigator, 'languages', { get: () => languages });
      Object.defineProperty(window, 'localStorage', { get: () => { throw new DOMException('Blocked', 'SecurityError'); } });
    }, languages);
    const page = await context.newPage();
    await page.goto(`${base}/`);
    await page.waitForURL(`**/${expected}/`);
    await context.close();
  }
  const noScript = await localContext({ javaScriptEnabled: false });
  const page = await noScript.newPage();
  for (const locale of ['ja', 'ko']) {
    for (const route of ['', 'guide/', 'privacy/']) {
      await page.goto(`${base}/${locale}/${route}`);
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      assert.equal(await page.locator('.language-options a').count(), 5);
      assert.ok((await page.locator('h1').textContent()).length > 0);
    }
  }
  await noScript.close();
  assert.deepEqual(errors, []);
  console.log('PASS: no-JavaScript pages, blocked storage, preference ordering; no page errors or failed local resources.');
} finally {
  await browser.close();
}
