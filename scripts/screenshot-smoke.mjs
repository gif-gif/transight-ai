import { inspectSourceImageLayout, assertSourceImageLayout } from './source-image-layout.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
export async function screenshotSmoke({ context, worker, page, sample, requests, screenshotDir, msg, modelBehaviors, setMode }) {
  setMode('success'); modelBehaviors.clear();
  const previous = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  await worker.evaluate(async () => {
    const { settings } = await chrome.storage.local.get('settings');
    await chrome.storage.local.set({ settings: { ...settings, model: 'mock-translator', models: ['mock-translator', 'z-model'] } });
  });
  const previousVault = await worker.evaluate(async () => ({ local: await chrome.storage.local.get('credentialVault'), session: await chrome.storage.session.get('credentialSession') }));
  let popup, options;
  const imageRequests = () => requests.filter(request => Array.isArray(request.body.messages[1].content));
  try {
    await sample.bringToFront();
    const before = imageRequests().length;
    const selector = '[data-transight-screenshot]';
    const startPicker = async () => {
      if (!await page.evaluate(() => chrome.extension.getViews({ type: 'popup' }).length)) {
        await sample.bringToFront(); await worker.evaluate(() => chrome.action.openPopup());
      }
      await page.waitForFunction(() => chrome.extension.getViews({ type: 'popup' }).some(view => view.document.querySelector('#target option')));
      // The popup no longer exposes a capture button. Exercise the retained
      // capture pipeline directly from the authorized extension popup context.
      const response = await page.evaluate(async () => {
        const view = chrome.extension.getViews({ type: 'popup' })[0], doc = view.document;
        if (doc.querySelector('#screenshot')) throw new Error('Screenshot entry must be absent');
        const draft = { text: doc.querySelector('#source').value,
          images: Array.from(doc.querySelectorAll('#source-images img'), image => image.src) };
        const result = await view.chrome.runtime.sendMessage({ type: 'SCREENSHOT_CAPTURE', draft });
        if (result?.ok) view.close();
        return result;
      });
      assert.equal(response?.ok, true);
      await sample.locator(selector).waitFor({ state: 'visible' });
      await page.waitForFunction(() => !chrome.extension.getViews({ type: 'popup' }).length);
    };
    const pageCount = context.pages().length;
    await startPicker();
    assert.equal(context.pages().length, pageCount, 'selection stays on original webpage');
    await sample.keyboard.press('Escape');
    await sample.locator(selector).waitFor({ state: 'detached' });
    assert.equal(context.pages().length, pageCount); assert.equal(imageRequests().length, before);
    await startPicker();
    await sample.setViewportSize({ width: 1100, height: 960 });
    await sample.locator(selector).waitFor({ state: 'detached' });
    await sample.setViewportSize({ width: 1120, height: 980 });
    await startPicker();
    await page.bringToFront();
    await sample.locator(selector).waitFor({ state: 'detached' });
    await sample.bringToFront();
    await sample.evaluate(() => {
      const fixture = document.createElement('div'); fixture.id = 'screenshot-fixture';
      fixture.style.cssText = 'position:absolute;left:100px;top:200px;width:400px;height:220px;background:rgb(30,190,100);color:white;z-index:999;font:20px sans-serif';
      fixture.textContent = 'Translate only this selected region'; document.body.append(fixture);
    });
    await startPicker();
    await sample.mouse.click(150, 250); await sample.keyboard.press('Enter');
    assert.equal(context.pages().length, pageCount, 'tiny/empty selection cannot capture');
    // Reverse-direction drag on the live webpage. No editor or image exists yet.
    await sample.mouse.move(500, 420); await sample.mouse.down();
    await sample.mouse.move(100, 200, { steps: 8 }); await sample.mouse.up();
    await sample.screenshot({ path: path.join(screenshotDir, 'screenshot-region-picker.png') });
    assert.equal(context.pages().length, pageCount); assert.equal(imageRequests().length, before);
    const waitFor = (selector, count = 1) => page.waitForFunction(({ selector, count }) =>
      (chrome.extension.getViews({ type: 'popup' })[0]?.document.querySelectorAll(selector).length || 0) >= count, { selector, count });
    const read = (fn, arg) => popup.evaluate(fn, arg);
    const click = selector => read((view, selector) => view.document.querySelector(selector).click(), selector);
    const captured = async (count = 1) => {
      await page.waitForFunction(count => {
        const img = chrome.extension.getViews({ type: 'popup' })[0]?.document.querySelector('#source-images img');
        return img?.complete && img.naturalWidth > 0 && chrome.extension.getViews({ type: 'popup' })[0].document.querySelectorAll('#source-images img').length === count;
      }, count);
      popup = await page.evaluateHandle(() => chrome.extension.getViews({ type: 'popup' })[0]);
      await sample.locator(selector).waitFor({ state: 'detached' });
      assert.equal(context.pages().length, pageCount, 'capture must not open another page');
    };
    // Double-click preserves the existing region instead of resetting it to a point.
    await sample.mouse.dblclick(300, 320);
    await captured();
    assert.equal(imageRequests().length, before, 'capturing does not upload');
    assert.deepEqual(await read(view => {
      const img = view.document.querySelector('#source-images img');
      return { width: img.naturalWidth, height: img.naturalHeight, sourceHidden: view.document.querySelector('#source').hidden,
        previewVisible: !view.document.querySelector('#source-image-wrap').hidden };
    }), { width: 400, height: 220, sourceHidden: false, previewVisible: true });
    const pixel = await read(view => {
      const img = view.document.querySelector('#source-images img'), canvas = view.document.createElement('canvas');
      canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0); return [...ctx.getImageData(20, 150, 1, 1).data];
    });
    assert.ok(Math.abs(pixel[0] - 30) < 6 && Math.abs(pixel[1] - 190) < 6 && Math.abs(pixel[2] - 100) < 6, `overlay excluded: ${pixel}`);
    const selected = await read(view => view.document.querySelector('#source-images img').src);
    await click('#translate');
    await waitFor('.result-card[data-state="success"]', 2);
    assert.equal(imageRequests().length, before + 2);
    for (const request of imageRequests().slice(-2)) assert.equal(request.body.messages[1].content[1].image_url.url, selected);
    assert.equal(await read(view => view.document.querySelectorAll('.speak-result:not(:disabled)').length), 2);
    await click('.copy-result'); await waitFor('.copy-result[data-copied="true"]');
    assert.equal(await read(view => view.document.documentElement.scrollWidth <= view.innerWidth), true);
    for (const language of ['en', 'zh-TW', 'ja', 'ko']) {
      const catalog = JSON.parse(await readFile(new URL(`../_locales/${language.replace('-', '_')}/messages.json`, import.meta.url), 'utf8'));
      await click('#ui-language'); await click(`[data-language="${language}"]`);
      await page.waitForFunction(text => chrome.extension.getViews({ type: 'popup' })[0]?.document.querySelector('#translate-label')?.textContent === text, catalog.screenshotTranslateImage.message);
      assert.equal(await read(view => view.document.querySelector('#source-images img').src), selected);
    }
    await click('#ui-language'); await click('[data-language="auto"]');
    await page.waitForFunction(text => chrome.extension.getViews({ type: 'popup' })[0]?.document.querySelector('#translate-label')?.textContent === text, msg('screenshotTranslateImage'));

    modelBehaviors.set('z-model', { status: 400 });
    await click('#translate'); await waitFor('.result-card[data-state="error"]');
    assert.ok((await read(view => view.document.querySelector('[data-model="z-model"] .result').textContent)).includes(msg('screenshotModelError')));
    modelBehaviors.delete('z-model'); const retryCount = imageRequests().length;
    await click('.retry-result'); await waitFor('.result-card[data-state="success"]', 2);
    assert.equal(imageRequests().length, retryCount + 1);
    assert.equal(imageRequests().at(-1).body.messages[1].content[1].image_url.url, selected);

    let release; const wait = new Promise(resolve => { release = resolve; });
    modelBehaviors.set('z-model', { wait, text: 'STALE IMAGE RESULT' });
    await click('#translate'); await waitFor('#cancel-translation:not([hidden])');
    await click('#cancel-translation');
    assert.equal(await read(view => view.document.querySelector('#status').textContent), msg('translationCancelled'));
    release(); modelBehaviors.clear();
    await click('#clear');
    assert.deepEqual(await read(view => ({ sourceHidden: view.document.querySelector('#source').hidden,
      previewHidden: view.document.querySelector('#source-image-wrap').hidden, src: view.document.querySelector('#source-images img')?.getAttribute('src') ?? null,
      label: view.document.querySelector('#translate-label').textContent })),
      { sourceHidden: false, previewHidden: true, src: null, label: msg('translate') });
    await read(view => { const input = view.document.querySelector('#source'); input.value = 'Text after clearing screenshot'; input.dispatchEvent(new view.Event('input')); });
    const afterImages = imageRequests().length;
    await click('#translate'); await waitFor('.result-card[data-state="success"]', 2);
    assert.equal(imageRequests().length, afterImages, 'clear restores plain text requests');
    assert.ok(!(await read(view => view.document.querySelector('#results-list').textContent)).includes('STALE IMAGE RESULT'));

    // Enter and button confirmation still work; double-click without a region does nothing.
    await startPicker();
    await sample.mouse.dblclick(80, 100);
    await sample.keyboard.press('Enter');
    assert.equal(await sample.locator(selector).count(), 1);
    await sample.mouse.move(100, 200); await sample.mouse.down(); await sample.mouse.move(500, 420, { steps: 8 }); await sample.mouse.up();
    // A drag beginning inside the selection replaces it, rather than confirming it.
    await sample.mouse.move(200, 260); await sample.mouse.down(); await sample.mouse.move(400, 360, { steps: 8 }); await sample.mouse.up();
    await sample.keyboard.press('Enter'); await captured();
    assert.deepEqual(await read(view => { const img = view.document.querySelector('#source-images img'); return [img.naturalWidth, img.naturalHeight]; }), [200, 100]);
    await startPicker();
    await sample.mouse.move(100, 200); await sample.mouse.down(); await sample.mouse.move(500, 420, { steps: 8 }); await sample.mouse.up();
    await sample.keyboard.press('Tab'); await sample.keyboard.press('Tab'); await sample.keyboard.press('Enter'); await captured(2);
    assert.equal(await read(view => view.document.querySelector('#source').value), 'Text after clearing screenshot');
    await click('#translate'); await waitFor('.result-card[data-state="success"]', 2);
    for (const request of imageRequests().slice(-2)) assert.equal(request.body.messages[1].content.filter(part => part.type === 'image_url').length, 2);
    const paste = (colors, text = '') => read(async (view, { colors, text }) => {
      const data = new view.DataTransfer();
      for (const color of colors) {
        const canvas = view.document.createElement('canvas'); canvas.width = 40; canvas.height = 30;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = color; ctx.fillRect(0, 0, 40, 30);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        data.items.add(new view.File([blob], 'clipboard.png', { type: 'image/png' }));
      }
      if (text) data.setData('text/plain', text);
      const input = view.document.querySelector('#source'); input.focus(); input.setSelectionRange(input.value.length, input.value.length);
      const event = new view.ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true });
      input.dispatchEvent(event); return event.defaultPrevented;
    }, { colors, text });
    const awaitImages = count => page.waitForFunction(count => {
      const doc = chrome.extension.getViews({ type: 'popup' })[0]?.document;
      return doc?.querySelectorAll('#source-images img').length === count && !doc.querySelector('#translate').disabled;
    }, count);
    const sourceLayout = () => page.evaluate(`(${inspectSourceImageLayout.toString()})(chrome.extension.getViews({type: 'popup'})[0].document)`);
    const beforePaste = imageRequests().length;
    assert.equal(await paste(['#cc3333'], ' plus pasted text'), true);
    await awaitImages(3);
    assert.equal(imageRequests().length, beforePaste, 'pasting never uploads');
    assert.equal(await read(view => view.document.querySelector('#source').value), 'Text after clearing screenshot plus pasted text');
    assert.equal(await read(view => [...view.document.querySelectorAll('.source-thumbnail')].every(el => {
      const bounds = el.getBoundingClientRect(); return bounds.width === 72 && bounds.height === 72;
    })), true, 'images are compact thumbnails');
    assertSourceImageLayout(await sourceLayout());
    const attached = await read(view => [...view.document.querySelectorAll('#source-images img')].map(img => img.src));
    await click('.remove-source-image[data-index="0"]');
    assert.deepEqual(await read(view => [...view.document.querySelectorAll('#source-images img')].map(img => img.src)), attached.slice(1), 'delete only the clicked image');
    await click('#translate'); await waitFor('.result-card[data-state="success"]', 2);
    for (const request of imageRequests().slice(-2)) {
      assert.deepEqual(request.body.messages[1].content.slice(1).map(part => part.image_url.url), attached.slice(1));
      assert.ok(request.body.messages[1].content[0].text.includes('plus pasted text'));
    }
    // Multi-file paste stops at the shared cap without deleting existing attachments.
    await paste(['#0000ff', '#00ff00', '#ffff00', '#ffffff']); await awaitImages(5);
    const stripLayout = await sourceLayout();
    assertSourceImageLayout(stripLayout);
    assert.ok(stripLayout.scrollWidth > stripLayout.clientWidth, 'five images overflow horizontally instead of wrapping');
    assert.ok(await read(view => {
      const strip = view.document.querySelector('#source-images'); strip.scrollLeft = strip.scrollWidth;
      return strip.scrollLeft > 0 && strip.lastElementChild.getBoundingClientRect().right <= strip.getBoundingClientRect().right;
    }), 'horizontal scrolling reaches the last image');
    assertSourceImageLayout(await sourceLayout());
    assert.equal(await read(view => view.document.querySelector('#status').textContent), msg('imageLimit'));
    await click('.remove-source-image[data-index="4"]'); await awaitImages(4);
    await read(view => {
      const data = new view.DataTransfer(); data.items.add(new view.File(['<svg/>'], 'unsafe.svg', { type: 'image/svg+xml' }));
      view.document.querySelector('#source').dispatchEvent(new view.ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    });
    await page.waitForFunction(text => chrome.extension.getViews({ type: 'popup' })[0]?.document.querySelector('#status')?.textContent === text, msg('imageUnsupported'));
    await awaitImages(4);
    // Removing the last image retains typed text and returns to plain text translation.
    for (let i = 0; i < 4; i++) await click('.remove-source-image');
    assert.equal(await read(view => view.document.querySelector('#source-image-wrap').hidden), true);
    assertSourceImageLayout(await sourceLayout(), false);
    assert.equal(await read(view => view.document.querySelector('#translate-label').textContent), msg('translate'));
    assert.ok((await read(view => view.document.querySelector('#source').value)).includes('plus pasted text'));
    // A queued decode must not resurrect attachments after Clear.
    await read(async view => {
      const canvas = view.document.createElement('canvas'); canvas.width = 100; canvas.height = 100;
      const blob = await new Promise(resolve => canvas.toBlob(resolve));
      const data = new view.DataTransfer(); data.items.add(new view.File([blob], 'queued.png', { type: 'image/png' }));
      view.document.querySelector('#source').dispatchEvent(new view.ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
      view.document.querySelector('#clear').click();
    });
    await awaitImages(0);
    assert.equal(await read(view => view.document.querySelector('#source').value), '');
    assert.equal(await worker.evaluate(async () => JSON.stringify([await chrome.storage.local.get(null), await chrome.storage.session.get(null)]).includes('data:image/')), false);
    // Closing and reopening the native popup does not resurrect the consumed image.
    await read(view => view.close()); await worker.evaluate(() => chrome.action.openPopup());
    await waitFor('#source-image-wrap[hidden]');
    // Unlock in place after taking a screenshot: the image must survive unlock and resume.
    await page.evaluate(() => chrome.extension.getViews({ type: 'popup' })[0]?.close());
    options = await context.newPage();
    await options.goto(new URL('../options/options.html', page.url()).href);
    const saved = await options.evaluate(async () => {
      const { settings } = await chrome.storage.local.get('settings');
      return chrome.runtime.sendMessage({ type: 'VAULT_SAVE', settings: { ...settings, apiKey: 'screenshot-local-test-key' }, password: 'screenshot-test-password', confirmation: 'screenshot-test-password' });
    });
    assert.equal(saved.ok, true);
    assert.equal((await options.evaluate(() => chrome.runtime.sendMessage({ type: 'VAULT_LOCK' }))).ok, true);
    await options.close(); options = null;
    await startPicker();
    await sample.mouse.move(100, 200); await sample.mouse.down(); await sample.mouse.move(500, 420, { steps: 8 }); await sample.mouse.up();
    await sample.mouse.dblclick(300, 320); await captured();
    await page.waitForFunction(() => chrome.extension.getViews({ type: 'popup' })[0]?.document.querySelector('#inline-unlock iframe')?.contentDocument?.querySelector('#unlock-password'));
    const beforeUnlock = imageRequests().length;
    await click('#translate');
    await page.waitForFunction(text => chrome.extension.getViews({ type: 'popup' })[0]?.document.querySelector('#status')?.textContent === text, msg('vaultLockedError'));
    assert.equal(imageRequests().length, beforeUnlock);
    await read(view => {
      const doc = view.document.querySelector('#inline-unlock iframe').contentDocument;
      doc.querySelector('#unlock-password').value = 'screenshot-test-password';
      doc.querySelector('#unlock-vault').click();
    });
    await waitFor('#inline-unlock[hidden]'); await waitFor('.result-card[data-state="success"]', 2);
    assert.equal(imageRequests().length, beforeUnlock + 2);
    assert.equal(await read(view => view.document.querySelector('#source-images img').naturalWidth), 400);
    console.log('✓ Screenshot translation: double-click/Enter/button confirmation, no new tab, multiple thumbnails, clipboard images, individual deletion, limits and stale-paste cancellation, crop-only pixels, multi-model requests/retry/cancel, copy, inline unlock, five languages, clear-to-text, one-use draft and no image storage');
  } finally {
    modelBehaviors.clear(); await options?.close();
    await page.evaluate(() => chrome.extension.getViews({ type: 'popup' })[0]?.close()).catch(() => {});
    await worker.evaluate(async snapshot => {
      await chrome.storage.local.remove('credentialVault'); await chrome.storage.session.remove('credentialSession');
      await chrome.storage.local.set(snapshot.local); await chrome.storage.session.set(snapshot.session);
    }, previousVault);
    await worker.evaluate(settings => chrome.storage.local.set({ settings }), previous);
    await sample.evaluate(() => document.getElementById('screenshot-fixture')?.remove());
    await sample.bringToFront();
  }
}
