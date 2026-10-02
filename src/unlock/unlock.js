import { initI18n, localizePage, onLanguageChanged, t } from '../shared/i18n.js';
await initI18n();
localizePage();
onLanguageChanged(() => { localizePage(); renderStatus(); });
const input = document.querySelector('#unlock-password');
const button = document.querySelector('#unlock-vault');
const status = document.querySelector('#unlock-status');
let busy = false, statusKey = '', failed = false;
function renderStatus() { status.textContent = statusKey ? t(statusKey) : ''; status.classList.toggle('error', failed); }
document.querySelector('#unlock-form').addEventListener('submit', async event => {
  event.preventDefault();
  if (busy) return;
  if (input.value.length < 6 || input.value.length > 1024) { statusKey = 'vaultPasswordLength'; failed = true; renderStatus(); return; }
  let password = input.value;
  input.value = ''; input.disabled = true; button.disabled = true; busy = true;
  statusKey = 'vaultUnlocking'; failed = false; renderStatus();
  try {
    const pending = chrome.runtime.sendMessage({ type: 'VAULT_UNLOCK', password });
    password = '';
    const response = await pending;
    if (!response?.ok) { statusKey = 'vaultUnlockFailed'; failed = true; }
    else statusKey = 'vaultInlineUnlocked';
  } catch { statusKey = 'vaultOperationFailed'; failed = true; }
  finally {
    password = ''; busy = false; input.disabled = false; button.disabled = false; renderStatus();
    if (failed) input.focus();
  }
});
// Report layout only; the parent never receives form values or credential state.
let lastHeight = 0;
const resizeObserver = new ResizeObserver(() => {
  const height = Math.ceil(document.body.getBoundingClientRect().height);
  if (height === lastHeight) return;
  lastHeight = height;
  parent.postMessage({ type: 'TRANSIGHT_UNLOCK_SIZE', height }, '*');
});
resizeObserver.observe(document.body);
window.addEventListener('pagehide', () => { input.value = ''; resizeObserver.disconnect(); });
// No password, key, or unlock result is forwarded via window.postMessage.
