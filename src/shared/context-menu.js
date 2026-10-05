// Both entry points open the same content-script view and request lifecycle.
export async function openContextTranslation(info, tab) {
  if (info.menuItemId !== 'yijian-translate' || !info.selectionText || !tab?.id) return;
  const frameId = info.frameId ?? 0;
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [frameId] },
      files: ['src/shared/speech-client.js', 'src/shared/translation-view.js', 'src/content/selection.js']
    });
    const response = await chrome.tabs.sendMessage(tab.id, {
      type: 'SELECTION_OPEN', text: info.selectionText
    }, { frameId });
    if (!response?.ok) throw new Error('Floating view unavailable');
  } catch {
    // Restricted pages/frames still use the shared popup in a standalone window.
    await chrome.storage.session.set({ contextDraft: info.selectionText });
    await chrome.windows.create({
      url: chrome.runtime.getURL('src/popup/popup.html?fallback=1'),
      type: 'popup', width: 400, height: 740
    });
  }
}
