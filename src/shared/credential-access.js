// Content scripts and web frames cannot invoke credential operations. The small
// embedded extension page can only read status and unlock, never edit the vault.
export function credentialAccess(message, sender, runtime) {
  if (sender.id !== runtime.id || typeof sender.url !== 'string') return false;
  const page = sender.url.split(/[?#]/)[0];
  if (page === runtime.getURL('src/options/options.html')) {
    return ['VAULT_STATUS', 'VAULT_SAVE', 'VAULT_UNLOCK', 'VAULT_LOCK', 'VAULT_RESET', 'FETCH_MODELS', 'CANCEL_MODELS'].includes(message?.type);
  }
  if (page === runtime.getURL('src/unlock/unlock.html')) return ['VAULT_STATUS', 'VAULT_UNLOCK'].includes(message?.type);
  if (['src/popup/popup.html', 'src/screenshot/screenshot.html'].some(path => page === runtime.getURL(path))) return message?.type === 'VAULT_STATUS';
  return false;
}
