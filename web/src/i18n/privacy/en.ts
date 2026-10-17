export const enPrivacy = {
  title: 'Privacy Policies',
  description: 'How Transight AI handles translation text, API credentials, local settings, and website language preferences.',
  eyebrow: 'TRANSPARENT BY DESIGN',
  updated: 'Last updated',
  date: "October 14, 2026",
  intro: 'This policy covers the Transight AI (译见 AI) browser extension and this official website. It describes the current implementation maintained by the Transight AI open-source project maintainers, reachable through the project repository.',
  summaryTitle: 'Your text. Your chosen service.',
  summary: "Selecting text or previewing images alone does not upload them. AI uses your configured service; Simple can retranslate automatically. The Google buttons send text or the current page URL to Google only when clicked. Settings stay local; the extension keeps no persistent translation history, but Google destination URLs may remain in browser history. AI page translation sends rendered page text and subsequent dynamic text only after its separate confirmation; the first model is used and provider charges may apply.",
  contents: 'On this page',
  back: 'Back to home',
  sections: [
  {
    "id": "data",
    "title": "1. Data we process and why",
    "paragraphs": [
      "Source text and translations: the extension processes text you type, paste, or select to translate it and optionally compare results from multiple models. Opening the toolbar popup can read the current selection to prefill the input. The extension does not automatically upload entire pages.",
      "Service configuration: Base URL, API key, selected models, language and style preferences, consent, Simple / Full mode, selection-translation toggle and your custom system prompt support your chosen translation workflow. Settings and custom prompts are saved locally; prompts are sent as translation instructions to the service. Do not put secrets in a prompt.",
      "For selection / manual text translation: Page context: URLs and origins are inspected locally for page support and panels, not stored as browsing history or added as separate request fields. For webpage text translation, the default system prompt includes the available page title and description metadata. Remove {{title_prompt}} and {{summary_prompt}} to omit these. The extension does not fetch the entire page or ask AI to generate a summary. Manual text without page context and image requests do not include this metadata.",
      "The extension has no dedicated identity, location, payment, health-record, or email collection feature. However, anything you include in the source text, including personal or sensitive information, is sent with that text; it is not automatically filtered out.",
      "Images: in Full mode, you can paste up to 5 images into the toolbar or page panel source field. Supported PNG, JPEG, WebP, GIF and BMP images are converted locally to static JPEG, with the longest side capped at 2,048 pixels; SVG is not supported. Translation sends retained images and text to your selected image-capable model, with no separate OCR service or automatic model switch. Previewing alone does not upload images. Images stay in interface memory, not local/session storage or a persistent history; clear input or close the interface to discard them.",
      "Read aloud: chrome.tts receives the result text and uses a Chinese voice explicitly marked local (zh-CN preferred), independent of the target language. Long text is split into chunks without rewriting it. There is no cloud-voice fallback, autoplay, microphone access or saved audio. Playback text is held in memory; local voice availability depends on your system.",
      "Google entries: free text translation puts source text (up to 5,000 characters), source/target languages and interface language in a Google Translate URL. Whole-page translation puts the current HTTP/HTTPS page URL, including its query parameters, and target language in a Google URL. Neither entry sends API keys, images or the AI system prompt. The page-context description above applies to AI requests, not these explicit Google links."
    ]
  },
  {
    "id": "requests",
    "title": "2. When network requests occur",
    "paragraphs": [
      "For selection / manual text and image translation: Translation sends source text, retained images if any, model ID, source/target language instructions and the rendered system prompt to /chat/completions at your Base URL. The prompt may include page context as described above. The configured API key is sent via Authorization: Bearer. Full sends a separate request per selected model; Simple uses only the first model.",
      "Clicking the selection icon, using context-menu translation, pressing Translate or its shortcut, retrying, or changing languages or modes in a page panel may start requests. Once Simple is open, editing text automatically retranslates after about 0.6 seconds of inactivity; language changes also retranslate. Selecting text and pasting/previewing images alone do not upload them. Cancel aborts the local request but cannot retract data or processing already received by the service. If the toolbar opens with selected text while Simple is enabled, it can translate automatically; Full waits for Translate.",
      "Model discovery requests /models with your connection credentials but without source text. You can perform this action before confirming translation consent; that consent is not a blanket block on all network requests.",
      "Connection testing sends the sample text “Hello, world!” to each selected model with Simplified Chinese as the target language. The service receives the configured authentication credentials, just as for translation.",
      "Google text and whole-page translation open a new browser tab only after you click their respective buttons; no AI setup or key unlock is required. Google text translation is enabled by default and can be disabled independently in settings. These are public Google pages, not extension-side Google API calls. Results are not inserted back into the extension. Simple AI automatic requests remain separate."
    ]
  },
  {
    "id": "ai-page",
    "title": "AI page translation: consent, scope and temporary data",
    "paragraphs": [
      "AI page translation is separate from selection / manual translation and Google links. Opening its confirmation bar sends no page text. After Agree and start, it sends rendered text fragments from the top-level page to /chat/completions at your configured service, using the first selected model, target language and style with a dedicated structured prompt. Your custom plain-text prompt is not applied. Authentication uses the same protected API key, if configured.",
      "The session prioritizes visible text, then other rendered text and newly inserted or newly visible content. Form values, editable regions, code, hidden content and excluded elements are skipped; image text, PDF, Canvas, iframe and Shadow DOM contents are unsupported. This is not a sensitive-data filter: ordinary text on signed-in pages can contain private information. The feature does not upload the whole HTML, cookies or the page URL; a URL appearing in ordinary text may still be part of that text.",
      "Originals and translations remain in the current page memory, not a persistent history. chrome.storage.session holds temporary authorization, model/endpoint, target language, counters and timing, not page body text. Temporary session records are cleaned up when the tab closes, authorization expires or the browser closes. Switching original / translation reuses memory without another request. The page URL is checked locally to stop after navigation and require new confirmation.",
      "You can stop, restore and end, or close the bar. Stop cancels pending work and keeps completed translations; restoring only changes nodes still matching the extension-written text, so later website edits are not overwritten. None of these actions retracts text or charges already received by a provider. Each round permits up to 60,000 characters or 100 requests, including failed requests; continuing or restarting begins a new round and may add charges. These limits are not a hard cost cap."
    ]
  },
  {
    "id": "providers",
    "title": "3. Recipients and third-party services",
    "paragraphs": [
      "Requests go to the AI endpoint you configure, which may be an external provider or your own local service. There is no developer-operated translation relay built into the extension. The default endpoint is https://api.openai.com/v1; it includes no bundled API key and you can change it.",
      "The receiving service can also observe network information such as your IP address. Its retention, training use, processing location, international transfers, and deletion practices depend on that service’s policies and your agreement with it. We do not promise zero retention or no training on behalf of any provider.",
      "The extension does not sell user data or use it for advertising, behavioral analytics, credit assessment, or lending. Its processing is for translation and the related settings and connection functions described here. Following a GitHub or Chrome Web Store link takes you to a separate service governed by its own privacy policy.",
      "When using either Google entry, Google is the recipient and its privacy policy and service terms apply. Unlike AI fetch requests that omit cookies, these are ordinary browser navigations and may use your existing Google sign-in and cookies. The extension does not read or forward those cookies itself."
    ]
  },
  {
    "id": "storage",
    "title": "4. Local storage and retention",
    "paragraphs": [
      "Configuration, preferences, consent, and password-encrypted API credentials are saved in chrome.storage.local, not Chrome sync. The API key is encrypted; ordinary settings such as the Base URL, model IDs, and language preferences are not encrypted by this feature. Saved settings and encrypted credentials remain until you change or delete them or uninstall the extension.",
      "Unlocked API keys are temporarily cached in restricted chrome.storage.session memory until you lock them, restart the browser, or reload, update, or disable the extension. Passwords and derived encryption keys are not saved.",
      "Legacy plaintext credentials cannot be used for requests until password encryption is completed. The old plaintext remains until the encrypted vault is successfully saved to prevent data loss; complete migration promptly.",
      "Source text and results are primarily held in the current interface’s memory, without a persistent translation history. Clearing the input or closing the interface removes the current display, but cannot recall requests already received by a service.",
      "For the standalone fallback window, selected text is temporarily placed in chrome.storage.session.contextDraft. It is removed when that window reads it; if never read, it may remain until the browser session ends. The standalone fallback also temporarily stores the original page URL in chrome.storage.session.contextPageUrl for the whole-page button. It is removed with chrome.storage.session.contextDraft when the fallback reads them, or when the session ends if never read.",
      "Copying writes the translation to the system clipboard. Pasting into the source field supplies the text or images from that user-triggered paste event; the extension does not read the clipboard in the background or request clipboard-read permission. Clipboard contents may remain under operating-system or other clipboard-tool control.",
      "The Google text toggle is saved in chrome.storage.local and synchronizes immediately across open extension views. Text and page URLs embedded in Google destination links may be retained in browser history or by Google. Clearing extension input, removing settings or uninstalling does not remove those records; manage them through the browser and Google controls."
    ]
  },
  {
    "id": "permissions",
    "title": "5. Browser permissions",
    "paragraphs": [
      "storage saves settings and temporary fallback text. contextMenus adds the Translate selection command. activeTab and scripting support reading the active selection and injecting the packaged translation panel when you use the extension.",
      "Host access to http://*/* and https://*/* lets selection translation work on ordinary webpages and permits connections to user-chosen AI endpoints whose hostnames are not fixed. HTTP website access is distinct from the stricter API transport rules below.",
      "Executable scripts and styles are packaged with the extension. Remote model lists and translations are handled as data, not executable code. There is no remotely downloaded script or executable update mechanism outside the store.",
      "The tts permission enables user-triggered local speech. No microphone or clipboard-read permission is requested. The current popup has no built-in region-screenshot button; use your system screenshot tool and paste an image. Packaged capture/crop support remains in the code but is not a visible entry point."
    ]
  },
  {
    "id": "security",
    "title": "6. Security and its limits",
    "paragraphs": [
      "Non-local AI endpoints must use HTTPS. Plain HTTP is accepted only for localhost or 127.0.0.1 endpoints. HTTPS is preferable where available; a local HTTP connection is not encrypted in transit.",
      "API keys are encrypted at rest using AES-256-GCM and a key derived from your password with PBKDF2-SHA-256 (600,000 iterations, random salt, and a fresh IV for each encryption). Local and session storage are restricted to trusted extension contexts. Only the background worker resolves saved keys for translation and model discovery; content scripts never receive them. Passwords are not sent to AI providers. Encryption protects locked persistent data, not a compromised browser, device, or an unlocked session.",
      "Encryption at rest does not hide your API key from your chosen AI service: requests still send it as an authentication credential, using the transport rules above.",
      "AI service requests omit browser cookies and reject redirects. Google links instead open normal browser tabs as described above. No storage or transmission method is completely secure. Protect your browser profile and revoke or rotate exposed API keys with their provider."
    ]
  },
  {
    "id": "choices",
    "title": "7. Your choices and deletion",
    "paragraphs": [
      "You choose the source text, AI service, models, and translation settings. Avoid submitting sensitive information unless you understand and accept the receiving service’s handling of it.",
      "You can edit your saved configuration in extension settings, clear the current input, restrict website access through Chrome’s extension controls, disable the extension, or uninstall it to remove its local settings. Use Lock now to remove the unlocked session key and cancel active requests, or Forgot password / remove saved key to delete the ciphertext and session key while keeping other settings. Forgotten passwords cannot be recovered; enter your API key again. These actions cannot retract requests already received by a provider. There is no dedicated delete-all-data button.",
      "To revoke an API key or request deletion of data already sent to an AI service, contact that provider or use its account controls. Removing local settings or uninstalling the extension does not delete provider-side records or system clipboard contents."
    ]
  },
  {
    "id": "website",
    "title": "8. Website privacy",
    "paragraphs": [
      "The website is static. Its translation preview is an illustration, not a live AI request. It does not ask for your API key or provide a translation-input service.",
      "When you choose a display language, the site saves only that preference in localStorage under yijian-site-locale. This is separate from extension storage and remains until you clear this site’s data or change the preference. The root page also reads browser language preferences to choose a language.",
      "The current website code includes no analytics, advertising trackers, or application-set cookies. As with any website visit, its hosting infrastructure receives request information such as IP address and requested URL and may keep operational logs. No host-specific retention period is specified here; hosting practices must be confirmed for the actual deployment."
    ]
  },
  {
    "id": "updates",
    "title": "9. Policy updates",
    "paragraphs": [
      "We will update this page and its “Last updated” date when these practices change. The policy and store disclosures should remain consistent with the published extension. Check this page before using new features or changing service providers."
    ]
  },
  {
    "id": "contact",
    "title": "10. Contact the project maintainers",
    "paragraphs": [
      "For privacy questions or to report a discrepancy, contact the Transight AI open-source project maintainers through Issues in the gif-gif/transight-ai repository. You can also inspect the source code there.",
      "GitHub Issues are public. Do not post API keys, source text, translations, or other sensitive information. For a private matter, first ask how to contact the maintainers privately without disclosing the sensitive details. For data retained by an AI provider, contact that provider directly."
    ]
  }
],
  contactLink: 'Contact via GitHub Issues',
  sourceLink: 'Inspect the source code',
};

type PolicyShape<T> = T extends string ? string : T extends Array<infer U> ? PolicyShape<U>[] : { [K in keyof T]: PolicyShape<T[K]> };
export type PrivacyPolicy = PolicyShape<typeof enPrivacy>;
