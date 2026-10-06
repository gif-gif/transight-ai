// One in-memory speech session for the whole extension. No text/audio is stored.
// Use the same local Chinese voice for every result, independent of its target language.
const playbackLanguage = 'zh-CN';
const languages = new Set(['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'ru', 'pt']);
const normalize = value => String(value || '').replaceAll('_', '-').toLowerCase();
export function selectLocalVoice(voices, language) {
  const target = normalize(language), base = target.split('-')[0];
  const local = voices.filter(voice => voice.remote === false && voice.voiceName &&
    normalize(voice.lang).split('-')[0] === base && voice.eventTypes?.includes('end'));
  return local.find(voice => normalize(voice.lang) === target) || local[0];
}

export function speechChunks(text, limit = 240) {
  const chunks = [];
  // Keep sentence/paragraph boundaries where possible; never split a surrogate pair.
  for (const sentence of text.match(/[^.!?。！？\n]+[.!?。！？\n]*|[.!?。！？\n]+/gu) || []) {
    let chars = Array.from(sentence.trim());
    while (chars.length) {
      let size = Math.min(limit, chars.length);
      if (chars.length > limit) {
        const space = chars.slice(0, limit).lastIndexOf(' ');
        if (space > limit / 2) size = space + 1;
      }
      const chunk = chars.slice(0, size).join('').trim();
      if (chunk) chunks.push(chunk);
      chars = chars.slice(size);
    }
  }
  return chunks;
}

export function createSpeechController(tts, runtime, timers = globalThis) {
  let active;
  function notify(job, state, error) { job.emit({ id: job.id, state, ...(error ? { error } : {}) }); }
  function finish(job, state = 'stopped', error, stopEngine = true) {
    if (active !== job) return;
    active = null; timers.clearTimeout(job.timer);
    if (stopEngine && job.started) { try { tts.stop(); } catch { /* Already unavailable. */ } }
    notify(job, state, error);
  }
  function playChunk(job) {
    if (active !== job) return;
    if (job.index === job.chunks.length) { finish(job, 'ended', undefined, false); return; }
    const index = job.index;
    const valid = () => active === job && index === job.index;
    job.timer = timers.setTimeout(() => { if (valid()) finish(job, 'error', 'speechFailed'); }, 90000);
    try {
      job.started = true;
      tts.speak(job.chunks[index], {
        voiceName: job.voice.voiceName, ...(job.voice.extensionId ? { extensionId: job.voice.extensionId } : {}),
        lang: job.voice.lang, rate: 1, pitch: 1, volume: 1, enqueue: false,
        requiredEventTypes: ['end'],
        onEvent(event) {
          if (!valid()) return;
          if (event.type === 'start') notify(job, 'playing');
          else if (event.type === 'end') {
            timers.clearTimeout(job.timer); job.index++; playChunk(job);
          } else if (['interrupted', 'cancelled'].includes(event.type)) finish(job, 'stopped', undefined, false);
          else if (event.type === 'error') finish(job, 'error', 'speechFailed');
        }
      }, () => { const error = runtime.lastError; if (error && valid()) finish(job, 'error', 'speechFailed'); });
    } catch { finish(job, 'error', 'speechFailed'); }
  }
  return {
    start(owner, message, emit) {
      if (typeof message.id !== 'string' || !message.id || message.id.length > 80 ||
          typeof message.text !== 'string' || !message.text.trim() || message.text.length > 100000 ||
          !languages.has(message.language)) { emit({ id: message.id, state: 'error', error: 'speechFailed' }); return; }
      if (active) finish(active);
      const job = { owner, id: message.id, emit, chunks: speechChunks(message.text), index: 0, started: false };
      active = job; notify(job, 'loading');
      job.timer = timers.setTimeout(() => finish(job, 'error', 'speechFailed'), 10000);
      try {
        tts.getVoices(voices => {
          const error = runtime.lastError;
          if (active !== job) return;
          timers.clearTimeout(job.timer);
          if (error) { finish(job, 'error', 'speechFailed'); return; }
          job.voice = selectLocalVoice(voices || [], playbackLanguage);
          if (!job.voice) { finish(job, 'error', 'speechNoLocalVoice'); return; }
          playChunk(job);
        });
      } catch { finish(job, 'error', 'speechFailed'); }
    },
    stop(owner, id) { if (active?.owner === owner && (!id || active.id === id)) finish(active); }
  };
}

export function installSpeech(api = chrome) {
  const controller = createSpeechController(api.tts, api.runtime);
  api.runtime.onConnect.addListener(port => {
    if (port.name !== 'transight-speech') return;
    const sender = port.sender;
    const popup = ['src/popup/popup.html', 'src/screenshot/screenshot.html'].some(path => sender?.url?.split(/[?#]/)[0] === api.runtime.getURL(path));
    const content = sender?.tab?.id != null && Number.isInteger(sender.frameId) && sender.frameId >= 0 && /^https?:\/\//.test(sender.url || '');
    if (sender?.id !== api.runtime.id || (!popup && !content)) { port.disconnect(); return; }
    let closed = false;
    const emit = message => { if (!closed) { try { port.postMessage(message); } catch { controller.stop(port); } } };
    port.onMessage.addListener(message => {
      if (closed) return;
      if (message?.type === 'PLAY') controller.start(port, message, emit);
      else if (message?.type === 'STOP') controller.stop(port, message.id);
      else if (message?.type === 'PING') emit({ type: 'PONG' });
    });
    port.onDisconnect.addListener(() => { closed = true; controller.stop(port); });
  });
}
