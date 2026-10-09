import { initI18n, localizePage, t, onLanguageChanged, localeSnapshot, setLanguagePreference } from '../shared/i18n.js';
import { getSettings, setTargetLanguage } from '../shared/settings.js';
import { cropRect, imageSize, validateImage } from '../shared/screenshot.js';
await initI18n();
const $ = id => document.getElementById(id);
let view, rect, start, activePointer;
const requests = new Set();
const original = $('original');
function localize() {
  localizePage(); document.title = `${t('screenshotTranslate')} · Transight AI`;
  original.alt = t('screenshotPreview'); $('preview').alt = t('screenshotPreview');
  $('translation-host').setAttribute('aria-label', t('translation'));
  view?.setLocale(localeSnapshot());
}
localize(); onLanguageChanged(localize);
$('close-editor').addEventListener('click', () => window.close());
async function vaultStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'VAULT_STATUS' });
  if (!response?.ok) throw new Error();
  return response.vault;
}
function error(message) { $('capture-error').textContent = message; $('capture-error').hidden = false; }
try {
  const response = await chrome.runtime.sendMessage({ type: 'SCREENSHOT_TAKE', id: new URLSearchParams(location.search).get('capture') });
  if (!response?.ok) throw new Error(response?.error || t('screenshotExpired'));
  original.src = validateImage(response.image); await original.decode();
  // Reuse the same packaged UI, never parse page content or provider output as HTML.
  const html = await (await fetch(chrome.runtime.getURL('src/popup/popup.html'))).text();
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  $('translation-host').append(parsed.querySelector('.translation-view'));
  const hint = document.createElement('p'); hint.className = 'vision-hint'; hint.dataset.i18n = 'screenshotVisionHint';
  $('translation-host').querySelector('main').prepend(hint);
  view = new TransightTranslationView($('translation-host'), {
    imageMode: true, vault: await vaultStatus(), getVaultStatus: vaultStatus,
    unlockUrl: chrome.runtime.getURL('src/unlock/unlock.html'),
    async translate(text, targetLanguage, model, image, sourceLanguage) {
      const id = TransightRequestId(); requests.add(id);
      try { return await chrome.runtime.sendMessage({ type: 'TRANSLATE', id, text, targetLanguage, model, image, sourceLanguage }); }
      finally { requests.delete(id); }
    },
    cancel() { for (const id of requests) chrome.runtime.sendMessage({ type: 'CANCEL_TRANSLATE', id }).catch(() => {}); requests.clear(); },
    setTargetLanguage, settingsUrl: chrome.runtime.getURL('src/options/options.html'),
    openSettings: () => chrome.runtime.openOptionsPage(),
    async setLanguage(value) { await setLanguagePreference(value); return localeSnapshot(); }
  }, localeSnapshot(), await getSettings());
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && (changes.settings || changes.targetLanguagePreference)) getSettings().then(settings => view.applySettings(settings)).catch(() => view.statusKey('readConfigFailed', true));
    if ((area === 'session' && changes.credentialSession) || (area === 'local' && (changes.settings || changes.credentialVault))) vaultStatus().then(vault => view.setVault(vault)).catch(() => {});
  });
  $('capture-layout').hidden = false; localize();
  for (const [id, max] of [['crop-x', original.naturalWidth - 1], ['crop-y', original.naturalHeight - 1], ['crop-width', original.naturalWidth], ['crop-height', original.naturalHeight]]) $(id).max = max;
  $('crop-width').value = original.naturalWidth; $('crop-height').value = original.naturalHeight;
  $('dimensions').textContent = `${original.naturalWidth} × ${original.naturalHeight}`;
  view.setImage(response.image); $('preview').src = response.image; $('preview').hidden = false;
  $('crop-stage').hidden = true; $('crop-controls').hidden = true; $('crop-reset').hidden = false;
} catch (reason) { error(reason.message === 'screenshotInvalid' ? t('screenshotInvalid') : reason.message || t('screenshotFailed')); }
function renderRect(updateInputs = true) {
  const valid = rect?.width >= 4 && rect?.height >= 4;
  $('crop-confirm').disabled = !valid; $('crop-shade').hidden = !valid;
  if (!valid) return;
  Object.assign($('crop-shade').style, { left: `${rect.x / original.naturalWidth * 100}%`, top: `${rect.y / original.naturalHeight * 100}%`, width: `${rect.width / original.naturalWidth * 100}%`, height: `${rect.height / original.naturalHeight * 100}%` });
  if (updateInputs) for (const field of ['x', 'y', 'width', 'height']) $(`crop-${field}`).value = rect[field];
}
function point(event) {
  const bounds = original.getBoundingClientRect();
  return { x: (event.clientX - bounds.left) / bounds.width * original.naturalWidth, y: (event.clientY - bounds.top) / bounds.height * original.naturalHeight };
}
$('crop-stage').addEventListener('pointerdown', event => {
  if (event.button !== 0 || activePointer != null) return;
  event.preventDefault(); start = point(event); activePointer = event.pointerId;
  $('crop-stage').setPointerCapture(event.pointerId); rect = cropRect(start, start, original.naturalWidth, original.naturalHeight); renderRect();
});
$('crop-stage').addEventListener('pointermove', event => {
  if (activePointer !== event.pointerId) return;
  rect = cropRect(start, point(event), original.naturalWidth, original.naturalHeight); renderRect();
});
$('crop-stage').addEventListener('pointerup', event => {
  if (activePointer !== event.pointerId) return;
  rect = cropRect(start, point(event), original.naturalWidth, original.naturalHeight); renderRect();
  activePointer = null; $('crop-stage').releasePointerCapture(event.pointerId);
});
$('crop-stage').addEventListener('lostpointercapture', () => { activePointer = null; });
for (const field of ['x', 'y', 'width', 'height']) $(`crop-${field}`).addEventListener('input', () => {
  const [x, y, width, height] = ['x', 'y', 'width', 'height'].map(key => $(`crop-${key}`).valueAsNumber);
  if (![x, y, width, height].every(Number.isFinite) || x < 0 || y < 0 || width < 4 || height < 4) { rect = null; renderRect(); return; }
  rect = cropRect({ x, y }, { x: x + width, y: y + height }, original.naturalWidth, original.naturalHeight); renderRect(false);
});
function useSelection() {
  if (!view || !rect || rect.width < 4 || rect.height < 4) return;
  try {
    const size = imageSize(rect.width, rect.height), canvas = document.createElement('canvas');
    canvas.width = size.width; canvas.height = size.height;
    canvas.getContext('2d').drawImage(original, rect.x, rect.y, rect.width, rect.height, 0, 0, size.width, size.height);
    const image = validateImage(canvas.toDataURL('image/jpeg', .92));
    view.setImage(image); $('preview').src = image; $('preview').hidden = false;
    $('crop-stage').hidden = true; $('crop-controls').hidden = true; $('crop-reset').hidden = false;
    $('dimensions').textContent = `${size.width} × ${size.height}`;
    $('capture-error').hidden = true; $('translate').focus();
  } catch { error(t('screenshotInvalid')); }
}
$('crop-confirm').addEventListener('click', useSelection);
$('crop-all').addEventListener('click', () => { rect = { x: 0, y: 0, width: original.naturalWidth, height: original.naturalHeight }; useSelection(); });
$('crop-reset').addEventListener('click', () => {
  view.setImage(undefined); $('preview').removeAttribute('src'); $('preview').hidden = true;
  $('crop-stage').hidden = false; $('crop-controls').hidden = false; $('crop-reset').hidden = true;
  $('dimensions').textContent = `${original.naturalWidth} × ${original.naturalHeight}`;
  rect = null; renderRect(); $('crop-all').focus();
});
window.addEventListener('pagehide', () => { view?.dispose(); original.removeAttribute('src'); $('preview').removeAttribute('src'); });
