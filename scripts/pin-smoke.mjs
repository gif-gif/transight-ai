import assert from 'node:assert/strict';
import path from 'node:path';

export async function pinSmoke({ worker, sample, ui, until, click, select, requests, screenshotDir, msg }) {
  const hidden = () => ui('.selection-panel', 'function(){return this.hidden}');
  const position = () => ui('.selection-panel', 'function(){const r=this.getBoundingClientRect();return {x:r.x,y:r.y}}');
  await select('Keep this translation'); await click('.selection-bubble');
  await until(async () => (await ui('#status')) === msg('complete'));
  assert.equal(await ui('#pin-view', 'function(){return this.getAttribute("aria-pressed")}'), 'false');
  await click('#pin-view');
  assert.equal(await ui('#pin-view', 'function(){return this.getAttribute("aria-pressed")}'), 'true');
  assert.equal(await ui('#pin-view', 'function(){return this.title}'), msg('unpinTranslation'));
  const count = requests.length;
  await sample.mouse.click(1000, 900);
  assert.equal(await hidden(), false, 'pinned panel survives outside clicks');
  await sample.evaluate(() => {
    const p = document.getElementById('sample'); p.textContent = 'Do not replace a pinned translation';
    const range = document.createRange(); range.selectNodeContents(p); getSelection().removeAllRanges(); getSelection().addRange(range);
    p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
  });
  await sample.evaluate(() => new Promise(requestAnimationFrame));
  assert.equal(await ui('.selection-bubble', 'function(){return this.hidden}'), true);
  assert.equal(await ui('#source', 'function(){return this.value}'), 'Keep this translation');
  assert.equal(requests.length, count);
  const before = await position();
  const point = await ui('.topbar', 'function(){const r=this.getBoundingClientRect();return {x:r.x+30,y:r.y+24}}');
  await sample.mouse.move(point.x, point.y); await sample.mouse.down();
  await sample.mouse.move(point.x + 140, point.y + 60, { steps: 8 }); await sample.mouse.up();
  const moved = await position();
  assert.ok(Math.abs(moved.x - before.x - 140) < 1, JSON.stringify({ before, moved }));
  assert.ok(Math.abs(moved.y - before.y - 60) < 1, JSON.stringify({ before, moved }));
  assert.equal(await ui('.selection-panel', 'function(){return this.dataset.dragging}'), undefined);
  // Keyboard movement is available on the focused header, not its child controls.
  await ui('.topbar', 'function(){this.focus()}'); await sample.keyboard.press('ArrowRight');
  assert.equal((await position()).x, moved.x + 10);
  const anchored = await position();
  await sample.evaluate(() => { document.body.style.minHeight = '2000px'; window.scrollTo(0, 180); });
  assert.deepEqual(await position(), anchored, 'page scroll cannot dislodge the pinned panel');
  await sample.evaluate(() => { window.scrollTo(0, 0); document.body.style.removeProperty('min-height'); });
  // Resizing source or replacing results must not snap back to the selection.
  await ui('#source', 'function(){this.style.height="110px"}');
  await click('#translate'); await until(async () => (await ui('#status')) === msg('complete'));
  assert.deepEqual(await position(), anchored);
  await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), 'en');
  await until(async () => (await ui('#pin-view', 'function(){return this.title}')) === 'Unpin translation window');
  await worker.evaluate(uiLanguage => chrome.storage.local.set({ uiLanguage }), 'auto');
  await until(async () => (await ui('#pin-view', 'function(){return this.title}')) === msg('unpinTranslation'));
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-pinned.png'), fullPage: true });
  await sample.setViewportSize({ width: 375, height: 480 });
  await until(async () => await ui('.selection-panel', 'function(){const r=this.getBoundingClientRect();return r.x>=8 && r.y>=8 && r.right<=367 && r.bottom<=472 && this.scrollWidth===this.clientWidth}'));
  await ui('.selection-panel', 'function(){this.scrollTop=this.scrollHeight}');
  assert.equal(await ui('.topbar', 'function(){const r=this.getBoundingClientRect();return r.top>=8 && r.bottom<480}'), true, 'drag handle stays visible when the panel scrolls');
  await click('#close-view'); assert.equal(await hidden(), true);
  await sample.setViewportSize({ width: 1120, height: 980 });
  // Let resize/scroll dismissal finish before beginning a fresh selection.
  await sample.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await select(); await click('.selection-bubble'); await until(async () => (await ui('#status')) === msg('complete'));
  assert.equal(await ui('#pin-view', 'function(){return this.getAttribute("aria-pressed")}'), 'false', 'pinning is not persisted to the next panel');
  await click('#pin-view'); await click('#pin-view');
  await sample.mouse.click(1000, 900); assert.equal(await hidden(), true, 'unpinning restores outside-click dismissal');
  await select(); await click('.selection-bubble'); await until(async () => (await ui('#status')) === msg('complete'));
  await click('#pin-view'); await sample.keyboard.press('Escape'); assert.equal(await hidden(), true);
  console.log('✓ Pin: outside-click persistence, selection preservation, header drag, keyboard move, scroll/resize clamping, sticky header, localized toggle, close/Esc, per-panel reset');
}
