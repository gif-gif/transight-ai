import assert from 'node:assert/strict';
import path from 'node:path';

export async function multiModelSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, modelBehaviors, setMode }) {
  setMode('success');
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  await page.setViewportSize({ width: 1120, height: 980 });
  await page.goto(`${origin}/src/options/options.html`);
  await page.locator('#save:enabled').waitFor();
  await page.locator('#fetch-models').click();
  await page.locator('#model-list-field:visible').waitFor();
  await page.locator('#model-list input[value="z-model"]').check();
  assert.equal(await page.locator('#model').inputValue(), 'mock-translator, z-model');
  await page.locator('#model-list input[value="mock-translator"]').uncheck();
  assert.equal(await page.locator('#model').inputValue(), 'z-model');
  await page.locator('#model').fill('mock-translator, z-model, mock-translator');
  await page.locator('#save').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('saved'));
  assert.deepEqual(await worker.evaluate(async () => (await chrome.storage.local.get('settings')).settings.models), ['mock-translator', 'z-model']);
  await page.locator('#model').fill('a,b,c,d,e,f'); await page.locator('#save').click();
  assert.equal(await page.locator('#status').innerText(), msg('tooManyModels', '5'));
  await page.reload(); await page.locator('#save:enabled').waitFor();
  assert.equal(await page.locator('#model').inputValue(), 'mock-translator, z-model');
  await page.locator('#fetch-models').click(); await page.locator('#model-list-field:visible').waitFor();
  assert.equal(await page.locator('#model-list input:checked').count(), 2);
  await page.locator('#test').click();
  await page.waitForFunction(() => document.querySelector('#status').classList.contains('success'));
  await page.screenshot({ path: path.join(screenshotDir, 'options-multi.png'), fullPage: true });

  await page.setViewportSize({ width: 400, height: 800 });
  await page.goto(`${origin}/src/popup/popup.html`);
  await page.locator('.result-card[data-model="z-model"]').waitFor();
  assert.equal(await page.locator('#source').evaluate(el => el.getBoundingClientRect().height), 70);
  await page.locator('#source').fill('Compare models');
  let release;
  modelBehaviors.set('z-model', { wait: new Promise(resolve => { release = resolve; }) });
  const before = requests.length;
  await page.locator('#translate').click();
  await page.locator('.result-card[data-model="mock-translator"][data-state="success"]').waitFor();
  assert.equal(requests.length, before + 2, 'both models start before the slower one resolves');
  assert.equal(await page.locator('.result-card[data-model="z-model"]').getAttribute('data-state'), 'loading');
  assert.equal(await page.locator('#copy').isEnabled(), true, 'finished card is independently copyable');
  release(); modelBehaviors.clear();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('complete'));
  assert.equal(await page.locator('.result-card[data-state="success"]').count(), 2);
  assert.equal(await page.locator('.result-card[data-model="z-model"] .result').innerText(), '多一分理解，拉近彼此距离。');
  await page.evaluate(() => { const write = navigator.clipboard.writeText.bind(navigator.clipboard); navigator.clipboard.writeText = async text => { await write(text); window.__copiedText = text; }; });
  await page.locator('.result-card[data-model="z-model"] .copy-result').click();
  const copyButton = page.locator('.result-card[data-model="z-model"] .copy-result');
  await page.locator('.result-card[data-model="z-model"] .copy-result[data-copied="true"]').waitFor();
  assert.equal(await copyButton.textContent(), '');
  assert.equal(await page.locator('#copy').getAttribute('data-copied'), 'false');
  assert.equal(await page.locator('#status').innerText(), msg('complete'));
  assert.equal((await page.locator('body').innerText()).includes(msg('copied')), false);
  await page.screenshot({ path: path.join(screenshotDir, 'popup-copied.png'), fullPage: true });
  await page.waitForTimeout(900);
  await copyButton.click();
  await page.waitForTimeout(850);
  assert.equal(await copyButton.getAttribute('data-copied'), 'true', 'a second copy restarts the 1.5 second feedback');
  await page.waitForFunction(() => document.querySelector('.result-card[data-model="z-model"] .copy-result').dataset.copied === 'false');
  assert.equal(await page.evaluate(() => window.__copiedText), '多一分理解，拉近彼此距离。');
  await page.screenshot({ path: path.join(screenshotDir, 'popup-multi.png'), fullPage: true });
  // Failed clipboard writes never show a success check.
  await page.evaluate(() => { window.__writeClipboard = navigator.clipboard.writeText; navigator.clipboard.writeText = async () => { throw new Error('denied'); }; });
  await copyButton.click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('copyFailed'));
  assert.equal(await copyButton.getAttribute('data-copied'), 'false');
  // A pending second write must not freeze the previous success feedback.
  await page.evaluate(() => { navigator.clipboard.writeText = window.__writeClipboard; });
  await copyButton.click();
  await page.waitForFunction(() => document.querySelector('.result-card[data-model="z-model"] .copy-result').dataset.copied === 'true');
  await page.evaluate(() => { navigator.clipboard.writeText = () => new Promise(resolve => { window.__resolveCopy = resolve; }); });
  await copyButton.click();
  await page.waitForFunction(() => document.querySelector('.result-card[data-model="z-model"] .copy-result').dataset.copied === 'false');
  // Replacing the cards also invalidates a late clipboard response.
  await page.locator('#source').fill('Compare models again');
  await page.evaluate(() => { window.__resolveCopy(); navigator.clipboard.writeText = window.__writeClipboard; });
  assert.equal(await page.locator('.copy-result[data-copied="true"]').count(), 0);
  const deniedBefore = requests.length;
  const denied = await page.evaluate(() => chrome.runtime.sendMessage({ type: 'TRANSLATE', model: 'unconfigured-model', text: 'no request' }));
  assert.equal(denied.ok, false); assert.equal(requests.length, deniedBefore);

  modelBehaviors.set('z-model', { status: 401 });
  await page.locator('#translate').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('partialModelsFailed'));
  assert.equal(await page.locator('.result-card[data-state="success"]').count(), 1);
  assert.equal(await page.locator('.result-card[data-state="error"] .copy-result').isDisabled(), true);
  assert.equal((await page.locator('body').innerText()).includes('SECRET MODEL ERROR'), false);
  await page.screenshot({ path: path.join(screenshotDir, 'popup-multi-error.png'), fullPage: true });
  const retry = page.locator('.result-card[data-model="z-model"] .retry-result');
  assert.equal(await retry.innerText(), msg('retryTranslation'));
  assert.equal(await page.locator('.result-card[data-model="z-model"] .result-meta').innerText(), msg('translationFailed'));
  // Failure can be retried repeatedly without touching a successful sibling.
  const failedRetryBefore = requests.length;
  await retry.click();
  await retry.waitFor();
  assert.equal(requests.length, failedRetryBefore + 1);
  assert.equal(requests.at(-1).body.model, 'z-model');
  const successfulText = await page.locator('#result').innerText();
  let releaseRetry;
  modelBehaviors.set('z-model', { wait: new Promise(resolve => { releaseRetry = resolve; }) });
  const retryBefore = requests.length;
  await retry.evaluate(button => { button.click(); button.click(); });
  await page.locator('.result-card[data-model="z-model"][data-state="loading"]').waitFor();
  assert.equal(await page.locator('#result').innerText(), successfulText);
  assert.equal(await page.locator('#copy').isEnabled(), true);
  assert.equal(await retry.count(), 0, 'hide retry while its request is pending');
  releaseRetry(); modelBehaviors.clear();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('complete'));
  assert.equal(requests.length, retryBefore + 1, 'double activation starts only one request');
  assert.equal(requests.at(-1).body.model, 'z-model');
  assert.deepEqual(requests.at(-1).body.messages, requests[failedRetryBefore].body.messages, 'retry preserves source and target');
  assert.equal(await page.locator('.result-card[data-state="success"]').count(), 2);
  modelBehaviors.set('z-model', { status: 401 });
  modelBehaviors.set('mock-translator', { status: 500 });
  await page.locator('#translate').click();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('allModelsFailed'));
  assert.equal(await page.locator('.result-card[data-state="error"]').count(), 2);
  // Multiple failed cards may be retried independently, even while a sibling is pending.
  let releaseFirst;
  modelBehaviors.set('mock-translator', { wait: new Promise(resolve => { releaseFirst = resolve; }) });
  modelBehaviors.delete('z-model');
  const bothRetryBefore = requests.length;
  await page.locator('.result-card[data-model="mock-translator"] .retry-result').click();
  await page.locator('.result-card[data-model="z-model"] .retry-result').click();
  await page.locator('.result-card[data-model="z-model"][data-state="success"]').waitFor();
  assert.equal(await page.locator('#result-card').getAttribute('data-state'), 'loading');
  assert.equal(await page.locator('#translate').isDisabled(), true);
  releaseFirst(); modelBehaviors.clear();
  await page.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('complete'));
  assert.equal(requests.length, bothRetryBefore + 2);


  // Inspect the closed selection shadow root through the test browser's CDP.
  await sample.reload(); await sample.waitForSelector('[data-transight]', { state: 'attached' });
  const session = await context.newCDPSession(sample);
  async function ui(fn, args = []) {
    const { root } = await session.send('DOM.getDocument', { depth: -1, pierce: true });
    function find(node) {
      if (node.attributes?.includes('data-transight')) return node;
      for (const child of [...(node.children || []), ...(node.shadowRoots || [])]) { const found = find(child); if (found) return found; }
    }
    const host = find(root); assert.ok(host);
    const { object } = await session.send('DOM.resolveNode', { nodeId: host.shadowRoots[0].nodeId });
    try {
      const { result, exceptionDetails } = await session.send('Runtime.callFunctionOn', { objectId: object.objectId, functionDeclaration: fn, arguments: args.map(value => ({ value })), returnByValue: true, awaitPromise: true });
      if (exceptionDetails) throw new Error(JSON.stringify(exceptionDetails));
      return result.value;
    } finally { await session.send('Runtime.releaseObject', { objectId: object.objectId }); }
  }
  async function until(fn) { for (let i = 0; i < 100; i++) { if (await fn()) return; await new Promise(resolve => setTimeout(resolve, 50)); } throw new Error('multi-model selection timeout'); }
  async function openSelection(text) {
    await sample.evaluate(text => {
      const p = document.getElementById('sample'); p.textContent = text;
      const range = document.createRange(); range.selectNodeContents(p);
      getSelection().removeAllRanges(); getSelection().addRange(range);
      p.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    }, text);
    await until(() => ui('function(){return !this.querySelector(".selection-bubble").hidden}'));
    const point = await ui('function(){const r=this.querySelector(".selection-bubble").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
    await sample.mouse.click(point.x, point.y);
  }
  await openSelection('Compare selection models');
  await until(() => ui('function(){return this.querySelectorAll(".result-card[data-state=success]").length===2}'));
  assert.deepEqual(await ui('function(){return Array.from(this.querySelectorAll(".result-card"),card=>card.dataset.model)}'), ['mock-translator', 'z-model']);
  assert.deepEqual(await ui('function(){const p=this.querySelector(".selection-panel"),r=p.getBoundingClientRect();return {width:r.width,fitsViewport:r.height<=innerHeight-16,overflows:p.scrollHeight>p.clientHeight,horizontal:p.scrollWidth>p.clientWidth}}'), {width:400,fitsViewport:true,overflows:false,horizontal:false});
  // The last model must be reachable without losing the header controls.
  await ui('function(){this.querySelector(".selection-panel").scrollTop=10000}');
  assert.equal(await ui('function(){const p=this.querySelector(".selection-panel").getBoundingClientRect(),h=this.querySelector(".topbar").getBoundingClientRect(),last=this.querySelector(".result-card:last-child").getBoundingClientRect();return h.top>=p.top && last.bottom<=p.bottom && last.bottom>h.bottom}'), true);
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-multi.png'), fullPage: true });
  await ui('function(){this.querySelector(".copy-result").scrollIntoView({block:"center"})}');
  const copyPoint = await ui('function(){const r=this.querySelector(".copy-result").getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}');
  await sample.mouse.click(copyPoint.x, copyPoint.y);
  await until(() => ui('function(){return this.querySelector(".copy-result").dataset.copied==="true"}'));
  assert.equal(await ui('function(){return this.querySelector(".copy-result").textContent}'), '');
  assert.equal(await ui('function(){return this.querySelectorAll(".copy-result[data-copied=true]").length}'), 1);
  assert.equal(await ui('function(){return this.querySelector("#status").textContent}'), msg('complete'));
  await until(() => ui('function(){return this.querySelector(".copy-result").dataset.copied==="false"}'));
  // Target changes run every model again; retry only the failed selection result.
  modelBehaviors.set('z-model', { status: 500 });
  const targetBefore = requests.length;
  await ui('function(){const target=this.querySelector("#target");target.value="ja";target.dispatchEvent(new Event("change",{bubbles:true}))}');
  await until(() => ui('function(){return this.querySelectorAll(".result-card[data-state=error]").length===1 && this.querySelectorAll(".result-card[data-state=success]").length===1}'));
  assert.equal(requests.length, targetBefore + 2);
  assert.ok(requests.slice(-2).every(request => request.body.messages[0].content.includes('(ja)')));
  modelBehaviors.clear();
  const selectionRetryBefore = requests.length;
  await ui('function(){this.querySelector(".retry-result").click()}');
  await until(() => ui('function(){return this.querySelectorAll(".result-card[data-state=success]").length===2}'));
  assert.equal(requests.length, selectionRetryBefore + 1);
  assert.equal(requests.at(-1).body.model, 'z-model');
  assert.ok(requests.at(-1).body.messages[0].content.includes('(ja)'));

  await ui('function(){this.querySelector("#close-view").click()}');
  // Cancel a whole multi-model batch; its late replies must not overwrite a new one.
  let releaseOld;
  const wait = new Promise(resolve => { releaseOld = resolve; });
  for (const model of ['mock-translator', 'z-model']) modelBehaviors.set(model, { wait });
  const oldBefore = requests.length;
  await openSelection('Old multi-model batch');
  await until(async () => requests.length === oldBefore + 2);
  await ui('function(){this.querySelector("#close-view").click()}');
  modelBehaviors.clear();
  await openSelection('New multi-model batch');
  await until(() => ui('function(){return this.querySelectorAll(".result-card[data-state=success]").length===2}'));
  releaseOld();
  assert.equal(await ui('function(){return this.querySelector("#source").value}'), 'New multi-model batch');
  await sample.setViewportSize({ width: 375, height: 480 });
  await until(() => ui('function(){const p=this.querySelector(".selection-panel"),r=p.getBoundingClientRect();return r.right<=375 && r.bottom<=480 && p.scrollWidth===p.clientWidth}'));
  await sample.setViewportSize({ width: 1120, height: 980 });
  await ui('function(){this.querySelector("#close-view").click()}');
  await session.detach();

  console.log('✓ Multi-model: checkbox persistence, normalization/limit, parallel independent results, per-card copy/retry, duplicate retry prevention, concurrent retries, mixed/all failures, unconfigured-model rejection, selection target changes, batch cancellation, narrow layout');
}
