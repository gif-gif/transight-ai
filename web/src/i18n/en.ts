export const en = {
  brand: 'Transight AI',
  tagline: 'A little less distance.',
  meta: {
    title: 'Transight AI — Select. Click. Translate.',
    description: "Select a passage, translate a whole page in place with AI, or open Google Translate without an API key. Choose how much you send and where you read.",
    guideTitle: 'Getting started — Transight AI',
    guideDescription: "Install directly from the Chrome Web Store. Connect your own AI service to translate in place, or use Google text and whole-page translation in a new tab without an API key. No source download or build tools are needed.",
  },
  nav: { features: 'Features', how: 'How it works', guide: 'Get started', language: 'Language', main: 'Main navigation', skip: 'Skip to content' },
  lightbox: { close: 'Close image preview' },
  hero: {
    eyebrow: 'FULLY OPEN SOURCE · MADE FOR CHROME',
    title: 'Select. Click.',
    accent: 'Translation, right there.',
    description: 'Select a word or a passage. Click the translation icon and read the result beside your selection. No copy-paste, no switching tabs — just keep reading.',
    primary: 'Get started', secondary: 'See how it works', note: "Selection alone sends nothing · Your choice of AI service", steps: ['Select text', 'Click translate', 'Read in place'],
  },
  demo: {
    label: 'Illustrative translation preview', badge: 'Select → click → understand, without leaving the page', source: 'English · Selected text',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: 'Simplified Chinese',
    translation: '保持好奇，世界还有更多故事等你发现。', style: 'Natural', status: 'Illustration, not a live translation',
  },
  openSource: { eyebrow: 'OPEN BY DESIGN', title: 'Fully open source. Yours to explore.', description: 'The complete source code is on GitHub. Inspect how translation works, report an issue, or contribute an improvement.', link: 'View source on GitHub', nav: 'Open source' },
  store: { open: 'Open Chrome Web Store' },
  facts: [ { value: '5', label: 'interface languages' }, { value: '10', label: 'translation languages' }, { value: '5', label: 'models to compare at once' } ],
  features: {
    eyebrow: 'LESS FRICTION, MORE UNDERSTANDING', title: 'Less switching. More reading.',
    description: 'A focused set of tools. No need to leave the page or change your flow.',
    items: [
  {
    "title": "Select. Click. Understand.",
    "text": "Highlight the words you need and click the icon beside them. The translation appears right there, without copying text or opening another tab."
  },
  {
    "title": "A second perspective.",
    "text": "Compare translations from up to five models side by side. Find the expression that fits your context."
  },
  {
    "title": "Your models. Your choice.",
    "text": "Connect a compatible AI endpoint with your own URL, API key, and model IDs, including local services."
  },
  {
    "title": "AI page translation. Stay on the page.",
    "text": "Translate ordinary webpage text in place with your first selected model. Review the provider and target language, then confirm before any page text is sent."
  }
],
  },
  how: {
    eyebrow: 'A SIMPLE START', title: 'Ready when you are.',
    steps: [
      { title: 'Install from the store', text: 'Find Transight AI in the Chrome Web Store and select Add to Chrome.' },
      { title: "Choose AI or Google translation", text: "Configure your own service for in-place AI translation, or use the Google buttons without an API key." },
      { title: 'Select, click, keep reading', text: 'Highlight text and click the translation icon. Read the result beside your selection, without leaving the page.' },
    ],
  },
  cta: { title: 'A wider world. One selection away.', text: 'Start with your next article, email, or unexpected discovery.', button: 'Read the setup guide' },
  footer: { note: 'Translate on your terms.', guide: 'Setup guide', privacy: "AI uses your configured service and Simple can retranslate automatically. Google buttons send text or the page URL to Google only when clicked. AI page translation sends rendered page text and subsequent dynamic text only after its separate confirmation; the first model is used and provider charges may apply." },
  guide: {
    eyebrow: 'GETTING STARTED', title: 'Your first translation,\nin a few simple steps.',
    intro: "Install directly from the Chrome Web Store. Connect your own AI service to translate in place, or use Google text and whole-page translation in a new tab without an API key. No source download or build tools are needed.",
    back: 'Back to home', requirements: 'You will need', requirementText: "A compatible Chrome browser. An AI service is needed only for AI translation; the Google entries require no AI configuration.",
    steps: [
  {
    "title": "Install from the Chrome Web Store",
    "text": "Open the Transight AI listing in the Chrome Web Store, and select Add to Chrome. Confirm the installation in your browser.",
    "detail": "The button opens the official Transight AI listing directly."
  },
  {
    "title": "Pin it for easy access",
    "text": "Open the extensions menu in the Chrome toolbar and pin Transight AI.",
    "detail": "The toolbar gives you quick access to settings and manual translation. For everyday reading, just select text on the page."
  },
  {
    "title": "Configure AI (optional for Google)",
    "text": "Open extension settings. Enter the Base URL, API key (unless your local service needs no authentication), and model IDs. For an API key, set and confirm an unlock password (at least 6 characters), then save and test. After restarting Chrome, unlock in the toolbar popup, selection panel, or settings.",
    "detail": "Use a service compatible with POST /chat/completions. Provider fees and privacy policies depend on the service you choose. Configure your own service for in-place AI translation, or use the Google buttons without an API key."
  },
  {
    "title": "Select text. Click. Read the translation.",
    "text": "Select a word, sentence, or paragraph on a regular webpage. Click the translation icon beside your selection to see the result right there — no copying or switching tabs.",
    "detail": "Selection alone does not send text; you decide when to translate. Browser internal pages and some restricted pages do not allow selection translation."
  },
  {
    "title": "Translate the page, not just a selection",
    "text": "Choose a target language, click AI page translation, check the confirmation bar and select Agree and start. Read the translation on the original page, switch back to the original, or restore and end.",
    "detail": "Page translation uses the first selected model even in Full mode. It can process dynamic page text during the session and incur provider charges. Google whole-page translation instead opens a new tab without an AI key. Available features depend on your installed version."
  }
],
    privacyTitle: 'A note on your data', privacyText: "No API key is bundled. AI sends text, retained images and applicable page context to your configured service; Simple may retranslate automatically. Google buttons send text or the page URL in a new-tab link only when clicked. Such URLs may remain in browser history; avoid sensitive content. AI page translation sends rendered page text and subsequent dynamic text only after its separate confirmation; the first model is used and provider charges may apply.",
  },
};

// Widen literal strings while keeping the exact dictionary structure.
type DictionaryShape<T> = T extends string ? string : T extends Array<infer U> ? DictionaryShape<U>[] : { [K in keyof T]: DictionaryShape<T[K]> };
export type Dictionary = DictionaryShape<typeof en>;
