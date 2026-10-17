// Reuse extension smoke-test screenshots without changing their source files.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';

const inputs = {
  'zh-cn': { folder: '', settings: 'options.png' },
  'zh-tw': { folder: 'zh-TW/', settings: 'options-multi.png' },
  en: { folder: 'en/', settings: 'options.png' },
  ja: { folder: 'ja/', settings: 'options-multi.png' },
  ko: { folder: 'ko/', settings: 'options-multi.png' },
};
const manifest = {};
const captures = {};
const captureLocales = { 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR' };
const release = JSON.parse(await readFile(new URL('../../manifest.json', import.meta.url), 'utf8')).version;
for (const [locale, { folder, settings }] of Object.entries(inputs)) {
  const output = new URL(`../public/screenshots/${locale}/`, import.meta.url);
  await mkdir(output, { recursive: true });
  manifest[locale] = [];
  const provenance = JSON.parse(await readFile(new URL(`../../artifacts/screenshots/${captureLocales[locale]}/capture-info.json`, import.meta.url), 'utf8'));
  captures[locale] = provenance;
  if (provenance.version !== release || provenance.versionWatermarks !== 'hidden') throw new Error(`Recapture ${locale} for ${release} without version labels`);
  if (!provenance.features?.includes('ai-page-translation')) throw new Error(`Recapture AI page translation for ${locale}`);
  for (const [id, filename] of Object.entries({ 'ai-page-confirm': 'ai-page-confirm.png', 'ai-page-result': 'ai-page-result.png', simple: 'selection-simple.png', google: 'external-translation.png', 'popup-simple': 'popup-simple.png', images: 'selection-image-strip.png', selection: 'context-multi.png', comparison: 'popup-multi.png', settings, unlock: 'selection-locked.png' })) {
    const source = new URL(`../../docs/screenshots/${folder}${filename}`, import.meta.url);
    let image = sharp(fileURLToPath(source));
    // Use bounds measured from this capture, so new controls are never clipped.
    if (id === 'simple' || id === 'images') {
      const box = (id === 'simple' ? provenance.cropBoxes : provenance.inputBoxes)?.[filename];
      if (!box || box.length !== 4) throw new Error(`Missing capture bounds: ${locale}/${filename}`);
      const [left, top, right, bottom] = box;
      image = image.extract({ left, top, width: right - left, height: bottom - top });
    }
    const result = await image.webp({ quality: 85 }).toFile(fileURLToPath(new URL(`${id}.webp`, output)));
    manifest[locale].push({ id, src: `/screenshots/${locale}/${id}.webp`, width: result.width, height: result.height });
  }
}
await writeFile(new URL('../src/config/screenshots.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n');
// Commit capture provenance with the site so tests do not depend on ignored artifacts/.
await writeFile(new URL('../src/config/screenshots-capture.json', import.meta.url), JSON.stringify(captures, null, 2) + '\n');
console.log('Synced 10 screenshots per locale (5 locales).');

// The store artwork includes a real selection-trigger capture. Keep its localized
// walkthrough. The close-up comes from the raw capture, independent of artwork layout.
const triggers = {};
for (const [locale, folder] of Object.entries({ 'zh-cn': 'zh-CN', 'zh-tw': 'zh-TW', en: 'en', ja: 'ja', ko: 'ko' })) {
  const source = fileURLToPath(new URL(`../../chrome-web-store/screenshots/${folder}/05-selection-trigger.png`, import.meta.url));
  const { width, height } = await sharp(source).metadata();
  if (width !== 1280 || height !== 800) throw new Error(`Review the selection-trigger crop for ${locale}: source dimensions changed`);
  const assets = {};
  for (const variant of ['full', 'detail']) {
    let image = sharp(source);
    if (variant === 'detail') {
      const raw = fileURLToPath(new URL(`../../docs/screenshots/${inputs[locale].folder}selection-trigger.png`, import.meta.url));
      image = sharp(raw).extract({ left: 0, top: 0, width: 424, height: 160 });
    }
    const src = `/screenshots/${locale}/selection-trigger-${variant}.webp`;
    const result = await image.webp({ quality: 90 }).toFile(fileURLToPath(new URL(`../public${src}`, import.meta.url)));
    assets[variant] = { src, width: result.width, height: result.height };
  }
  triggers[locale] = assets;
}
await writeFile(new URL('../src/config/selection-trigger.json', import.meta.url), JSON.stringify(triggers, null, 2) + '\n');
console.log('Synced selection-trigger walkthroughs and close-ups (5 locales).');
