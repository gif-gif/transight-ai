import { t } from './i18n.js';
import { normalizeBaseUrl } from './settings.js';

// Model discovery needs only connection details, not a model or translation consent.
export function modelConnection(input) {
  const baseUrl = normalizeBaseUrl(input.baseUrl);
  const apiKey = String(input.apiKey ?? '').trim();
  if (/[\r\n]/.test(apiKey)) throw new Error(t('invalidKey'));
  return { baseUrl, apiKey };
}

export async function fetchModels(input, { fetchImpl = fetch, timeoutMs = 15000, signal } = {}) {
  const { baseUrl, apiKey } = modelConnection(input);
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
  try {
    const response = await fetchImpl(`${baseUrl}/models`, {
      method: 'GET', headers: { Accept: 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}) },
      signal: controller.signal, credentials: 'omit', redirect: 'error', cache: 'no-store'
    });
    if (!response.ok) {
      // Provider bodies can contain credentials. Never display them to the user.
      const keys = { 401: 'http401', 403: 'http403', 404: 'modelsUnsupported', 405: 'modelsUnsupported', 429: 'http429' };
      throw new Error(keys[response.status] ? t(keys[response.status]) : t('httpError', String(response.status)));
    }
    let body;
    try { body = await response.json(); } catch {
      if (controller.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      throw new Error(t('modelsInvalid'));
    }
    if (!Array.isArray(body?.data)) throw new Error(t('modelsInvalid'));
    const ids = [...new Set(body.data.map(model => model?.id).filter(id =>
      typeof id === 'string' && id.trim() && id.length <= 200 && !/[\u0000-\u001f\u007f]/.test(id)
    ).map(id => id.trim()))].sort((a, b) => a.localeCompare(b, 'en'));
    if (!ids.length) throw new Error(t('modelsEmpty'));
    return ids;
  } catch (error) {
    if (timedOut) throw new Error(t('modelsTimeout'));
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (error instanceof TypeError) throw new Error(t('networkError'));
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
