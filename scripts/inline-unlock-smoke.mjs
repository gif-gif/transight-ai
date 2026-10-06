import assert from 'node:assert/strict';
import path from 'node:path';
export async function inlineUnlockSmoke({ context, worker, page, sample, tabId, requests, screenshotDir, msg, modelBehaviors }) {
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  const password = 'local-test-unlock-password';
  const rpc = (type, extra = {}) => page.evaluate(message => chrome.runtime.sendMessage(message), { type, ...extra });
  await rpc('VAULT_LOCK');
  const popup = await context.newPage();
  await popup.goto(`${origin}/src/popup/popup.html`);
  await popup.locator('#inline-unlock:visible').waitFor();
  const frame = popup.frameLocator('#inline-unlock iframe');
  await frame.locator('#unlock-password').waitFor();
  await popup.waitForFunction(() => document.querySelector('#inline-unlock iframe').style.height);
  const compactHeight = (await popup.locator('#inline-unlock iframe').boundingBox()).height;
  assert.ok(compactHeight < 125, `compact unlock height: ${compactHeight}`);
  assert.equal(await frame.locator('#unlock-status').isVisible(), false);
  const count = requests.length;
  await popup.locator('#source').fill('Resume this translation after unlocking');
  await popup.locator('#translate').click();
  await popup.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('vaultLockedError'));
  assert.equal(requests.length, count);
  await frame.locator('#unlock-password').fill('wrong-password');
  await frame.locator('#unlock-vault').click();
  await frame.locator('#unlock-status.error').waitFor();
  assert.equal(await frame.locator('#unlock-password').inputValue(), '');
  const unlockFrame = popup.frames().find(item => item.url() === `${origin}/src/unlock/unlock.html`);
  await unlockFrame.waitForFunction(() => document.body.getBoundingClientRect().height <= innerHeight);
  assert.ok((await popup.locator('#inline-unlock iframe').boundingBox()).height > compactHeight);
  // Wrapping in a narrow popup must resize too, without clipping the error text.
  await popup.setViewportSize({ width: 320, height: 800 });
  await unlockFrame.waitForFunction(() => document.body.getBoundingClientRect().height <= innerHeight);
  assert.equal(await unlockFrame.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.equal(requests.length, count);
  await popup.screenshot({ path: path.join(screenshotDir, 'popup-locked.png') });
  await frame.locator('#unlock-password').fill(password);
  await frame.locator('#unlock-password').press('Enter');
  await popup.locator('#inline-unlock').waitFor({ state: 'hidden' });
  await popup.locator('.result-card[data-state="success"]').first().waitFor();
  await page.locator('#test:enabled').waitFor();
  assert.equal(requests.at(-1).auth, 'Bearer local-test-key');

  await rpc('VAULT_LOCK');
  await popup.locator('#inline-unlock:visible').waitFor();
  await sample.evaluate(() => {
    window.passwordEvents = [];
    for (const event of ['keydown', 'input']) document.addEventListener(event, e => window.passwordEvents.push(e.key || e.target.value), true);
  });
  assert.equal((await worker.evaluate(tabId => chrome.tabs.sendMessage(tabId, { type: 'SELECTION_OPEN', text: 'Unlock within the page panel' }), tabId)).ok, true);
  // Frames remain inspectable through Playwright even inside a closed shadow root.
  const attached = () => sample.frames().find(frame => frame.url() === `${origin}/src/unlock/unlock.html`);
  for (let i = 0; !attached() && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 30));
  const embedded = attached(); assert.ok(embedded, 'on-page panel embeds extension-origin unlock frame');
  await embedded.locator('#unlock-password').waitFor();
  await embedded.waitForFunction(() => innerHeight < 125 && document.body.getBoundingClientRect().height <= innerHeight);
  // Even this extension frame cannot edit/reset credentials or initiate translations.
  const denied = await embedded.evaluate(async () => {
    const results = [];
    for (const type of ['VAULT_RESET', 'FETCH_MODELS', 'TRANSLATE']) {
      try { results.push(await chrome.runtime.sendMessage({ type })); } catch { results.push(null); }
    }
    return results;
  });
  assert.ok(denied.every(result => !result?.ok));
  await embedded.locator('#unlock-password').pressSequentially(password);
  assert.deepEqual(await sample.evaluate(() => window.passwordEvents), []);
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-locked.png') });
  const beforeUnlock = requests.length;
  await embedded.locator('#unlock-vault').click();
  await popup.locator('#inline-unlock').waitFor({ state: 'hidden' });
  await page.locator('#test:enabled').waitFor();
  for (let i = 0; requests.length === beforeUnlock && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 30));
  assert.ok(requests.length > beforeUnlock, 'selection automatically resumes after unlock');
  assert.equal(requests.at(-1).auth, 'Bearer local-test-key');
  assert.deepEqual(await sample.evaluate(() => window.passwordEvents), []);
  // Locking an active view must not leave its model cards stuck in loading.
  await sample.mouse.click(5, 5);
  const chosenModel = await popup.locator('.result-card').first().getAttribute('data-model');
  let release;
  modelBehaviors.set(chosenModel, { wait: new Promise(resolve => { release = resolve; }) });
  await popup.locator('#source').fill('Cancel this active popup request');
  const beforeActive = requests.length;
  await popup.locator('#translate').click();
  for (let i = 0; requests.length === beforeActive && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 30));
  assert.ok(requests.length > beforeActive);
  await rpc('VAULT_LOCK');
  await popup.locator('#inline-unlock:visible').waitFor();
  assert.equal(await popup.locator('.result-card[data-state="loading"]').count(), 0);
  release(); modelBehaviors.clear();
  // A pending per-model retry resumes only that model after unlocking.
  const retryCard = popup.locator('.result-card').filter({ has: popup.locator('.retry-result') }).first();
  const retryModel = await retryCard.getAttribute('data-model');
  await retryCard.locator('.retry-result').click();
  await popup.waitForFunction(expected => document.querySelector('#status').textContent === expected, msg('vaultLockedError'));
  const beforeRetry = requests.length;
  await frame.locator('#unlock-password').fill(password);
  await frame.locator('#unlock-vault').click();
  await popup.locator('#inline-unlock').waitFor({ state: 'hidden' });
  await popup.locator('#translate:enabled').waitFor();
  await popup.waitForFunction(model => [...document.querySelectorAll('.result-card')].some(card => card.dataset.model === model && card.dataset.state === 'success'), retryModel);
  assert.equal(requests.length, beforeRetry + 1);
  await popup.close();
  // Simple has no Translate button: unlocking must automatically resume its first model.
  const previousMode = (await worker.evaluate(() => chrome.storage.local.get('translationMode'))).translationMode;
  await sample.mouse.click(5, 5);
  await worker.evaluate(() => chrome.storage.local.set({ translationMode: 'simple' }));
  await rpc('VAULT_LOCK');
  const simpleStart = requests.length;
  assert.equal((await worker.evaluate(tabId => chrome.tabs.sendMessage(tabId, { type: 'SELECTION_OPEN', text: 'Unlock Simple Translate automatically' }), tabId)).ok, true);
  for (let i = 0; !attached() && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 30));
  const simpleFrame = attached(); assert.ok(simpleFrame);
  await simpleFrame.locator('#unlock-password').waitFor();
  assert.equal(requests.length, simpleStart);
  await sample.screenshot({ path: path.join(screenshotDir, 'selection-simple-locked.png') });
  await simpleFrame.locator('#unlock-password').fill(password);
  await simpleFrame.locator('#unlock-password').press('Enter');
  await page.locator('#test:enabled').waitFor();
  for (let i = 0; requests.length === simpleStart && i < 100; i++) await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(requests.length, simpleStart + 1);
  assert.equal(requests.at(-1).auth, 'Bearer local-test-key');
  await sample.mouse.click(5, 5);
  await worker.evaluate(async previous => {
    if (previous === undefined) await chrome.storage.local.remove('translationMode');
    else await chrome.storage.local.set({ translationMode: previous });
  }, previousMode);
  console.log('✓ Simple inline unlock: no request while locked, Enter resumes exactly the first model');
  console.log('✓ Inline unlock: popup/page iframe, wrong password, Enter, auto-resume, cross-window sync, restricted RPC and keyboard isolation');
}
