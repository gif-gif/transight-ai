export const en = {
  brand: 'Yijian AI',
  tagline: 'A little less distance.',
  meta: {
    title: 'Yijian AI — Read beyond language',
    description: 'An on-demand AI translation extension for Chrome. Translate selected text, compare models, and connect the AI service you choose.',
    guideTitle: 'Getting started — Yijian AI',
    guideDescription: 'Build and install Yijian AI in Chrome, connect your AI service, and start your first translation.',
  },
  nav: { features: 'Features', how: 'How it works', guide: 'Get started', language: 'Language', main: 'Main navigation', skip: 'Skip to content' },
  hero: {
    eyebrow: 'YOUR NEXT GOOD READ HAS NO BORDERS',
    title: 'Different languages.',
    accent: 'Same understanding.',
    description: 'Keep your curiosity moving. Translate the words you need, right where you read — with the AI models you choose.',
    primary: 'Get started', secondary: 'Explore the details', note: 'Made for Chrome · Bring your own AI service',
  },
  demo: {
    label: 'Illustrative translation preview', badge: 'A small moment of understanding', source: 'English · Selected text',
    original: 'Stay curious.\nThe world has more\nstories to tell.', target: 'Simplified Chinese',
    translation: '保持好奇，世界还有更多故事等你发现。', style: 'Natural', status: 'Illustration, not a live translation',
  },
  facts: [ { value: '3', label: 'interface languages' }, { value: '10', label: 'translation languages' }, { value: '5', label: 'models to compare at once' } ],
  features: {
    eyebrow: 'LESS FRICTION, MORE UNDERSTANDING', title: 'Fits the way you read.',
    description: 'A focused set of tools. No need to leave the page or change your flow.',
    items: [
      { title: 'Select. Click. Understand.', text: 'Select text on a webpage and click the translation button. Or use the toolbar and right-click menu.' },
      { title: 'A second perspective.', text: 'Compare translations from up to five models side by side. Find the expression that fits your context.' },
      { title: 'Your models. Your choice.', text: 'Connect a compatible AI endpoint with your own URL, API key, and model IDs, including local services.' },
    ],
  },
  how: {
    eyebrow: 'A SIMPLE START', title: 'Ready when you are.',
    steps: [
      { title: 'Add to your browser', text: 'Build the extension and load the dist folder in Chrome developer mode.' },
      { title: 'Connect your AI', text: 'Set your service URL, key, and models. Test the connection in settings.' },
      { title: 'Follow your curiosity', text: 'Select a passage and click translate. Choose your target language and tone.' },
    ],
  },
  cta: { title: 'A wider world. One selection away.', text: 'Start with your next article, email, or unexpected discovery.', button: 'Read the setup guide' },
  footer: { note: 'Translate on your terms.', guide: 'Setup guide', privacy: 'Translation requests go to your configured AI service only when you initiate them.' },
  guide: {
    eyebrow: 'GETTING STARTED', title: 'Your first translation,\nin a few simple steps.',
    intro: 'This guide covers local installation from the project source. A Chrome Web Store download link has not been configured yet.',
    back: 'Back to home', requirements: 'You will need', requirementText: 'Chrome 114 or newer, Node.js 20 or newer for building the extension, and access to a compatible AI service.',
    steps: [
      { title: 'Build the extension', text: 'From the extension project root (not the web folder), run:', detail: 'This generates the extension’s dist folder. The website and extension have separate builds.' },
      { title: 'Load it in Chrome', text: 'Open chrome://extensions, turn on Developer mode, choose “Load unpacked”, and select the dist folder in the project root.', detail: 'Pin Yijian AI to your toolbar so it is always within reach.' },
      { title: 'Configure your AI service', text: 'Open extension settings. Enter the Base URL, API key (unless your local service needs no authentication), and model IDs. Save and test the connection.', detail: 'Use a service compatible with POST /chat/completions. Provider fees and privacy policies depend on the service you choose.' },
      { title: 'Translate on demand', text: 'Select text on a regular HTTP or HTTPS webpage, then click the translation button. You can also paste text into the toolbar popup.', detail: 'Selection alone does not send text. Browser internal pages and some restricted pages do not allow content scripts.' },
    ],
    privacyTitle: 'A note on your data', privacyText: 'The extension has no bundled API key. When you request a translation, the selected text is sent to your configured service. Review that service’s privacy policy before translating sensitive content.',
  },
};

// Widen literal strings while keeping the exact dictionary structure.
type DictionaryShape<T> = T extends string ? string : T extends Array<infer U> ? DictionaryShape<U>[] : { [K in keyof T]: DictionaryShape<T[K]> };
export type Dictionary = DictionaryShape<typeof en>;
