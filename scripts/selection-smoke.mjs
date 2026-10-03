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
  async function select(text = 'A little understanding brings us closer.') {
    await sample.evaluate(text => {
      const paragraph = document.getElementById('sample'); paragraph.textContent = text;
      const range = document.createRange(); range.selectNodeContents(paragraph);
      getSelection().removeAllRanges(); getSelection().addRange(range);
      paragraph.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    }, text);
    await until(async () => !await ui('.selection-bubble', 'function(){return this.hidden}'));
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
  await click('#ui-language'); await click('[data-language="zh-CN"]');
  await until(async () => (await ui('.translation-view', 'function(){return this.lang}')) === 'zh-CN');
  assert.equal(await ui('#result'), '多一点理解，让我们更靠近。');
  await click('#ui-language'); await click('[data-language="zh-TW"]');
  await until(async () => (await ui('.translation-view', 'function(){return this.lang}')) === 'zh-TW');
  assert.equal(await ui('#translate-label'), '翻譯文字');
  assert.equal(await ui('#result'), '多一点理解，让我们更靠近。');
  assert.equal(await ui('#target', 'function(){return this.value}'), 'zh-CN');
  assert.equal(await worker.evaluate(async () => (await chrome.storage.local.get('uiLanguage')).uiLanguage), 'zh-TW');
  await click('#ui-language'); await click('[data-language="en"]');
  await until(async () => (await ui('.translation-view', 'function(){return this.lang}')) === 'en');
  await click('#ui-language'); await click('[data-language="auto"]');
  await until(async () => (await ui('#status')) === msg('complete'));

  assertSelectStyle(await ui('#target', inspectSelectStyle.toString()));
  await sample.screenshot({ path: path.join(screenshotDir, 'selection.png'), fullPage: true });
  await ui('#target', 'function(){this.value="ja";this.dispatchEvent(new Event("change",{bubbles:true}))}');
  await until(async () => (await ui('#status')) === msg('complete'));
  assert.ok(requests.at(-1).body.messages[0].content.includes('(ja)'));
  await ui('#source', 'function(){this.value="Edited text";this.dispatchEvent(new Event("input",{bubbles:true}))}');
  await click('#translate'); await until(async () => (await ui('#status')) === msg('complete'));
  assert.equal(requests.at(-1).body.messages[1].content, 'Edited text');
  await click('#close-view'); assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), true);
  await select(); await click('.selection-bubble'); await until(async () => (await ui('#status')) === msg('complete'));
  await sample.keyboard.press('Escape'); assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), true);
  await select(); await click('.selection-bubble'); await until(async () => (await ui('#status')) === msg('complete'));
  await sample.mouse.click(1000, 900); assert.equal(await ui('.selection-panel', 'function(){return this.hidden}'), true);
  await pinSmoke({ sample, ui, until, click, select, requests, screenshotDir, msg });
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
  await session.detach();
  console.log('✓ Selection: automatic all-site injection, shared popup, selection-tail positioning (pointer, reverse, multiline, nested and viewport edges), next-paint pointer/keyboard trigger, compact trigger and 2.5s expiry/reset, no request on selection, editing/target, close/Esc/outside, cancellation, narrow screen, editable exclusion, persisted injection, second hostname, credential isolation');
}
