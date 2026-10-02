export const enPrivacy = {
  title: 'Privacy Policies',
  description: 'How Transight AI handles translation text, API credentials, local settings, and website language preferences.',
  eyebrow: 'TRANSPARENT BY DESIGN',
  updated: 'Last updated',
  date: 'October 2, 2026',
  intro: 'This policy covers the Transight AI (译见 AI) browser extension and this official website. It describes the current implementation maintained by the Transight AI open-source project maintainers, reachable through the project repository.',
  summaryTitle: 'Your text. Your chosen service.',
  summary: 'Selecting text alone does not upload it. When you request a translation, the text goes to the AI endpoint you configure. Settings stay in your browser; the extension has no built-in analytics or persistent translation history.',
  contents: 'On this page',
  back: 'Back to home',
  sections: [
    { id: 'data', title: '1. Data we process and why', paragraphs: [
      'Source text and translations: the extension processes text you type, paste, or select to translate it and optionally compare results from multiple models. Opening the toolbar popup can read the current selection to prefill the input. The extension does not automatically upload entire pages.',
      'Service configuration: the AI endpoint (Base URL), API key, selected model IDs, target language, translation style, interface language, and consent status are used to connect to your service and remember your preferences.',
      'Page context: tab URLs and origins are inspected locally to check supported pages and permissions and manage translation panels. The extension does not use the browsing-history API, keep a browsing-history database, or send tab URLs as separate translation request fields. A URL included in your source text is sent as part of that text.',
      'The extension has no dedicated identity, location, payment, health-record, or email collection feature. However, anything you include in the source text, including personal or sensitive information, is sent with that text; it is not automatically filtered out.'
    ] },
    { id: 'requests', title: '2. When network requests occur', paragraphs: [
      'Translation sends source text, the selected model ID, target language, and translation-style instructions to /chat/completions under your configured Base URL. An API key, when configured, is sent in the Authorization: Bearer header. Each selected model receives a separate request.',
      'Clicking the selection-translation icon, choosing the context-menu translation command, pressing Translate or its keyboard shortcut, retrying a result, or changing the target language in an auto-translating panel can start requests. Simply selecting text does not start an upload.',
      'Model discovery requests /models with your connection credentials but without source text. You can perform this action before confirming translation consent; that consent is not a blanket block on all network requests.',
      'Connection testing sends the sample text “Hello, world!” to each selected model with Simplified Chinese as the target language. The service receives the configured authentication credentials, just as for translation.'
    ] },
    { id: 'providers', title: '3. Recipients and third-party services', paragraphs: [
      'Requests go to the AI endpoint you configure, which may be an external provider or your own local service. There is no developer-operated translation relay built into the extension. The default endpoint is https://api.openai.com/v1; it includes no bundled API key and you can change it.',
      'The receiving service can also observe network information such as your IP address. Its retention, training use, processing location, international transfers, and deletion practices depend on that service’s policies and your agreement with it. We do not promise zero retention or no training on behalf of any provider.',
      'The extension does not sell user data or use it for advertising, behavioral analytics, credit assessment, or lending. Its processing is for translation and the related settings and connection functions described here. Following a GitHub or Chrome Web Store link takes you to a separate service governed by its own privacy policy.'
    ] },
    { id: 'storage', title: '4. Local storage and retention', paragraphs: [
      'Configuration, API credentials, preferences, and consent are saved in chrome.storage.local, not Chrome sync. They remain until you modify them, clear extension data, or uninstall the extension.',
      'Source text and results are primarily held in the current interface’s memory, without a persistent translation history. Clearing the input or closing the interface removes the current display, but cannot recall requests already received by a service.',
      'For the standalone fallback window, selected text is temporarily placed in chrome.storage.session.contextDraft. It is removed when that window reads it; if never read, it may remain until the browser session ends.',
      'Copying a translation writes it to the system clipboard at your request. The extension does not read clipboard contents. Copied text can remain under the control of your operating system or other clipboard tools.'
    ] },
    { id: 'permissions', title: '5. Browser permissions', paragraphs: [
      'storage saves settings and temporary fallback text. contextMenus adds the Translate selection command. activeTab and scripting support reading the active selection and injecting the packaged translation panel when you use the extension.',
      'Host access to http://*/* and https://*/* lets selection translation work on ordinary webpages and permits connections to user-chosen AI endpoints whose hostnames are not fixed. HTTP website access is distinct from the stricter API transport rules below.',
      'Executable scripts and styles are packaged with the extension. Remote model lists and translations are handled as data, not executable code. There is no remotely downloaded script or executable update mechanism outside the store.'
    ] },
    { id: 'security', title: '6. Security and its limits', paragraphs: [
      'Non-local AI endpoints must use HTTPS. Plain HTTP is accepted only for localhost or 127.0.0.1 endpoints. HTTPS is preferable where available; a local HTTP connection is not encrypted in transit.',
      'Access to local extension storage is restricted to trusted extension contexts; content scripts cannot directly read stored API credentials. This access restriction is not encryption: API keys currently have no application-layer encryption at rest in chrome.storage.local.',
      'Service requests omit browser cookies and reject redirects. No storage or transmission method is completely secure. Protect your device and browser profile, use appropriately restricted API keys, and revoke or rotate a key with its provider if it is exposed.'
    ] },
    { id: 'choices', title: '7. Your choices and deletion', paragraphs: [
      'You choose the source text, AI service, models, and translation settings. Avoid submitting sensitive information unless you understand and accept the receiving service’s handling of it.',
      'You can edit your saved configuration in extension settings, clear the current input, restrict website access through Chrome’s extension controls, disable the extension, or uninstall it to remove its local settings. There is currently no dedicated “delete all data” button in the extension.',
      'To revoke an API key or request deletion of data already sent to an AI service, contact that provider or use its account controls. Removing local settings or uninstalling the extension does not delete provider-side records or system clipboard contents.'
    ] },
    { id: 'website', title: '8. Website privacy', paragraphs: [
      'The website is static. Its translation preview is an illustration, not a live AI request. It does not ask for your API key or provide a translation-input service.',
      'When you choose a display language, the site saves only that preference in localStorage under yijian-site-locale. This is separate from extension storage and remains until you clear this site’s data or change the preference. The root page also reads browser language preferences to choose a language.',
      'The current website code includes no analytics, advertising trackers, or application-set cookies. As with any website visit, its hosting infrastructure receives request information such as IP address and requested URL and may keep operational logs. No host-specific retention period is specified here; hosting practices must be confirmed for the actual deployment.'
    ] },
    { id: 'updates', title: '9. Policy updates', paragraphs: [
      'We will update this page and its “Last updated” date when these practices change. The policy and store disclosures should remain consistent with the published extension. Check this page before using new features or changing service providers.'
    ] },
    { id: 'contact', title: '10. Contact the project maintainers', paragraphs: [
      'For privacy questions or to report a discrepancy, contact the Transight AI open-source project maintainers through Issues in the gif-gif/transight-ai repository. You can also inspect the source code there.',
      'GitHub Issues are public. Do not post API keys, source text, translations, or other sensitive information. For a private matter, first ask how to contact the maintainers privately without disclosing the sensitive details. For data retained by an AI provider, contact that provider directly.'
    ] },
  ],
  contactLink: 'Contact via GitHub Issues',
  sourceLink: 'Inspect the source code',
};

type PolicyShape<T> = T extends string ? string : T extends Array<infer U> ? PolicyShape<U>[] : { [K in keyof T]: PolicyShape<T[K]> };
export type PrivacyPolicy = PolicyShape<typeof enPrivacy>;
