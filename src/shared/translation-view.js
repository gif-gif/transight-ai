// One controller for the toolbar popup and the isolated on-page translation view.
// Adapters provide privileged operations; this file never accesses extension storage.
(() => {
  if (globalThis.TransightTranslationView) return;
  const copyIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';
  const copiedIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>';
  const speakerIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m11 4-6 5H2v6h3l6 5V4Z"/><path d="M15 8a6 6 0 0 1 0 8M18 5a10 10 0 0 1 0 14"/></svg>';
  const stopIcon = '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  globalThis.TransightTranslationView = function (root, adapter, initialLocale, settings) {
    const $ = id => root.querySelector(`#${id}`);
    const container = root.querySelector('.translation-view') || root.documentElement;
    const supportsModes = typeof adapter.setTranslationMode === 'function';
    let locale = initialLocale, busy = false, disposed = false, revision = 0;
    let entries = [], statusState, configured = false;
    let editVersion = 0, vaultState, waitingForUnlock = false, pendingRetry = null;
    let speakingEntry, speechId, autoTranslateTimer, composing = false;
    let inputImages = [], imageGeneration = 0, importingImages = 0, imageQueue = Promise.resolve();
    // Same bounds are enforced independently by validateImages in the background.
    const maxImages = 5, maxImageLength = 8 * 1024 * 1024, maxTotalImageLength = 20 * 1024 * 1024;
    const speech = new TransightSpeechClient(message => {
      if (disposed || message.id !== speechId || !speakingEntry) return;
      if (['ended', 'stopped', 'error'].includes(message.state)) {
        const entry = speakingEntry; speakingEntry = null; speechId = null; renderSpeech(entry);
        if (message.state === 'error') statusKey(message.error === 'speechNoLocalVoice' ? 'speechNoLocalVoice' : 'speechFailed', true);
      }
    });
    function stopSpeech() {
      speech.stop(); const entry = speakingEntry; speakingEntry = null; speechId = null;
      if (entry) renderSpeech(entry);
    }
    const cardTemplate = $('result-card').cloneNode(true);
    const resultsList = $('results-list');
    const events = new AbortController();
    const listen = (element, event, fn) => element.addEventListener(event, fn, { signal: events.signal });
    if (adapter.unlockUrl) {
      const url = new URL(adapter.unlockUrl);
      const unlockOrigin = `${url.protocol}//${url.host}`;
      listen(window, 'message', event => {
        const frame = $('inline-unlock')?.querySelector('iframe');
        if (disposed || !event.isTrusted || !frame || event.source !== frame.contentWindow || event.origin !== unlockOrigin) return;
        if (event.data?.type !== 'TRANSIGHT_UNLOCK_SIZE' || !Number.isFinite(event.data.height)) return;
        frame.style.height = `${Math.max(80, Math.min(260, Math.ceil(event.data.height)))}px`;
      });
    }
    const t = (key, substitutions = []) => {
      const values = Array.isArray(substitutions) ? substitutions : [substitutions];
      return (locale.messages[key] || '').replace(/\$([1-9])/g, (_, n) => String(values[Number(n) - 1] ?? ''));
    };
    const languageKeys = { 'zh-CN': 'langZhCN', 'zh-TW': 'langZhTW', en: 'langEn', ja: 'langJa', ko: 'langKo', fr: 'langFr', de: 'langDe', es: 'langEs', ru: 'langRu', pt: 'langPt' };
    const languageName = code => t(languageKeys[code]) || code;
    function status(text, error = false) {
      statusState = null;
      delete $('status').dataset.key;
      $('status').textContent = text;
      $('status').className = `status${error ? ' error' : ''}`;
    }
    function renderAuthError(element) {
      const link = document.createElement('a');
      link.className = 'settings-link'; link.href = adapter.settingsUrl;
      link.textContent = t('configureApiKey');
      const [before, after = ''] = t('authSettingsPrompt').split(t('configureApiKey'));
      element.replaceChildren(t('http401'), before, link, after);
    }
    function statusKey(key, error = false) {
      status(t(key), error); statusState = { key, error }; $('status').dataset.key = key;
      if (key === 'http401') renderAuthError($('status'));
    }
    function localize(scope = root) {
      for (const el of scope.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
      for (const attr of ['placeholder', 'aria-label', 'title']) {
        for (const el of scope.querySelectorAll(`[data-i18n-${attr}]`)) el.setAttribute(attr, t(el.getAttribute(`data-i18n-${attr}`)));
      }
    }
    function setBusy(value) {
      busy = value;
      for (const id of ['translate', 'source', 'target', 'clear']) $(id).disabled = value;
      if (isSimple()) { $('source').disabled = false; $('target').disabled = false; }
      $('translate').disabled = value || importingImages > 0;
      if ($('screenshot')) $('screenshot').disabled = importingImages > 0;
      $('cancel-translation').hidden = !value;
      resultsList.setAttribute('aria-busy', String(value));
      $('translate-label').textContent = t(value ? 'loading' : (adapter.imageMode || inputImages.length) ? 'screenshotTranslateImage' : 'translate');
      $('translate-icon').classList.toggle('spinner', value);
    }
    function count() {
      $('count').textContent = $('source').value.length.toLocaleString('en-US') + ' / 12,000' + (inputImages.length ? ' · ' + inputImages.length + '/5' : '');
    }
    function isSimple() { return supportsModes && settings.translationMode === 'simple'; }
    function modelIds() {
      const models = settings.models ?? (settings.model ? [settings.model] : []);
      return isSimple() ? models.slice(0, 1) : models;
    }
    function renderMode() {
      container.classList.toggle('simple-translate', Boolean(isSimple()));
      $('source-language').hidden = false;
      root.querySelector('.ui-language-control').hidden = Boolean(adapter.selectionMode);
      $('source').readOnly = false;
      const button = $('translation-mode');
      button.hidden = !supportsModes;
      // Static layout icons: stacked model cards for Full, one result for Simple.
      button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${isSimple()
        ? '<rect x="4" y="3" width="16" height="7" rx="2"/><rect x="4" y="14" width="16" height="7" rx="2"/><path d="M8 6.5h8M8 17.5h8"/>'
        : '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 10h8M8 14h5"/>'}</svg>`;
      button.title = t(isSimple() ? 'switchFullMode' : 'switchSimpleMode');
      button.setAttribute('aria-label', button.title);
      if (!isSimple()) { $('source').style.height = ''; }
      else resizeSource();
    }
    function resizeSource() {
      if (isSimple()) {
        $('source').style.height = '0px';
        $('source').style.height = `${Math.max(48, Math.min(160, $('source').scrollHeight))}px`;
      }
    }
    function renderCopy(entry) {
      const button = entry.card.querySelector('.copy-result');
      button.disabled = entry.state !== 'success';
      // Packaged static icons only; translation text is never parsed as markup.
      button.innerHTML = entry.copied ? copiedIcon : copyIcon;
      button.dataset.copied = String(Boolean(entry.copied));
      button.title = t('copy');
      const label = t(entry.copied ? 'copied' : 'copy');
      button.setAttribute('aria-label', entry.model ? `${label} · ${entry.model}` : label);
    }
    function renderSpeech(entry) {
      const button = entry.card.querySelector('.speak-result');
      const active = speakingEntry === entry;
      button.disabled = entry.state !== 'success' || !entry.result?.text?.trim();
      button.innerHTML = active ? stopIcon : speakerIcon;
      button.setAttribute('aria-pressed', String(active));
      const label = t(active ? 'stopSpeech' : 'readTranslation');
      button.title = label;
      button.setAttribute('aria-label', entry.model ? `${label} · ${entry.model}` : label);
    }
    function clearCopyTimers() { for (const entry of entries) clearTimeout(entry.copyTimer); }
    function renderEntry(entry) {
      const { card, model, state, result, error } = entry;
      const title = card.querySelector('h3');
      title.textContent = isSimple() ? t('translation') : model || t('translation'); title.title = isSimple() ? '' : model;
      card.dataset.state = state;
      card.setAttribute('aria-busy', String(state === 'loading'));
      const content = card.querySelector('.result');
      renderCopy(entry); renderSpeech(entry);
      const meta = card.querySelector('.result-meta');
      meta.hidden = state === 'idle';
      if (state === 'idle') { localize(content); return; }
      if (state === 'loading') { content.textContent = t('waiting'); meta.textContent = t('loading'); }
      else if (state === 'cancelled') { content.textContent = t('translationCancelled'); meta.textContent = t('translationCancelled'); }
      else if (state === 'success') { content.textContent = result.text; meta.textContent = `${languageName(result.targetLanguage)} · ${t('complete')}`; }
      else {
        if (entry.errorCode === 'AUTH_REQUIRED') renderAuthError(content);
        else content.textContent = error;
        const retry = document.createElement('button');
        retry.type = 'button'; retry.className = 'retry-result'; retry.textContent = t('retryTranslation');
        retry.setAttribute('aria-label', `${t('retryTranslation')} · ${model}`);
        const [before, after = ''] = t('translationFailed').split(t('retryTranslation'));
        meta.replaceChildren(before, retry, after);
      }
    }
    function resetResult(state = 'idle') {
      stopSpeech(); clearCopyTimers();
      resultsList.replaceChildren();
      entries = (modelIds().length ? modelIds() : ['']).map((model, index) => {
        const card = cardTemplate.cloneNode(true);
        if (index) { card.removeAttribute('id'); for (const node of card.querySelectorAll('[id]')) node.removeAttribute('id'); }
        card.querySelector('h3').removeAttribute('data-i18n');
        card.dataset.model = model;
        const entry = { model, card, state };
        resultsList.append(card); renderEntry(entry); return entry;
      });
    }
    function cancel() { clearTimeout(autoTranslateTimer); revision++; waitingForUnlock = false; pendingRetry = null; adapter.cancel?.(); setBusy(false); }
    function cancelTranslation() {
      if (!busy) return;
      cancel(); clearCopyTimers();
      for (const entry of entries) {
        entry.copied = false;
        if (entry.state === 'loading') entry.state = 'cancelled';
        renderEntry(entry);
      }
      statusKey('translationCancelled');
      $('translate').focus();
    }
    function setVault(next) {
      if (disposed || !next) return;
      const previous = vaultState;
      vaultState = next.state;
      const holder = $('inline-unlock');
      if (vaultState === 'locked') {
        if (previous !== 'locked') {
          cancel();
          for (const entry of entries) if (entry.state === 'loading') {
            entry.state = 'error'; entry.error = t('vaultLockedError'); renderEntry(entry);
          }
          statusKey('vaultLockedError');
        }
        holder.hidden = false;
        if (!holder.firstChild && adapter.unlockUrl) {
          const frame = document.createElement('iframe');
          frame.src = adapter.unlockUrl;
          frame.title = t('vaultUnlockPassword');
          holder.append(frame);
        }
      } else {
        holder.hidden = true; holder.replaceChildren();
        const resume = previous === 'locked' && vaultState === 'unlocked' && waitingForUnlock;
        const retry = pendingRetry;
        waitingForUnlock = false; pendingRetry = null;
        if (resume) { if (retry && entries.includes(retry)) retryEntry(retry); else translate(); }
        else if (previous === 'locked' && vaultState === 'unlocked') status('');
      }
    }
    function updateBatchStatus() {
      const pending = entries.some(entry => entry.state === 'loading');
      setBusy(pending);
      if (pending) { statusKey('waiting'); return; }
      const failures = entries.filter(entry => entry.state === 'error');
      if (entries.some(entry => entry.state === 'cancelled')) statusKey('translationCancelled');
      else if (!failures.length) statusKey('complete');
      else if (entries.length === 1) {
        if (failures[0].errorCode === 'AUTH_REQUIRED') statusKey('http401', true);
        else status(failures[0].error, true);
      }
      else statusKey(failures.length === entries.length ? 'allModelsFailed' : 'partialModelsFailed', true);
    }
    async function translateEntry(entry, current) {
      if (speakingEntry === entry) stopSpeech();
      entry.state = 'loading'; entry.error = undefined; entry.errorCode = undefined;
      renderEntry(entry); updateBatchStatus();
      try {
        const result = await adapter.translate(entry.request.text, entry.request.target, entry.model, entry.request.images, entry.request.sourceLanguage);
        if (disposed || current !== revision) return;
        if (!result?.ok) {
          const error = new Error(result?.error || t('backgroundFailed'));
          if (result?.code === 'AUTH_REQUIRED') error.code = result.code;
          throw error;
        }
        entry.result = result; entry.state = 'success';
      } catch (error) {
        if (disposed || current !== revision) return;
        entry.error = error.message || t('backgroundFailed'); entry.errorCode = error.code; entry.state = 'error';
      }
      if (!disposed && current === revision) { renderEntry(entry); updateBatchStatus(); }
    }
    async function retryEntry(entry) {
      // Other models may still be loading: retry only this failed card, using the
      // original request. Recheck its state after the vault lookup to prevent duplicates.
      if (disposed || entry.state !== 'error' || !entry.request) return;
      const current = revision;
      if (adapter.getVaultStatus) {
        try {
          const vault = await adapter.getVaultStatus();
          if (disposed || current !== revision || entry.state !== 'error') return;
          setVault(vault);
          if (vault.state === 'locked') {
            pendingRetry = entry; waitingForUnlock = true; statusKey('vaultLockedError');
            $('inline-unlock').scrollIntoView({ block: 'nearest' }); return;
          }
          if (vault.state === 'migration') { statusKey('vaultMigrationRequired', true); return; }
        } catch { if (!disposed && current === revision) statusKey('readConfigFailed', true); return; }
      }
      return translateEntry(entry, revision);
    }
    async function translate() {
      clearTimeout(autoTranslateTimer);
      if (busy || disposed || importingImages || composing) return;
      stopSpeech();
      if (!configured) { statusKey('connectFirst', true); return; }
      if (adapter.imageMode && !inputImages.length) { statusKey('screenshotSelectFirst', true); return; }
      if (!adapter.imageMode && !inputImages.length && !$('source').value.trim()) { statusKey('enterText', true); $('source').focus(); return; }
      if ($('source').value.length > 12000) { statusKey('selectionTooLong', true); return; }
      const current = ++revision, text = $('source').value, target = $('target').value, images = [...inputImages], sourceLanguage = $('source-language').value;
      waitingForUnlock = false; pendingRetry = null;
      if (adapter.getVaultStatus) {
        setBusy(true);
        try {
          const vault = await adapter.getVaultStatus();
          if (disposed || current !== revision) return;
          setBusy(false); setVault(vault);
          if (vault.state === 'locked') {
            waitingForUnlock = true; statusKey('vaultLockedError');
            $('inline-unlock').scrollIntoView({ block: 'nearest' });
            return;
          }
          if (vault.state === 'migration') { statusKey('vaultMigrationRequired', true); return; }
        } catch {
          if (!disposed && current === revision) { setBusy(false); statusKey('readConfigFailed', true); }
          return;
        }
      }
      setBusy(true); resetResult('loading'); statusKey('waiting');
      for (const entry of entries) entry.request = { text, target, images, sourceLanguage };
      await Promise.all(entries.map(entry => translateEntry(entry, current)));
    }
    function closeMenu(focus = false) {
      $('ui-language-menu').hidden = true;
      $('ui-language').setAttribute('aria-expanded', 'false');
      if (focus) $('ui-language').focus();
    }
    function setLocale(next) {
      locale = next; container.lang = next.language;
      localize();
      const target = $('target').value || settings.targetLanguage;
      $('target').replaceChildren();
      for (const code of Object.keys(languageKeys)) {
        const option = document.createElement('option'); option.value = code; option.textContent = languageName(code); $('target').append(option);
      }
      $('target').value = target;
      const sourceLanguage = $('source-language').value || 'auto';
      $('source-language').replaceChildren();
      for (const code of ['auto', ...Object.keys(languageKeys)]) {
        const option = document.createElement('option'); option.value = code;
        option.textContent = code === 'auto' ? t('autoDetect') : languageName(code);
        $('source-language').append(option);
      }
      $('source-language').value = sourceLanguage;
      renderMode(); renderSource(); setBusy(busy);
      for (const button of root.querySelectorAll('[data-language]')) button.setAttribute('aria-pressed', String(button.dataset.language === next.preference));
      entries.forEach(renderEntry);
      if (statusState) statusKey(statusState.key, statusState.error);
      const unlockFrame = $('inline-unlock')?.querySelector('iframe');
      if (unlockFrame) unlockFrame.title = t('vaultUnlockPassword');
      adapter.localized?.(locale);
    }
    function applySettings(next, updateTarget = true) {
      const modeChanged = supportsModes && settings.translationMode !== next.translationMode;
      const changed = JSON.stringify(settings) !== JSON.stringify(next);
      if (changed) cancel();
      settings = next; renderMode(); configured = Boolean(modelIds().length && next.consent); $('setup').hidden = configured;
      if (changed || !entries.length) { resetResult(); status(''); }
      if (updateTarget && !busy) $('target').value = next.targetLanguage;
      if (changed && (isSimple() || modeChanged) && ($('source').value.trim() || inputImages.length)) translate();
    }
    function renderSource() {
      const gallery = $('source-images'), wrap = $('source-image-wrap');
      if (!gallery || !wrap) return;
      wrap.hidden = !inputImages.length;
      gallery.replaceChildren();
      inputImages.forEach((image, index) => {
        const item = document.createElement('div'); item.className = 'source-thumbnail'; item.setAttribute('role', 'listitem');
        const preview = document.createElement('img'); preview.src = image; preview.alt = t('screenshotPreview') + ' ' + (index + 1);
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-source-image'; remove.dataset.index = String(index);
        remove.title = t('removeImage', String(index + 1)); remove.setAttribute('aria-label', remove.title);
        remove.innerHTML = '<svg aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m4 4 8 8M12 4l-8 8"/></svg>';
        item.append(preview, remove); gallery.append(item);
      });
      count();
    }
    function resetImages() { imageGeneration++; importingImages = 0; inputImages = []; }
    function setDraft(draft) {
      input(draft.text || '', false); inputImages = [...draft.images]; renderSource(); setBusy(false);
    }
    function setImage(image) { setDraft({ text: '', images: image ? [image] : [] }); }
    function getDraft() {
      if (importingImages) throw new Error(t('imageProcessing'));
      return { text: $('source').value, images: [...inputImages] };
    }
    function input(text, auto = isSimple()) {
      resetImages(); renderSource(); cancel(); editVersion++; $('source').value = text; renderMode(); count(); resetResult(); status('');
      if (text.length > 12000) statusKey('selectionTooLong', true);
      else if (auto && text.trim()) translate();
    }
    if ($('source-images')) listen($('source-images'), 'click', event => {
      const button = event.target.closest('.remove-source-image'); if (!button) return;
      const index = Number(button.dataset.index);
      stopSpeech(); cancel(); editVersion++; inputImages.splice(index, 1); resetResult(); status(''); renderSource(); setBusy(false);
      ($('source-images').querySelectorAll('button')[Math.min(index, inputImages.length - 1)] || $('source')).focus();
    });
    async function clipboardImage(file) {
      if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp'].includes(file.type)) throw new Error('imageUnsupported');
      if (file.size > 20 * 1024 * 1024) throw new Error('imageTooLarge');
      let bitmap;
      try { bitmap = await createImageBitmap(file); } catch { throw new Error('screenshotInvalid'); }
      try {
        if (bitmap.width * bitmap.height > 40000000) throw new Error('imageTooLarge');
        const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
        const context = canvas.getContext('2d'); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const image = canvas.toDataURL('image/jpeg', .92);
        if (image.length > maxImageLength) throw new Error('imageTooLarge');
        return image;
      } finally { bitmap.close(); }
    }
    listen($('source'), 'paste', event => {
      if (isSimple()) return;
      const data = event.clipboardData;
      const files = Array.from(data?.items || []).filter(item => item.kind === 'file' && item.type.startsWith('image/')).map(item => item.getAsFile()).filter(Boolean);
      if (!files.length) return; // Normal text paste remains entirely native.
      event.preventDefault(); event.stopPropagation();
      if (disposed || busy) return;
      const text = data.getData('text/plain');
      if (text) {
        const source = $('source'), room = 12000 - source.value.length + source.selectionEnd - source.selectionStart;
        source.setRangeText(text.slice(0, room), source.selectionStart, source.selectionEnd, 'end');
      }
      stopSpeech(); cancel(); editVersion++; resetResult(); count();
      const generation = imageGeneration;
      importingImages++; setBusy(false); statusKey('imageProcessing');
      imageQueue = imageQueue.catch(() => {}).then(async () => {
        if (disposed || generation !== imageGeneration) return;
        let failure;
        for (const file of files) {
          if (inputImages.length >= maxImages) { failure = 'imageLimit'; break; }
          try {
            const image = await clipboardImage(file);
            if (disposed || generation !== imageGeneration) return;
            if (inputImages.reduce((sum, value) => sum + value.length, image.length) > maxTotalImageLength) throw new Error('imageTotalTooLarge');
            inputImages.push(image); renderSource();
          } catch (error) { failure = ['imageUnsupported', 'imageTooLarge', 'imageTotalTooLarge'].includes(error.message) ? error.message : 'screenshotInvalid'; }
          if (disposed || generation !== imageGeneration) return;
        }
        if (failure) statusKey(failure, true); else status('');
      }).finally(() => {
        if (disposed || generation !== imageGeneration) return;
        importingImages--; setBusy(busy);
      });
    });
    function sourceEdited(event) {
      cancel(); editVersion++; count(); resizeSource(); resetResult(); status('');
      // Wait for a pause in typing and for IME composition to finish. Editing,
      // switching languages/mode, clearing, and closing cancel pending work.
      if (isSimple() && !composing && !event?.isComposing && ($('source').value.trim() || inputImages.length)) {
        autoTranslateTimer = setTimeout(() => { if (!disposed && isSimple()) translate(); }, 600);
      }
    }
    listen($('source'), 'input', sourceEdited);
    listen($('source'), 'compositionstart', () => { composing = true; sourceEdited(); });
    listen($('source'), 'compositionend', () => { composing = false; sourceEdited(); });
    listen($('source-language'), 'change', () => {
      cancel(); resetResult(); status('');
      if (isSimple() || adapter.autoTranslateTarget) translate();
    });
    listen($('translation-mode'), 'click', async () => {
      const button = $('translation-mode'), translationMode = isSimple() ? 'full' : 'simple';
      button.disabled = true;
      try {
        await adapter.setTranslationMode(translationMode);
        if (!disposed) applySettings({ ...settings, translationMode });
      } catch { if (!disposed) statusKey('modeSaveFailed', true); }
      finally { if (!disposed) button.disabled = false; }
    });
    listen($('target'), 'change', async () => {
      cancel(); resetResult(); status('');
      const current = revision, target = $('target').value;
      // Update before saving: our own storage broadcast must not cancel the new batch.
      settings = { ...settings, targetLanguage: target };
      try { await adapter.setTargetLanguage(target); }
      catch { if (!disposed && current === revision) statusKey('targetLanguageSaveFailed', true); return; }
      if (!disposed && current === revision && (isSimple() || adapter.autoTranslateTarget)) translate();
    });
    listen($('clear'), 'click', () => { input(''); $('source').focus(); });
    listen($('translate'), 'click', translate);
    listen($('cancel-translation'), 'click', cancelTranslation);
    listen(root, 'click', event => {
      if (!event.target.closest?.('.settings-link')) return;
      event.preventDefault(); adapter.openSettings();
    });
    listen($('settings'), 'click', () => adapter.openSettings());
    listen($('setup'), 'click', () => adapter.openSettings());
    listen(resultsList, 'click', async event => {
      const button = event.target.closest('.copy-result, .retry-result, .speak-result');
      if (!button) return;
      const entry = entries.find(item => item.card.contains(button));
      if (entry && button.classList.contains('retry-result')) { await retryEntry(entry); return; }
      if (!entry || entry.state !== 'success') return;
      if (button.classList.contains('speak-result')) {
        if (speakingEntry === entry) { stopSpeech(); return; }
        stopSpeech(); speakingEntry = entry;
        if (['speechFailed', 'speechNoLocalVoice'].includes(statusState?.key)) status('');
        // A result keeps its request language even if interface preferences change.
        speechId = speech.play(entry.result.text, entry.request.target);
        renderSpeech(entry); return;
      }
      const current = revision, attempt = entry.copyAttempt = (entry.copyAttempt || 0) + 1;
      const active = () => !disposed && current === revision && entries.includes(entry);
      const valid = () => active() && attempt === entry.copyAttempt;
      try {
        await navigator.clipboard.writeText(entry.result.text);
        if (!valid()) return;
        clearTimeout(entry.copyTimer); entry.copied = true; renderCopy(entry);
        entry.copyTimer = setTimeout(() => {
          if (!active()) return;
          entry.copied = false; renderCopy(entry);
        }, 1500);
      } catch {
        if (!valid()) return;
        clearTimeout(entry.copyTimer); entry.copied = false; renderCopy(entry); statusKey('copyFailed', true);
      }
    });
    listen($('ui-language'), 'click', () => {
      const open = $('ui-language-menu').hidden; $('ui-language-menu').hidden = !open;
      $('ui-language').setAttribute('aria-expanded', String(open));
      if (open) $('ui-language-menu').querySelector('[aria-pressed="true"]').focus();
    });
    listen($('ui-language-menu'), 'click', async event => {
      const button = event.target.closest('[data-language]'); if (!button) return;
      closeMenu(true);
      try { const next = await adapter.setLanguage(button.dataset.language); if (!disposed && next) setLocale(next); }
      catch { if (!disposed) statusKey('languageSaveFailed', true); }
    });
    listen(root, 'click', event => { if (!event.target.closest?.('.ui-language-control')) closeMenu(); });
    listen(root, 'keydown', event => {
      if (!event.isComposing && !composing && (event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); event.stopPropagation(); translate(); }
      if (event.key === 'Escape') {
        if (!$('ui-language-menu').hidden) { event.preventDefault(); event.stopPropagation(); closeMenu(true); }
        else if (adapter.close) { event.preventDefault(); event.stopPropagation(); adapter.close(); }
      }
    });
    $('close-view').hidden = !adapter.close;
    if (adapter.close) listen($('close-view'), 'click', () => adapter.close());
    setLocale(locale); applySettings(settings); setVault(adapter.vault);
    return { setLocale, applySettings, setVault, input, status, statusKey, cancel,
      setImage, setDraft, getDraft, get editVersion() { return editVersion; },
      dispose() { resetImages(); renderSource(); stopSpeech(); speech.dispose(); $('inline-unlock').replaceChildren(); disposed = true; clearCopyTimers(); cancel(); events.abort(); } };
  };
})();
