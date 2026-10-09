// Loaded in extension pages and isolated content-script worlds, never the host page.
(() => {
  if (globalThis.TransightSpeechClient) return;
  globalThis.TransightSpeechClient = function (onState) {
    let port, activeId, heartbeat, disposed = false;
    function clear() { activeId = null; clearInterval(heartbeat); heartbeat = null; }
    function connect() {
      if (port) return port;
      const connected = chrome.runtime.connect({ name: 'transight-speech' });
      port = connected;
      connected.onMessage.addListener(message => {
        if (disposed || port !== connected || !activeId || message.id !== activeId) return;
        if (!['loading', 'playing', 'ended', 'stopped', 'error'].includes(message.state)) return;
        if (['ended', 'stopped', 'error'].includes(message.state)) clear();
        onState(message);
      });
      connected.onDisconnect.addListener(() => {
        void chrome.runtime.lastError;
        if (port !== connected) return;
        port = null;
        const id = activeId; clear();
        if (id && !disposed) onState({ id, state: 'error', error: 'speechFailed' });
      });
      return connected;
    }
    function stop() {
      const id = activeId; clear();
      if (id && port) { try { port.postMessage({ type: 'STOP', id }); } catch { /* Disconnection also stops playback. */ } }
    }
    return {
      play(text, language) {
        stop();
        const id = TransightRequestId(); activeId = id;
        try {
          connect().postMessage({ type: 'PLAY', id, text, language });
          // Messages keep the MV3 worker alive while speaking (Chrome 114+).
          heartbeat = setInterval(() => {
            try { port.postMessage({ type: 'PING' }); }
            catch { const failed = activeId; clear(); if (failed) onState({ id: failed, state: 'error', error: 'speechFailed' }); }
          }, 15000);
        } catch { clear(); queueMicrotask(() => { if (!disposed) onState({ id, state: 'error', error: 'speechFailed' }); }); }
        return id;
      },
      stop,
      dispose() { disposed = true; stop(); port?.disconnect(); port = null; }
    };
  };
})();
