// Only the service worker imports this module. No password or derived key is persisted.
import { t } from './i18n.js';
import { normalizeBaseUrl, validateSettings } from './settings.js';

export const KDF_ITERATIONS = 600000;
const VERSION = 1;
const encoder = new TextEncoder();
const encode = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const decode = value => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const fail = key => { throw new Error(t(key)); };
function checkPassword(password) {
  if (typeof password !== 'string' || password.length < 6 || password.length > 1024) fail('vaultPasswordLength');
}
function checkKey(value) {
  if (typeof value !== 'string' || value.length > 8192 || /[\r\n]/.test(value)) fail('invalidKey');
  return value.trim();
}
async function derive(password, salt, cryptoImpl) {
  const material = await cryptoImpl.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveKey']);
  return cryptoImpl.subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: KDF_ITERATIONS }, material,
    { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const aad = baseUrl => encoder.encode(`Transight AI credential vault v${VERSION}\n${baseUrl}`);
export async function encryptCredential(apiKey, password, baseUrl, cryptoImpl = crypto) {
  checkPassword(password);
  apiKey = checkKey(apiKey);
  if (!apiKey) fail('invalidKey');
  baseUrl = normalizeBaseUrl(baseUrl);
  const salt = cryptoImpl.getRandomValues(new Uint8Array(16));
  const iv = cryptoImpl.getRandomValues(new Uint8Array(12));
  const key = await derive(password, salt, cryptoImpl);
  const ciphertext = await cryptoImpl.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: aad(baseUrl), tagLength: 128 }, key, encoder.encode(apiKey));
  return { version: VERSION, kdf: 'PBKDF2-SHA-256', iterations: KDF_ITERATIONS, cipher: 'AES-256-GCM',
    id: cryptoImpl.randomUUID(), baseUrl, salt: encode(salt), iv: encode(iv), ciphertext: encode(ciphertext) };
}
export async function decryptCredential(vault, password, cryptoImpl = crypto) {
  try {
    checkPassword(password);
    if (vault.version !== VERSION || vault.kdf !== 'PBKDF2-SHA-256' || vault.iterations !== KDF_ITERATIONS || vault.cipher !== 'AES-256-GCM' ||
      typeof vault.id !== 'string' || typeof vault.ciphertext !== 'string' || vault.ciphertext.length > 45000 || normalizeBaseUrl(vault.baseUrl) !== vault.baseUrl) throw new Error();
    const salt = decode(vault.salt), iv = decode(vault.iv), ciphertext = decode(vault.ciphertext);
    if (salt.length !== 16 || iv.length !== 12 || ciphertext.length < 17) throw new Error();
    const key = await derive(password, salt, cryptoImpl);
    const plaintext = await cryptoImpl.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: aad(vault.baseUrl), tagLength: 128 }, key, ciphertext);
    return checkKey(new TextDecoder('utf-8', { fatal: true }).decode(plaintext));
  } catch { fail('vaultUnlockFailed'); }
}

export function createCredentialStore(storage, cryptoImpl = crypto) {
  let queue = Promise.resolve();
  let generation = 0;
  const serial = fn => { const result = queue.then(fn); queue = result.catch(() => {}); return result; };
  const checkGeneration = value => { if (value !== generation) fail('vaultLockedError'); };
  async function records() {
    const [{ settings = {}, credentialVault }, { credentialSession }] = await Promise.all([
      storage.local.get(['settings', 'credentialVault']), storage.session.get('credentialSession')
    ]);
    return { settings, vault: credentialVault, migration: !credentialVault && !!settings.apiKey, session: credentialSession };
  }
  function sessionMatches({ vault, session }) {
    return !!session && !!vault && session.id === vault.id && session.baseUrl === vault.baseUrl;
  }
  async function status() {
    const state = await records();
    return { state: state.vault ? (sessionMatches(state) ? 'unlocked' : 'locked') : state.migration ? 'migration' : 'empty',
      hasSession: sessionMatches(state), configured: !!(state.vault || state.migration) };
  }
  return {
    status,
    // Never delete the user's only credential before encryption succeeds. Legacy
    // plaintext is quarantined (no network use) until the user supplies a password.
    migrate: () => serial(async () => {
      const { settings, vault } = await records();
      if (Object.hasOwn(settings, 'apiKey') && (vault || !settings.apiKey)) {
        const { apiKey, ...safe } = settings;
        await storage.local.set({ settings: safe });
      }
    }),
    unlock: password => {
      const expected = generation;
      return serial(async () => {
        const { vault } = await records();
        if (!vault) fail('vaultMissing');
        const apiKey = await decryptCredential(vault, password, cryptoImpl);
        checkGeneration(expected);
        await storage.session.set({ credentialSession: { id: vault.id, baseUrl: vault.baseUrl, apiKey } });
        return status();
      });
    },
    lock: () => {
      generation++;
      return serial(async () => { await storage.session.remove('credentialSession'); return status(); });
    },
    reset: () => {
      generation++;
      return serial(async () => {
        await storage.session.remove('credentialSession');
        const { settings } = await records();
        const { apiKey, ...safe } = settings;
        await storage.local.set({ settings: safe, credentialVault: null });
        await storage.local.remove('credentialVault');
        return status();
      });
    },
    save: (input, password, confirmation) => {
      const expected = generation;
      return serial(async () => {
        const config = validateSettings(input);
        const { apiKey: supplied, ...safe } = config;
        const state = await records();
        if (state.vault && !sessionMatches(state)) fail('vaultLockedError');
        // Never silently send an existing credential to a different endpoint.
        if (!supplied && state.session && sessionMatches(state) && state.session.baseUrl !== safe.baseUrl) fail('vaultEndpointChanged');
        if (!supplied && state.migration && normalizeBaseUrl(state.settings.baseUrl) !== safe.baseUrl) fail('vaultEndpointChanged');
        const apiKey = checkKey(supplied || (state.migration ? state.settings.apiKey : sessionMatches(state) ? state.session.apiKey : ''));
        const replace = !!apiKey && (!!supplied || !!password || !state.vault);
        let vault = state.vault;
        if (replace) {
          checkPassword(password);
          if (password !== confirmation) fail('vaultPasswordMismatch');
          vault = await encryptCredential(apiKey, password, safe.baseUrl, cryptoImpl);
        } else if (password || confirmation) fail('vaultMissing');
        checkGeneration(expected);
        // Settings and ciphertext are written together, without apiKey.
        await storage.local.set({ settings: safe, ...(replace ? { credentialVault: vault } : {}) });
        if (replace) {
          checkGeneration(expected);
          await storage.session.set({ credentialSession: { id: vault.id, baseUrl: vault.baseUrl, apiKey } });
        }
        return status();
      });
    },
    async resolve(baseUrl, supplied = '') {
      const expected = generation;
      await queue;
      const state = await records();
      checkGeneration(expected);
      if (state.vault && !sessionMatches(state)) fail('vaultLockedError');
      if (state.migration) fail('vaultMigrationRequired');
      if (supplied) return checkKey(supplied);
      if (!state.vault) return '';
      if (state.vault.baseUrl !== normalizeBaseUrl(baseUrl)) fail('vaultEndpointChanged');
      return state.session.apiKey;
    }
  };
}
