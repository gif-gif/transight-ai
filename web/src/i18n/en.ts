export const en = {
  brand: 'Transight AI',
  tagline: 'A little less distance.',
  meta: {
    title: 'Transight AI — Select. Click. Translate.',
    description: 'A fully open-source AI translation extension for Chrome. Select text, click translate, and read the result right on the page. No copying or switching tabs.',
    guideTitle: 'Getting started — Transight AI',
    guideDescription: 'Install Transight AI from the Chrome Web Store, connect your AI service, and translate selected text without leaving the page.',
  },
  nav: { features: 'Features', how: 'How it works', guide: 'Get started', language: 'Language', main: 'Main navigation', skip: 'Skip to content' },
  hero: {
    eyebrow: 'FULLY OPEN SOURCE · MADE FOR CHROME',
    title: 'Select. Click.',
    accent: 'Translation, right there.',
    description: 'Select a word or a passage. Click the translation icon and read the result beside your selection. No copy-paste, no switching tabs — just keep reading.',
    primary: 'Get started', secondary: 'See how it works', note: 'Translate only when you click · Your choice of AI service', steps: ['Select text', 'Click translate', 'Read in place'],
  },
  demo: {
    label: 'Illustrative translation preview', badge: 'Select → click → understand, without leaving the page', source: 'English · Selected text',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: 'Simplified Chinese',
    translation: '保持好奇，世界还有更多故事等你发现。', style: 'Natural', status: 'Illustration, not a live translation',
  },
  openSource: { eyebrow: 'OPEN BY DESIGN', title: 'Fully open source. Yours to explore.', description: 'The complete source code is on GitHub. Inspect how translation works, report an issue, or contribute an improvement.', link: 'View source on GitHub', nav: 'Open source' },
  store: { search: 'Find in Chrome Web Store' },
  facts: [ { value: '3', label: 'interface languages' }, { value: '10', label: 'translation languages' }, { value: '5', label: 'models to compare at once' } ],
  features: {
    eyebrow: 'LESS FRICTION, MORE UNDERSTANDING', title: 'Less switching. More reading.',
    description: 'A focused set of tools. No need to leave the page or change your flow.',
    items: [
      { title: 'Select. Click. Understand.', text: 'Highlight the words you need and click the icon beside them. The translation appears right there, without copying text or opening another tab.' },
      { title: 'A second perspective.', text: 'Compare translations from up to five models side by side. Find the expression that fits your context.' },
      { title: 'Your models. Your choice.', text: 'Connect a compatible AI endpoint with your own URL, API key, and model IDs, including local services.' },
    ],
  },
  how: {
    eyebrow: 'A SIMPLE START', title: 'Ready when you are.',
    steps: [
      { title: 'Install from the store', text: 'Find Transight AI in the Chrome Web Store and select Add to Chrome.' },
      { title: 'Connect your AI', text: 'Set your service URL, key, and models. Test the connection in settings.' },
      { title: 'Select, click, keep reading', text: 'Highlight text and click the translation icon. Read the result beside your selection, without leaving the page.' },
    ],
  },
  cta: { title: 'A wider world. One selection away.', text: 'Start with your next article, email, or unexpected discovery.', button: 'Read the setup guide' },
  footer: { note: 'Translate on your terms.', guide: 'Setup guide', privacy: 'Translation requests go to your configured AI service only when you initiate them.' },
  guide: {
    eyebrow: 'GETTING STARTED', title: 'Your first translation,\nin a few simple steps.',
    intro: 'Install from the Chrome Web Store, connect your preferred AI service, and start translating right on the page. No source download or build tools needed.',
    back: 'Back to home', requirements: 'You will need', requirementText: 'A compatible Chrome browser and access to an AI service of your choice. Installation happens directly through the Chrome Web Store.',
    steps: [
      { title: 'Install from the Chrome Web Store', text: 'Find Transight AI in the Chrome Web Store, open its listing, and select Add to Chrome. Confirm the installation in your browser.', detail: 'Use the store search link to find the extension by name.' },
      { title: 'Pin it for easy access', text: 'Open the extensions menu in the Chrome toolbar and pin Transight AI.', detail: 'The toolbar gives you quick access to settings and manual translation. For everyday reading, just select text on the page.' },
      { title: 'Configure your AI service', text: 'Open extension settings. Enter the Base URL, API key (unless your local service needs no authentication), and model IDs. Save and test the connection.', detail: 'Use a service compatible with POST /chat/completions. Provider fees and privacy policies depend on the service you choose.' },
      { title: 'Select text. Click. Read the translation.', text: 'Select a word, sentence, or paragraph on a regular webpage. Click the translation icon beside your selection to see the result right there — no copying or switching tabs.', detail: 'Selection alone does not send text; you decide when to translate. Browser internal pages and some restricted pages do not allow selection translation.' },
    ],
    privacyTitle: 'A note on your data', privacyText: 'The extension has no bundled API key. When you request a translation, the selected text is sent to your configured service. Review that service’s privacy policy before translating sensitive content.',
  },
};

// Widen literal strings while keeping the exact dictionary structure.
type DictionaryShape<T> = T extends string ? string : T extends Array<infer U> ? DictionaryShape<U>[] : { [K in keyof T]: DictionaryShape<T[K]> };
export type Dictionary = DictionaryShape<typeof en>;
