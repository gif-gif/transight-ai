import { simpleModeSmoke } from './simple-mode-smoke.mjs';
import { inspectSourceImageLayout, assertSourceImageLayout } from './source-image-layout.mjs';
import { pinSmoke } from './pin-smoke.mjs';
import { inspectSelectStyle, assertSelectStyle } from './select-style-smoke.mjs';
import assert from 'node:assert/strict';
import path from 'node:path';

export async function selectionSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, setMode }) {
  setMode('success');
  sample.on('pageerror', error => { throw error; });
  // Selection is available on the first visit, without opening the toolbar or granting a site.
  assert.equal(await page.locator('#selection-access').count(), 0);
  assert.equal((await worker.evaluate(() => chrome.scripting.getRegisteredContentScripts())).length, 0);
  await sample.waitForSelector('[data-transight="selection"]', { state: 'attached' });
  assert.equal(await sample.evaluate(() => document.querySelector('[data-transight]').shadowRoot), null);
  const session = await context.newCDPSession(sample);
  async function ui(selector, fn = 'function(){return this.textContent}', args = []) {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) {
      if (node.attributes?.includes('data-transight')) return node;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) { const found = find(child); if (found) return found; }
    }
    const host = find(root); assert.ok(host, 'selection host exists');
    const { object } = await session.send('DOM.resolveNode', { nodeId: host.shadowRoots[0].nodeId });
    const { result, exceptionDetails } = await session.send('Runtime.callFunctionOn', {
      objectId: object.objectId,
      functionDeclaration: `function(selector,...args){const element=this.querySelector(selector);if(!element)return undefined;return (${fn}).apply(element,args)}`,
      arguments: [selector, ...args].map(value => ({ value })), returnByValue: true, awaitPromise: true
    });
    await session.send('Runtime.releaseObject', { objectId: object.objectId });
    if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
    return result.value;
  }
  async function until(fn) { for (let i = 0; i < 100; i++) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('selection assertion timeout'); }
  async function click(selector) {
    await ui(selector, 'function(){this.scrollIntoView({block:"center",inline:"nearest"})}');
    const box = await ui(selector, 'function(){const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
    await sample.mouse.click(box.x, box.y);
  }
  async function select(text = 'A little understanding brings us closer.', expectBubble = true) {
    await sample.evaluate(text => {
      const paragraph = document.getElementById('sample'); paragraph.textContent = text;
      const range = document.createRange(); range.selectNodeContents(paragraph);
      getSelection().removeAllRanges(); getSelection().addRange(range);
      paragraph.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    }, text);
    if (expectBubble) await until(async () => !await ui('.selection-bubble', 'function(){return this.hidden}'));
  }
  async function assertTailPosition(label) {
    const expected = await sample.evaluate(() => {
      const range = getSelection().getRangeAt(0);
      const boxes = range.getClientRects();
      const tail = boxes[boxes.length - 1];
      return { right: tail.right, top: tail.top, bottom: tail.bottom,
        viewportWidth: document.documentElement.clientWidth, viewportHeight: innerHeight };
    });
    const actual = await ui('.selection-bubble', 'function(){const r=this.getBoundingClientRect();return {left:r.left,top:r.top,width:r.width,height:r.height}}');
    const left = Math.min(Math.max(8, expected.right), Math.max(8, expected.viewportWidth - actual.width - 8));
    let top = expected.bottom + 3;
    if (top + actual.height > expected.viewportHeight - 8 && expected.top - actual.height - 3 >= 8) top = expected.top - actual.height - 3;
    top = Math.min(Math.max(8, top), Math.max(8, expected.viewportHeight - actual.height - 8));
    assert.ok(Math.abs(actual.left - left) < 1, `${label}: trigger follows selection tail horizontally`);
    assert.ok(Math.abs(actual.top - top) < 1, `${label}: trigger stays 3px from the last line unless clamped by viewport`);
  }
  const before = requests.length;
  // Real pointer selection must still work without waiting for a debounce.
  const textBox = await sample.locator('#sample').evaluate(element => {
    const range = document.createRange(); range.selectNodeContents(element);
    const rect = range.getBoundingClientRect();
    return { left: rect.left, right: rect.right, y: rect.top + rect.height / 2 };
  });
  await sample.mouse.move(textBox.left, textBox.y);
  await sample.mouse.down();
  await sample.mouse.move(textBox.right, textBox.y, { steps: 8 });
  await sample.mouse.up();
  await until(async () => !await ui('.selection-bubble', 'function(){return this.hidden}'));
  await assertTailPosition('real pointer drag');
  assert.equal(requests.length, before);
  await sample.keyboard.press('Escape');
  assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), true);
  // Forward/backward and multiline selections use the text's final line,
  // rather than the first line or the bounding rectangle of the whole range.
  for (const scenario of ['single', 'reverse', 'multiline', 'nested', 'viewport-edge']) {
    await sample.evaluate(scenario => {
      const paragraph = document.getElementById('sample');
      paragraph.textContent = 'A little understanding brings us closer.';
      if (scenario === 'multiline') paragraph.style.width = '125px';
      if (scenario === 'nested') paragraph.innerHTML = 'A little <strong>understanding</strong> brings us <em>closer.</em>';
      if (scenario === 'viewport-edge') paragraph.style.cssText = 'position:fixed;right:8px;bottom:0;margin:0;white-space:nowrap';
      const selection = getSelection(); selection.removeAllRanges();
      if (scenario === 'reverse') selection.setBaseAndExtent(paragraph.firstChild, paragraph.firstChild.length, paragraph.firstChild, 0);
      else { const range = document.createRange(); range.selectNodeContents(paragraph); selection.addRange(range); }
      paragraph.dispatchEvent(new PointerEvent('pointerup', { bubbles:true }));
    }, scenario);
    await until(async () => !await ui('.selection-bubble', 'function(){return this.hidden}'));
    await assertTailPosition(scenario);
    assert.equal(requests.length, before, 'positioning does not send translation requests');
    await sample.keyboard.press('Escape');
    await sample.evaluate(() => {
      const paragraph = document.getElementById('sample');
      paragraph.removeAttribute('style'); paragraph.textContent = 'A little understanding brings us closer.';
    });
  }
  // The trigger is visible within two animation frames, not after a 160ms timer.
  for (const type of ['pointerup', 'keyup']) {
    const visible = await ui('.selection-bubble', `async function(type){
      const paragraph = document.getElementById('sample');
      const range = document.createRange(); range.selectNodeContents(paragraph);
      getSelection().removeAllRanges(); getSelection().addRange(range);
      paragraph.dispatchEvent(type === 'pointerup'
        ? new PointerEvent(type, {bubbles:true})
        : new KeyboardEvent(type, {key:'Shift',bubbles:true}));
      await new Promise(requestAnimationFrame);
      await new Promise(requestAnimationFrame);
      return !this.hidden;
    }`, [type]);
    assert.equal(visible, true, `${type} displays the trigger by the next paint`);
    await sample.keyboard.press('Escape');
  }
  // Dismissal cancels a queued frame rather than allowing the trigger to reappear.
  assert.equal(await ui('.selection-bubble', `async function(){
    const paragraph = document.getElementById('sample');
    paragraph.dispatchEvent(new PointerEvent('pointerup', {bubbles:true}));
    document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape',bubbles:true}));
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return this.hidden;
  }`), true);
  await select(); assert.equal(requests.length, before, 'selection must not send AI request');
  const bubbleStyle = await ui('.selection-bubble', 'function(){const s=getComputedStyle(this);return {width:s.width,height:s.height,fontSize:s.fontSize,fontWeight:s.fontWeight}}');
  assert.deepEqual(bubbleStyle, { width: '28px', height: '28px', fontSize: '14px', fontWeight: '400' });
  assert.deepEqual(await ui('.selection-bubble', 'function(){const svg=this.querySelector("svg");return {text:this.textContent.trim(),icon:!!svg,hidden:svg.getAttribute("aria-hidden"),width:getComputedStyle(svg).width,label:this.getAttribute("aria-label")}}'), {text:'',icon:true,hidden:'true',width:'18px',label:msg('selectionTranslate')});
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-trigger.png'), fullPage: true });
  await new Promise(resolve => setTimeout(resolve, 1200));
  assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), false);
  await new Promise(resolve => setTimeout(resolve, 1500));
  assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), true, 'trigger expires after 2.5 seconds');
  assert.equal(requests.length, before, 'expiration must not request translation');
  await select('First selection');
  await new Promise(resolve => setTimeout(resolve, 1400));
  await select();
  await new Promise(resolve => setTimeout(resolve, 1300));
  assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), false, 'new selection resets lifetime');
  await click('.selection-bubble');
  await until(async () => (await ui('#status')) === msg('complete'));
  await new Promise(resolve => setTimeout(resolve, 2700));
  assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), false, 'trigger timeout must not close the translation panel');
  assert.equal(requests.length, before + 1);
  assert.equal(await ui('#source', 'function(){return this.value}'), 'A little understanding brings us closer.');
  assert.equal(await ui('#result'), '多一点理解，让我们更靠近。');
  assert.equal(await ui('.selection-panel', 'function(){return this.getBoundingClientRect().width}'), 400);
  assert.deepEqual(await ui('.brand-icon', 'function(){const svg=this.querySelector("svg");return {text:this.textContent.trim(),width:Math.round(svg.getBoundingClientRect().width),paths:svg.querySelectorAll("path").length}}'), {text:'',width:28,paths:3});

  assert.equal(await ui('.selection-panel', 'function(){return this.getBoundingClientRect().height <= innerHeight - 16}'), true);
  assert.equal(await ui('.selection-panel', 'function(){return this.scrollHeight===this.clientHeight && this.scrollWidth===this.clientWidth}'), true);
  assert.equal(await sample.locator('[data-transight]').count(), 1);
  // Manual interface language changes synchronize without clearing the translation.
  await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), 'zh-CN');
  await until(async () => (await ui('.translation-view', 'function(){return this.lang}')) === 'zh-CN');
  assert.equal(await ui('#result'), '多一点理解，让我们更靠近。');
  await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), 'zh-TW');
  await until(async () => (await ui('.translation-view', 'function(){return this.lang}')) === 'zh-TW');
  assert.equal(await ui('#translate-label'), '翻譯文字');
  assert.equal(await ui('#result'), '多一点理解，让我们更靠近。');
  assert.equal(await ui('#target', 'function(){return this.value}'), 'zh-CN');
  assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get('uiLanguage')).uiLanguage), 'zh-TW');
  await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), 'en');
  await until(async () => (await ui('.translation-view', 'function(){return this.lang}')) === 'en');
  await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), 'auto');
  await until(async () => (await ui('#status')) === msg('complete'));

  assertSelectStyle(await ui('#target', inspectSelectStyle.toString()));
  await sample.screenshot({ path: path.join(screenshotDir, 'selection.png'), fullPage: true });
  await ui('#target', 'function(){this.value="ja";this.dispatchEvent(new Event("change",{bubbles:true}))}');
  await until(async () => (await ui('#status')) === msg('complete'));
  assert.ok(requests.at(-1).body.messages[0].content.includes('(ja)'));
  await ui('#source', 'function(){this.value="Edited text";this.dispatchEvent(new Event("input",{bubbles:true}))}');
  await click('#translate'); await until(async () => (await ui('#status')) === msg('complete'));
  assert.equal(requests.at(-1).body.messages[1].content, 'Edited text');
  // The shared on-page source accepts clipboard images without clipboard-read permission.
  const beforePaste = requests.length;
  await ui('#source', `async function(){
    const canvas = document.createElement('canvas'); canvas.width = 120; canvas.height = 60;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#268'; ctx.fillRect(0,0,120,60);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const clipboardData = new DataTransfer();
    clipboardData.items.add(new File([blob], 'first.png', {type:'image/png'}));
    clipboardData.items.add(new File([blob], 'second.png', {type:'image/png'}));
    this.dispatchEvent(new ClipboardEvent('paste', {clipboardData, bubbles:true, cancelable:true}));
  }`);
  await until(async () => await ui('#source-images', 'function(){return this.querySelectorAll("img").length}') === 2 &&
    !await ui('#translate', 'function(){return this.disabled}'));
  assert.equal(requests.length, beforePaste, 'pasting in on-page panel does not upload');
  assert.equal(await ui('#source', 'function(){return this.value}'), 'Edited text');
  assert.equal(await ui('.source-thumbnail', 'function(){return this.getBoundingClientRect().width}'), 72);
  const sourceLayout = () => ui('.translation-view', `function(){return (${inspectSourceImageLayout.toString()})(this)}`);
  assertSourceImageLayout(await sourceLayout());
  const deleteStyle = selector => ui(selector, 'function(){const s=getComputedStyle(this);return {cursor:s.cursor,opacity:s.opacity,pointerEvents:s.pointerEvents,width:s.width,height:s.height,background:s.backgroundColor,color:s.color,icon:getComputedStyle(this.querySelector("svg")).width}}');
  await sample.mouse.move(1000, 900);
  const hiddenDelete = {cursor:'default',opacity:'0',pointerEvents:'none',width:'18px',height:'18px',background:'rgb(255, 255, 255)',color:'rgb(17, 17, 17)',icon:'10px'};
  assert.deepEqual(await deleteStyle('.remove-source-image'), hiddenDelete);
  const thumbnailBox = await ui('.source-thumbnail', 'function(){const r=this.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
  await sample.mouse.move(thumbnailBox.x, thumbnailBox.y);
  assert.deepEqual(await deleteStyle('.remove-source-image'), {...hiddenDelete,opacity:'1',pointerEvents:'auto'});
  assert.deepEqual(await deleteStyle('.source-thumbnail:nth-child(2) .remove-source-image'), hiddenDelete, 'hover reveals only the corresponding delete control');
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-image-delete-hover.png'), fullPage: true });
  await sample.mouse.move(1000, 900);
  assert.deepEqual(await deleteStyle('.remove-source-image'), hiddenDelete, 'leaving the image hides the control');
  await ui('#source', 'function(){this.focus()}');
  await sample.keyboard.press('Shift+Tab');
  assert.equal(await ui('.source-thumbnail:last-child .remove-source-image', 'function(){return this.matches(":focus-visible") && getComputedStyle(this).opacity === "1"}'), true, 'keyboard users can reveal and use the delete button');
  await ui('#source', 'function(){this.focus()}');
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-image-thumbnails.png'), fullPage: true });
  await click('#translate'); await until(async () => (await ui('#status')) === msg('complete'));
  const pastedRequest = requests.at(-1).body.messages[1].content;
  assert.equal(pastedRequest.filter(part => part.type === 'image_url').length, 2);
  assert.ok(pastedRequest[0].text.includes('Edited text'));
  await click('.remove-source-image');
  assert.equal(await ui('#source-images', 'function(){return this.querySelectorAll("img").length}'), 1);
  await click('#translate'); await until(async () => (await ui('#status')) === msg('complete'));
  assert.equal(requests.at(-1).body.messages[1].content.filter(part => part.type === 'image_url').length, 1);
  await click('.remove-source-image');
  assert.equal(await ui('#source-image-wrap', 'function(){return this.hidden}'), true);
  assertSourceImageLayout(await sourceLayout(), false);
  assert.equal(await ui('#source', 'function(){return this.value}'), 'Edited text');
  // Overflow stays within the thumbnail strip, not the floating panel.
  await ui('#source', `async function(){
    const canvas = document.createElement('canvas'); canvas.width = 40; canvas.height = 30;
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const clipboardData = new DataTransfer();
    for(let i=0;i<5;i++) clipboardData.items.add(new File([blob], i+'.png', {type:'image/png'}));
    this.dispatchEvent(new ClipboardEvent('paste', {clipboardData, bubbles:true, cancelable:true}));
  }`);
  await until(async () => await ui('#source-images', 'function(){return this.querySelectorAll("img").length}') === 5 &&
    !await ui('#translate', 'function(){return this.disabled}'));
  const stripLayout = await sourceLayout(); assertSourceImageLayout(stripLayout);
  assert.ok(stripLayout.scrollWidth > stripLayout.clientWidth);
  assert.equal(await ui('#source-images', 'function(){this.scrollLeft=this.scrollWidth;return this.scrollLeft>0 && this.lastElementChild.getBoundingClientRect().right<=this.getBoundingClientRect().right}'), true);
  assertSourceImageLayout(await sourceLayout());
  assert.equal(await ui('.selection-panel', 'function(){return this.scrollWidth===this.clientWidth}'), true);
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-image-strip.png'), fullPage: true });
  console.log('✓ On-page image paste: two thumbnails, no upload until translate, combined text/image request, individual removal');
  await click('#close-view'); assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), true);
  await select(); await click('.selection-bubble'); await until(async () => (await ui('#status')) === msg('complete'));
  await sample.keyboard.press('Escape'); assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), true);
  await select(); await click('.selection-bubble'); await until(async () => (await ui('#status')) === msg('complete'));
  await sample.mouse.click(1000, 900); assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), true);
  await pinSmoke({ worker, sample, ui, until, click, select, requests, screenshotDir, msg });
  const beforeLongSelection = requests.length;
  await select('x'.repeat(12001)); await click('.selection-bubble');
  await until(async () => (await ui('#status')) === msg('selectionTooLong'));
  assert.equal(requests.length, beforeLongSelection, 'oversized selection is not sent');
  await click('#close-view');
  // Cancellation/late results may not re-open a dismissed panel or overwrite a replacement.
  setMode('slow'); await select('Old request'); await click('.selection-bubble');
  await until(async () => requests.at(-1).body.messages[1].content === 'Old request');
  await click('#close-view');
  setMode('success'); await select('Newest request'); await click('.selection-bubble');
  await until(async () => (await ui('#status')) === msg('complete'));
  await new Promise(resolve => setTimeout(resolve, 700));
  assert.equal(await ui('#source', 'function(){return this.value}'), 'Newest request');
  assert.equal(await ui('#result'), '多一点理解，让我们更靠近。');
  // Keep the same panel inside a narrow viewport with a scrollable height.
  await sample.setViewportSize({ width: 375, height: 480 });
  await until(async () => await ui('.selection-panel', 'function(){const r=this.getBoundingClientRect();return r.right<=375 && r.bottom<=480}'));
  const box = await ui('.selection-panel', 'function(){const r=this.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,scroll:this.scrollWidth,width:this.clientWidth}}');
  assert.ok(box.x >= 0 && box.y >= 0 && box.right <= 375 && box.bottom <= 480, JSON.stringify(box));
  assert.equal(box.scroll, box.width);
  await click('#close-view'); await sample.setViewportSize({ width: 1120, height: 980 });
  // Input fields (including passwords) and editable page regions are ignored.
  const count = requests.length;
  await sample.evaluate(() => {
    const editor = document.createElement('div'); editor.contentEditable = 'true'; editor.textContent = 'Private editable text'; document.body.append(editor); editor.focus();
    const range = document.createRange(); range.selectNodeContents(editor); getSelection().removeAllRanges(); getSelection().addRange(range);
    editor.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await new Promise(resolve => setTimeout(resolve, 250));
  assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), true); assert.equal(requests.length, count);
  // Full page navigation should run the registered script without another popup click.
  await sample.reload(); await sample.waitForSelector('[data-transight]', { state: 'attached' });
  await select(); assert.equal(requests.length, count);
  const safe = await worker.evaluate(async tabId => (await chrome.scripting.executeScript({ target: { tabId }, func: () => chrome.runtime.sendMessage({ type: 'SELECTION_INIT' }) }))[0].result, tabId);
  assert.equal(safe.ok, true); assert.equal('apiKey' in safe.settings, false); assert.equal('baseUrl' in safe.settings, false);
  assert.equal(JSON.stringify(safe).includes('local-test-key'), false);
  // A second hostname is also enabled automatically, with no permission mutation.
  const other = await context.newPage();
  await other.goto(sample.url().replace('127.0.0.1', 'localhost'));
  await other.waitForSelector('[data-transight]', { state: 'attached' });
  assert.equal(await other.locator('[data-transight]').count(), 1);
  assert.equal(requests.length, count);
  await other.close();
  assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get('selectionOrigins')).selectionOrigins), undefined);
  // Every surface shares one persisted target without saving provider settings.
  const popup = await context.newPage(), options = await context.newPage();
  const extensionOrigin = `chrome-extension://${new URL(worker.url()).host}`;
  const storedBefore = await worker.evaluate(() => chrome.storage.local.get(['settings', 'credentialVault', 'targetLanguagePreference']));
  try {
    await popup.goto(`${extensionOrigin}/src/popup/popup.html`);
    await popup.locator('#target option[value="ja"]').waitFor({ state: 'attached' });
    await options.goto(`${extensionOrigin}/src/options/options.html`);
    await options.locator('#save:enabled').waitFor();
    await options.locator('#model').fill('unsaved-model-draft');
    await options.locator('#api-key').fill('unsaved-key-draft');
    await select('Remember the target'); await click('.selection-bubble');
    await until(async () => (await ui('#status')) === msg('complete'));
    await popup.locator('#target').selectOption('ko');
    await until(async () => (await ui('#target', 'function(){return this.value}')) === 'ko');
    await options.waitForFunction(() => document.querySelector('#target-language').value === 'ko');
    assert.equal(await options.locator('#model').inputValue(), 'unsaved-model-draft');
    assert.equal(await options.locator('#api-key').inputValue(), 'unsaved-key-draft');
    await ui('#target', 'function(){this.value="ja";this.dispatchEvent(new Event("change",{bubbles:true}))}');
    await until(async () => (await ui('#status')) === msg('complete'));
    await popup.waitForFunction(() => document.querySelector('#target').value === 'ja');
    await options.waitForFunction(() => document.querySelector('#target-language').value === 'ja');
    assert.ok(requests.at(-1).body.messages[0].content.includes('(ja)'));
    await options.locator('#target-language').selectOption('fr');
    await popup.waitForFunction(() => document.querySelector('#target').value === 'fr');
    await until(async () => (await ui('#target', 'function(){return this.value}')) === 'fr');
    await popup.reload();
    await popup.waitForFunction(() => document.querySelector('#target').value === 'fr');
    await options.reload();
    await options.waitForFunction(() => document.querySelector('#target-language').value === 'fr');
    await click('#close-view'); await select('Reopen with remembered target'); await click('.selection-bubble');
    await until(async () => (await ui('#status')) === msg('complete'));
    assert.equal(await ui('#target', 'function(){return this.value}'), 'fr');
    assert.ok(requests.at(-1).body.messages[0].content.includes('(fr)'));
    const storedAfter = await worker.evaluate(() => chrome.storage.local.get(['settings', 'credentialVault']));
    assert.deepEqual(storedAfter.settings, storedBefore.settings);
    assert.deepEqual(storedAfter.credentialVault, storedBefore.credentialVault);
    // Explicit cancel leaves the panel open and ignores a delayed server response.
    setMode('slow');
    await ui('#source', 'function(){this.value="Cancel this translation";this.dispatchEvent(new Event("input",{bubbles:true}))}');
    const beforeCancel = requests.length;
    await click('#translate');
    await until(async () => requests.length > beforeCancel);
    assert.equal(await ui('#cancel-translation', 'function(){return this.hidden}'), false);
    await click('#cancel-translation');
    assert.equal(await ui('#status'), msg('translationCancelled'));
    assert.equal(await ui('#cancel-translation', 'function(){return this.hidden}'), true);
    assert.equal(await ui('#source', 'function(){return this.disabled}'), false);
    await new Promise(resolve => setTimeout(resolve, 750));
    assert.equal(await ui('#result-card', 'function(){return this.dataset.state}'), 'cancelled');
    setMode('success'); await click('#translate');
    await until(async () => (await ui('#status')) === msg('complete'));
    await click('#close-view');
  } finally {
    setMode('success'); await popup.close(); await options.close();
    await worker.evaluate(async value => {
      if (value === undefined) await chrome.storage.local.remove('targetLanguagePreference');
      else await chrome.storage.local.set({ targetLanguagePreference: value });
    }, storedBefore.targetLanguagePreference);
  }
  console.log('✓ Remembered target: popup/page/options live sync, reopen persistence, draft and credential isolation; explicit floating cancel and retranslate');
  setMode('unauthorized');
  await select('Authentication link in selection'); await click('.selection-bubble');
  await until(async () => (await ui('#status')) === msg('http401') + msg('authSettingsPrompt'));
  assert.equal(await ui('#result-card .settings-link'), msg('configureApiKey'));
  const openedSettings = context.waitForEvent('page');
  await click('#status .settings-link');
  const authOptions = await openedSettings;
  await authOptions.waitForURL('**/src/options/options.html');
  await authOptions.locator('#save:enabled').waitFor();
  await authOptions.close();
  setMode('success'); await click('#close-view');
  console.log('✓ Selection authentication settings link opens extension settings');
  // Settings apply without reloading open webpages and without editing provider credentials.
  const preferenceOptions = await context.newPage();
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const preferenceBefore = await worker.evaluate(() => chrome.storage.local.get(['settings', 'selectionEnabled', 'credentialVault']));
  try {
    await preferenceOptions.goto(`${origin}/src/options/options.html`);
    await preferenceOptions.locator('#save:enabled').waitFor();
    assert.equal(await preferenceOptions.locator('#selection-enabled').isChecked(), true);
    await select('Toggle selection translation');
    await until(async () => (await ui('.selection-bubble', 'function(){return this.hidden}')) === false);
    await preferenceOptions.locator('#selection-enabled').uncheck();
    await until(async () => (await ui('.selection-bubble', 'function(){return this.hidden}')) === true);
    await select('Disabled selection', false);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), true);
    await preferenceOptions.reload();
    await preferenceOptions.locator('#save:enabled').waitFor();
    assert.equal(await preferenceOptions.locator('#selection-enabled').isChecked(), false);
    await sample.reload();
    await sample.waitForSelector('[data-transight="selection"]', { state: 'attached' });
    await select('Disabled after reload', false);
    await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), true);
    // Explicit right-click translation is still allowed when the automatic trigger is off.
    const opened = await worker.evaluate(tabId => chrome.tabs.sendMessage(tabId, { type: 'SELECTION_OPEN', text: 'Explicit translation' }, { frameId: 0 }), tabId);
    assert.equal(opened.ok, true);
    await until(async () => (await ui('#status')) === msg('complete'));
    const originalTarget = await ui('#target', 'function(){return this.value}');
    await ui('#target', 'function(){this.value="de";this.dispatchEvent(new Event("change",{bubbles:true}))}');
    await until(async () => (await ui('#status')) === msg('complete'));
    assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), false);
    await ui('#target', 'function(value){this.value=value;this.dispatchEvent(new Event("change",{bubbles:true}))}', [originalTarget]);
    await until(async () => (await ui('#status')) === msg('complete'));
    await click('#close-view');
    await preferenceOptions.locator('#selection-enabled').check();
    await until(async () => (await worker.evaluate(() => chrome.storage.local.get('selectionEnabled'))).selectionEnabled === true);
    const template = 'TEST Translate {{from}} to {{to}}. {{title_prompt}} {{summary_prompt}} {{terms_prompt}} {{imt_style_guide}}';
    await preferenceOptions.locator('#system-prompt').fill(template);
    await preferenceOptions.locator('#save').click();
    await preferenceOptions.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('saved'));
    await preferenceOptions.reload();
    await preferenceOptions.locator('#save:enabled').waitFor();
    assert.equal(await preferenceOptions.locator('#system-prompt').inputValue(), template);
    await sample.evaluate(() => {
      document.title = 'Template context title';
      const meta = document.createElement('meta'); meta.name = 'description'; meta.content = 'Existing metadata summary'; document.head.append(meta);
    });
    await select('Use custom prompt'); await click('.selection-bubble');
    await until(async () => (await ui('#status')) === msg('complete'));
    const system = requests.at(-1).body.messages[0];
    assert.equal(system.role, 'system');
    assert.ok(system.content.startsWith('TEST Translate Automatically detect'));
    assert.ok(system.content.includes('Template context title'));
    assert.ok(system.content.includes('Existing metadata summary'));
    assert.equal(system.content.includes('{{'), false);
    await preferenceOptions.locator('#selection-enabled').uncheck();
    await until(async () => (await ui('.selection-panel', 'function(){return this.hidden}')) === true);
    await preferenceOptions.locator('#selection-enabled').check();
    await page.locator('#source').fill('Manual toolbar translation');
    await page.locator('#translate').click();
    await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('complete'));
    assert.ok(requests.at(-1).body.messages[0].content.startsWith('TEST Translate'));
    assert.equal(requests.at(-1).body.messages[0].content.includes('Template context title'), false);
    await preferenceOptions.locator('#reset-prompt').click();
    assert.ok((await preferenceOptions.locator('#system-prompt').inputValue()).startsWith('You are a professional {{to}} native translator'));
    assert.equal((await worker.evaluate(() => chrome.storage.local.get('settings'))).settings.systemPrompt, template, 'reset remains a draft until saved');
    await preferenceOptions.locator('#save').click();
    await preferenceOptions.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('saved'));
    const after = await worker.evaluate(() => chrome.storage.local.get(['settings', 'credentialVault']));
    assert.ok(after.settings.systemPrompt.startsWith('You are a professional {{to}}'));
    assert.deepEqual(after.credentialVault, preferenceBefore.credentialVault);
    await preferenceOptions.screenshot({ path: path.join(screenshotDir, 'settings-preferences.png'), fullPage: true });
  } finally {
    await preferenceOptions.close();
    await worker.evaluate(async previous => {
      await chrome.storage.local.set({ settings: previous.settings });
      if (previous.selectionEnabled === undefined) await chrome.storage.local.remove('selectionEnabled');
      else await chrome.storage.local.set({ selectionEnabled: previous.selectionEnabled });
    }, preferenceBefore);
  }
  console.log('✓ Selection toggle: live hide, reload persistence, manual translation unaffected; custom prompt save/reload, popup/page requests, title/summary variables, restore default and credential isolation');
  await simpleModeSmoke({ context, worker, sample, ui, until, click, select, requests, screenshotDir, msg, setMode });
  await session.detach();
  console.log('✓ Selection: automatic all-site injection, shared popup, selection-tail positioning (pointer, reverse, multiline, nested and viewport edges), next-paint pointer/keyboard trigger, compact trigger and 2.5s expiry/reset, no request on selection, editing/target, close/Esc/outside, cancellation, narrow screen, editable exclusion, persisted injection, second hostname, credential isolation');
}
