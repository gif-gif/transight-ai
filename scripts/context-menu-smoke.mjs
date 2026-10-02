import { openContextTranslation } from '../src/shared/context-menu.js';
import assert from 'node:assert/strict';
import path from 'node:path';

export async function contextMenuSmoke({ context, worker, sample, tabId, requests, screenshotDir, msg, modelBehaviors, setMode }) {
  setMode('success'); modelBehaviors.clear();
  const previous = await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings);
  const session = await context.newCDPSession(sample);
  async function ui(fn, args = []) {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) {
      if (node.attributes?.includes('data-transight')) return node;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) { const match = find(child); if (match) return match; }
    }
    const host = find(root); assert.ok(host, 'shared floating host exists');
    const { object } = await session.send('DOM.resolveNode', { nodeId: host.shadowRoots[0].nodeId });
    try {
      const { result, exceptionDetails } = await session.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: fn, arguments: args.map(value => ({ value })), returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw Error(JSON.stringify(exceptionDetails));
      return result.value;
    } finally { await session.send('Runtime.releaseObject', { objectId: object.objectId }); }
  }
  async function until(fn, label = 'shared context view') {
    for (let i = 0; i < 120; i++) { if (await fn()) return; await sample.waitForTimeout(50); }
    throw Error(`${label}: timed out`);
  }
  async function click(selector) {
    const point = await ui('function(selector){const e=this.querySelector(selector);e.scrollIntoView({block:"center"});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}', [selector]);
    await sample.mouse.click(point.x, point.y);
  }
  async function configure(models) {
    await worker.evaluate(async models => { const { settings } = await chrome.storage.local.get('settings'); await chrome.storage.local.set({ settings: { ...settings, model: models[0], models } }); }, models);
  }
  async function open(text, frameId = 0) {
    const windowCount = (await context.pages()).length;
    await worker.evaluate(async ({ text, tabId, frameId, handler }) => {
      // MV3 workers forbid dynamic import. Execute the exported handler in
      // the test worker without exposing a production test hook.
      const openContextTranslation = (0, eval)(`(${handler})`);
      await openContextTranslation({ menuItemId: 'yijian-translate', selectionText: text, frameId }, { id: tabId });
    }, { text, tabId, frameId, handler: openContextTranslation.toString() });
    assert.equal(context.pages().length, windowCount, 'ordinary pages do not fall back to a separate window');
  }
  async function success(count) {
    await until(() => ui('function(count){return this.querySelectorAll(".result-card[data-state=success]").length===count}', [count]));
  }
  async function layout() {
    return ui('function(){const p=this.querySelector(".selection-panel"),r=p.getBoundingClientRect(),cards=[...this.querySelectorAll(".result-card")].map(c=>{const b=c.getBoundingClientRect();return {top:b.top,bottom:b.bottom}});return {width:r.width,height:r.height,top:r.top,bottom:r.bottom,right:r.right,scroll:p.scrollTop,cap:p.style.getPropertyValue("--panel-max-height"),overflow:p.scrollHeight>p.clientHeight,horizontal:p.scrollWidth>p.clientWidth,headerBottom:this.querySelector(".topbar").getBoundingClientRect().bottom,cards}}');
  }
  try {
    await configure(['mock-translator']);
    const literal = '<img src=x onerror=alert(1)> 多一点理解，让我们更靠近。';
    modelBehaviors.set('mock-translator', { text: literal });
    const before = requests.length;
    await open('Right-click selected text'); await success(1);
    assert.equal(requests.length, before + 1, 'one right-click creates one translation, not two pipelines');
    assert.equal(await ui('function(){return this.querySelector("#source").value}'), 'Right-click selected text');
    assert.equal(await ui('function(){return this.querySelector(".result").textContent}'), literal);
    assert.equal(await ui('function(){return this.querySelectorAll("img").length}'), 0, 'provider markup remains plain text');
    assert.equal(await sample.locator('[data-transight]').count(), 1);
    const single = await layout(); assert.equal(single.width, 400); assert.equal(single.overflow, false); assert.equal(single.cap, "");
    assert.ok(single.cards[0].bottom <= single.bottom);
    const tree = await session.send('Accessibility.getFullAXTree');
    assert.ok(tree.nodes.some(node => node.role?.value === 'dialog' && node.name?.value === msg('panelLabel')));
    for (const selector of ['#source', '#target', '#translate', '#pin-view', '#settings', '#ui-language', '#close-view']) {
      assert.equal(await ui('function(selector){return !!this.querySelector(selector)}', [selector]), true);
    }
    await click('.copy-result');
    await until(() => ui('function(){return this.querySelector(".copy-result").dataset.copied==="true"}'));
    await until(() => ui('function(){return this.querySelector(".copy-result").dataset.copied==="false"}'));
    await click('#ui-language'); await click('[data-language="en"]');
    await until(() => ui('function(){return this.querySelector(".translation-view").lang==="en"}'));
    assert.equal(await ui('function(){return this.querySelector(".result").textContent}'), literal);
    await click('#ui-language'); await click('[data-language="auto"]');
    await until(() => ui('function(expected){return this.querySelector("#status").textContent===expected}', [msg('complete')]));
    await ui('function(){this.querySelector(".selection-panel").scrollTop=0}');
    await sample.screenshot({ path: path.join(screenshotDir, 'panel.png'), fullPage: true });
    modelBehaviors.clear();

    // Editing and target changes use exactly the same controller as selection translation.
    await ui('function(){const s=this.querySelector("#source");s.value="Edited context source";s.dispatchEvent(new Event("input",{bubbles:true}));const t=this.querySelector("#target");t.value="ja";t.dispatchEvent(new Event("change",{bubbles:true}))}');
    await success(1);
    assert.equal(requests.at(-1).body.messages[1].content, 'Edited context source');
    assert.ok(requests.at(-1).body.messages[0].content.includes('(ja)'));
    await click('#pin-view');
    await open('Explicit right-click replaces even a pinned result'); await success(1);
    assert.equal(await ui('function(){return this.querySelector("#source").value}'), 'Explicit right-click replaces even a pinned result');
    assert.equal(await sample.locator('[data-transight]').count(), 1);

    await configure(['mock-translator', 'z-model']);
    await open('Two models adapt to content'); await success(2);
    const two = await layout();
    assert.equal(two.overflow, false); assert.equal(two.cap, '');
    assert.ok(two.cards[1].bottom <= two.bottom && two.height > single.height);
    // One and two models grow with content, then shrink again without a fixed cap.
    for (const count of [1, 2]) {
      await configure(['mock-translator', 'z-model'].slice(0, count));
      await open('Adaptive content height'); await success(count);
      const short = await layout();
      modelBehaviors.set('mock-translator', { text: 'Longer translation line.\n'.repeat(30) });
      await open('Adaptive content height'); await success(count);
      await until(async () => (await layout()).height > short.height, `${count} model height grows`);
      const long = await layout();
      assert.equal(long.overflow, false); assert.equal(long.cap, '');
      assert.ok(long.cards[count - 1].bottom <= long.bottom);
      modelBehaviors.clear();
      await open('Adaptive content height'); await success(count);
      await until(async () => Math.abs((await layout()).height - short.height) < 1, `${count} model height shrinks`);
    }
    await configure(['mock-translator', 'z-model', 'third-model']);
    await open('Three models, two visible results'); await success(3);
    await until(async () => { const b = await layout(); return b.cap && Math.abs(b.bottom - b.cards[1].bottom - 12) <= 1; }, 'two-card height');
    let box = await layout();
    assert.equal(box.width, 400); assert.equal(box.horizontal, false); assert.equal(box.overflow, true);
    assert.ok(box.cards[0].top >= box.headerBottom && box.cards[1].bottom <= box.bottom, JSON.stringify(box));
    assert.ok(box.cards[2].bottom > box.bottom, 'third card requires scrolling');
    assert.ok(Math.abs(box.bottom - box.cards[1].bottom - 12) <= 1, `height follows exactly two cards, without a fixed minimum: ${JSON.stringify(box)}`);
    await sample.screenshot({ path: path.join(screenshotDir, 'context-multi.png'), fullPage: true });
    const shortHeight = box.height;
    // Delayed, longer results must resize the cap even when the outer panel was already capped.
    modelBehaviors.set('z-model', { text: 'Longer translation line.\n'.repeat(30) });
    await open('Longer second model'); await success(3);
    await until(async () => (await layout()).height > shortHeight);
    box = await layout(); assert.ok(box.cards[1].bottom <= box.bottom, 'second long card stays visible within the available viewport');
    modelBehaviors.clear();

    await configure(['mock-translator', 'z-model', 'third-model', 'fourth-model', 'fifth-model']);
    modelBehaviors.set('third-model', { status: 500 });
    await open('Five models with independent retry');
    await until(() => ui('function(){return this.querySelectorAll(".result-card[data-state=success]").length===4 && this.querySelectorAll(".result-card[data-state=error]").length===1}'));
    modelBehaviors.clear();
    const retryBefore = requests.length;
    await click('.result-card[data-model="third-model"] .retry-result'); await success(5);
    assert.equal(requests.length, retryBefore + 1); assert.equal(requests.at(-1).body.model, 'third-model');
    await click('.result-card:last-child .copy-result');
    await until(() => ui('function(){return this.querySelector(".result-card:last-child .copy-result").dataset.copied==="true"}'));
    box = await layout(); assert.ok(box.scroll > 0 && box.headerBottom < box.bottom);
    await click('#pin-view');
    const point = await ui('function(){const r=this.querySelector(".topbar").getBoundingClientRect();return {x:r.x+24,y:r.y+24}}');
    await sample.mouse.move(point.x, point.y); await sample.mouse.down();
    await sample.mouse.move(point.x - 60, point.y + 10, { steps: 6 }); await sample.mouse.up();
    const moved = await layout(); assert.ok(moved.right < box.right - 50, 'context view has the same draggable pin behavior');
    await configure(['mock-translator']);
    await until(async () => { const b = await layout(); return b.cards.length === 1 && !b.cap && !b.overflow; }, 'live model-count reduction returns to adaptive height');
    await click('#close-view');

    // The normal selection entry also receives the larger two-card viewport.
    await configure(['mock-translator', 'z-model', 'third-model']);
    await sample.evaluate(() => {
      const p = document.getElementById('sample'); p.textContent = 'Three-model selection comparison';
      const r = document.createRange(); r.selectNodeContents(p); getSelection().removeAllRanges(); getSelection().addRange(r);
      p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    });
    await until(() => ui('function(){return !this.querySelector(".selection-bubble").hidden}'));
    await click('.selection-bubble'); await success(3);
    await until(async () => { const b = await layout(); return b.cap && b.cards[1].bottom <= b.bottom; });
    box = await layout(); assert.ok(box.cards[1].bottom <= box.bottom);
    await sample.screenshot({ path: path.join(screenshotDir, 'selection-many.png'), fullPage: true });
    await sample.setViewportSize({ width: 375, height: 480 });
    await until(async () => { const b = await layout(); return b.right <= 367 && b.bottom <= 472 && b.height <= 464 && !b.horizontal; });
    await click('.result-card:last-child .copy-result');
    await click('#close-view');
    await sample.setViewportSize({ width: 1120, height: 980 });
    await sample.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));

    // Closing/reopening a context request cancels the batch and rejects late replies.
    let release;
    modelBehaviors.set('third-model', { wait: new Promise(resolve => { release = resolve; }) });
    const oldBefore = requests.length;
    await open('Old context request'); await until(async () => requests.length === oldBefore + 3);
    await click('#close-view'); modelBehaviors.clear();
    await open('New context request'); await success(3); release();
    await sample.waitForTimeout(100);
    assert.equal(await ui('function(){return this.querySelector("#source").value}'), 'New context request');
    await sample.keyboard.press('Escape');
    assert.equal(await ui('function(){return this.querySelector(".selection-panel").hidden}'), true);

    // Context menus also target an explicitly selected ordinary iframe, without enabling automatic iframe injection.
    await configure(['mock-translator']);
    await sample.evaluate(() => { const f=document.createElement('iframe');f.src=location.href+'?frame=1';document.body.append(f); });
    await until(async () => sample.frames().some(frame => frame.url().endsWith('?frame=1')));
    const frames = await worker.evaluate(async tabId => chrome.scripting.executeScript({ target: { tabId, allFrames: true }, func: () => location.href }), tabId);
    const frameId = frames.find(frame => frame.result.endsWith('?frame=1')).frameId;
    const frameBefore = requests.length;
    await open('Translate iframe selection', frameId);
    await until(async () => requests.length === frameBefore + 1);
    assert.equal(requests.at(-1).body.messages[1].content, 'Translate iframe selection');
    const frame = sample.frames().find(frame => frame.url().endsWith('?frame=1'));
    assert.equal(await frame.locator('[data-transight]').count(), 1);
    assert.equal(await ui('function(){return this.querySelector(".selection-panel").hidden}'), true, 'iframe context does not open a second top-frame window');
    await frame.evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    await sample.evaluate(() => document.querySelector('iframe').remove());
    console.log('✓ Shared context view: same source/target, locale/copy/pin/drag/retry, safe text, replacement/cancellation, iframe; 1/2 models adaptive, 3/5 models fit first two, long-result resizing, live count changes, narrow viewport scrolling');
  } finally {
    modelBehaviors.clear();
    await worker.evaluate(async settings => chrome.storage.local.set({ settings }), previous);
    await session.detach();
  }
}
