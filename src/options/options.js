import { t, localizePage, initI18n, onLanguageChanged } from '../shared/i18n.js';
import { fetchModels, modelConnection } from '../shared/models.js';
import { fillLanguages, getSettings, permissionOrigin, validateSettings, parseModelInput, MAX_MODELS } from '../shared/settings.js';
await initI18n();
localizePage();
const $ = id => document.getElementById(id);
let savedSettings;
let busy = false;
let fetching = false;
let modelRequest = 0;
let modelController;
let modelStatus;
function modelStatusKey(key, kind = '', substitutions) {
  modelStatus = { key, kind, substitutions };
  $('models-status').textContent = key ? t(key, substitutions) : '';
  $('models-status').className = `status ${kind}`;
}
function updateButtons() {
  $('save').disabled = busy || fetching;
  $('test').disabled = busy || fetching;
  $('fetch-models').disabled = busy || fetching;
  $('fetch-models').textContent = fetching ? t('fetchingModels') : t('fetchModels');
  $('fetch-models').setAttribute('aria-busy', String(fetching));
}
function resetModelList() {
  $('model-list').replaceChildren();

  $('model-list-field').hidden = true;
}
function invalidateModels() {
  modelRequest++;
  modelController?.abort();
  fetching = false;
  updateButtons(); resetModelList(); modelStatusKey('');
}
let statusMessage;
function statusKey(key, kind = '', substitutions) {
  status(t(key, substitutions), kind);
  statusMessage = { key, kind, substitutions };
}
function status(text, kind = '') { statusMessage = null; $('status').textContent = text; $('status').className = `status ${kind}`; }
function setBusy(value) { busy = value; updateButtons(); }
function readForm() {
  return validateSettings({ baseUrl: $('base-url').value, apiKey: $('api-key').value, models: parseModelInput($('model').value),
    targetLanguage: $('target-language').value, style: $('style').value, consent: $('consent').checked });
}
$('toggle-key').addEventListener('click', () => {
  const visible = $('api-key').type === 'password';
  $('api-key').type = visible ? 'text' : 'password';
  $('toggle-key').textContent = visible ? t('hide') : t('show');
  $('toggle-key').setAttribute('aria-pressed', String(visible));
});
$('settings-form').addEventListener('input', () => { if (!busy) statusKey('unsaved'); });
$('settings-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy || fetching) return;
  try {
    const settings = readForm();
    const origin = permissionOrigin(settings.baseUrl);
    setBusy(true);
    if (!await chrome.permissions.contains({ origins: [origin] })) throw new Error(t('permissionMissing'));
    await chrome.storage.local.set({ settings });
    savedSettings = settings;
    $('base-url').value = settings.baseUrl;
    $('model').value = settings.models.join(', '); syncModelChecks();
    // HTTP(S) access is now a required global grant. Saving a provider must not
    // revoke it (or try to remove required permissions).
    statusKey('saved', 'success');
  } catch (error) { status(error.message, 'error'); }
  finally { setBusy(false); }
});
$('test').addEventListener('click', async () => {
  if (busy || fetching) return;
  try {
    const form = readForm();
    if (Object.keys(form).some(key => JSON.stringify(form[key]) !== JSON.stringify(savedSettings[key]))) throw new Error(t('saveFirst'));
    setBusy(true); statusKey('testing');
    const results = await Promise.all(form.models.map(async model => {
      try { return { model, ...await chrome.runtime.sendMessage({ type: 'TRANSLATE', model, text: 'Hello, world!', targetLanguage: 'zh-CN' }) }; }
      catch { return { model, ok: false, error: t('backgroundNoResponse') }; }
    }));
    const failed = results.filter(result => !result.ok);
    if (failed.length) throw new Error(failed.map(result => `${result.model}: ${result.error || t('backgroundNoResponse')}`).join(' · '));
    statusKey('connectionSuccess', 'success', results.length === 1 ? results[0].text : results.map(result => result.model).join(', '));
  } catch (error) { status(error.message, 'error'); }
  finally { setBusy(false); }
});
async function init() {
  setBusy(true);
  const settings = await getSettings();
  $('base-url').value = settings.baseUrl; $('api-key').value = settings.apiKey; $('model').value = settings.models.join(', ');
  fillLanguages($('target-language'), settings.targetLanguage);
  $('style').value = settings.style; $('consent').checked = settings.consent;
  savedSettings = settings;
  setBusy(false);
}
init().catch(() => statusKey('readSettingsFailed', 'error'));

onLanguageChanged(() => {
  localizePage();
  fillLanguages($('target-language'), $('target-language').value);
  $('toggle-key').textContent = $('api-key').type === 'text' ? t('hide') : t('show');
  if (statusMessage) statusKey(statusMessage.key, statusMessage.kind, statusMessage.substitutions);
  updateButtons();
  if (modelStatus) modelStatusKey(modelStatus.key, modelStatus.kind, modelStatus.substitutions);
});

for (const id of ['base-url', 'api-key']) $(id).addEventListener('input', invalidateModels);
function syncModelChecks() {
  const selected = parseModelInput($('model').value);
  for (const checkbox of $('model-list').querySelectorAll('input')) {
    checkbox.checked = selected.includes(checkbox.value);
    checkbox.disabled = !checkbox.checked && selected.length >= MAX_MODELS;
  }
}
$('model').addEventListener('input', syncModelChecks);
$('model-list').addEventListener('change', event => {
  if (!event.target.matches('input[type="checkbox"]')) return;
  const selected = parseModelInput($('model').value);
  const models = event.target.checked ? [...new Set([...selected, event.target.value])] : selected.filter(model => model !== event.target.value);
  $('model').value = models.join(', ');
  $('model').dispatchEvent(new Event('input', { bubbles: true }));
});
$('fetch-models').addEventListener('click', async () => {
  if (busy || fetching) return;
  const request = ++modelRequest;
  const controller = new AbortController();
  modelController = controller;
  try {
    const connection = modelConnection({ baseUrl: $('base-url').value, apiKey: $('api-key').value });
    fetching = true; updateButtons(); resetModelList(); modelStatusKey('fetchingModels');
    if (!await chrome.permissions.contains({ origins: [permissionOrigin(connection.baseUrl)] })) throw new Error(t('permissionMissing'));
    if (request !== modelRequest) return;
    const models = await fetchModels(connection, { signal: controller.signal });
    if (request !== modelRequest) return;
    for (const id of models) {
      const label = document.createElement('label');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.value = id;
      const name = document.createElement('span'); name.textContent = id;
      label.append(checkbox, name); $('model-list').append(label);
    }
    syncModelChecks();
    $('model-list-field').hidden = false;
    modelStatusKey('modelsLoaded', 'success', String(models.length));
  } catch (error) {
    if (request !== modelRequest) return;
    modelStatus = null;
    $('models-status').textContent = error.message || t('modelsFailed');
    $('models-status').className = 'status error';
  } finally {
    if (request === modelRequest) { fetching = false; modelController = null; updateButtons(); }
  }
});
window.addEventListener('pagehide', () => modelController?.abort());
