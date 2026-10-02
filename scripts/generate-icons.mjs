// Development-only: npm install --no-save sharp, or set SHARP_MODULE to its module entry.
// Normal builds use the committed PNGs and need no image-processing dependency.
import { readFile, writeFile } from 'node:fs/promises';
const { default: sharp } = await import(process.env.SHARP_MODULE || 'sharp');
const assets = new URL('../assets/', import.meta.url);
const mark = await readFile(new URL('translation-mark.svg', assets), 'utf8');
const foreground = mark.replace('<svg ', '<svg x="22" y="20" width="84" height="84" color="#fff" ');
const icon = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#126754"/>${foreground}</svg>\n`;
await writeFile(new URL('icon.svg', assets), icon);
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(icon), { density: 384 }).resize(size, size).png().toFile(new URL(`icon-${size}.png`, assets).pathname);
}
console.log('✓ Generated language-neutral toolbar icons: 16 / 32 / 48 / 128px');
