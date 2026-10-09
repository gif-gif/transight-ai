// Shared by extension pages and isolated content scripts, including HTTP pages.
(() => {
  if (globalThis.TransightRequestId) return;
  globalThis.TransightRequestId = function () {
    if (typeof globalThis.crypto?.randomUUID === 'function') return globalThis.crypto.randomUUID();
    // randomUUID requires a secure context; getRandomValues also works on HTTP.
    // Keep cryptographic randomness and UUID v4 format without a Math.random fallback.
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  };
})();
