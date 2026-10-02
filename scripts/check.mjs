import { readFile, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = process.argv[2] ? pathToFileURL(path.resolve(process.argv[2]) + path.sep) : new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('Expected Manifest V3');
if (manifest.default_locale !== 'en') throw new Error('Expected English fallback locale');
const catalogs = {};
for (const locale of ['en', 'zh_CN', 'zh_TW']) {
  catalogs[locale] = JSON.parse(await readFile(new URL(`_locales/${locale}/messages.json`, root), 'utf8'));
  if (Object.keys(catalogs[locale]).sort().join() !== Object.keys(catalogs.en).sort().join()) throw new Error(`Locale keys differ: ${locale}`);
  for (const [key, value] of Object.entries(catalogs[locale])) {
    if (typeof value.message !== 'string' || !value.message.trim()) throw new Error(`Empty message: ${locale}/${key}`);
    const params = text => [...text.matchAll(/\$[1-9]/g)].map(match => match[0]).sort().join();
    if (params(value.message) !== params(catalogs.en[key].message)) throw new Error(`Locale substitutions differ: ${locale}/${key}`);
  }
}
for (const [, key] of JSON.stringify(manifest).matchAll(/__MSG_(\w+)__/g)) {
  if (!catalogs.en[key]) throw new Error(`Unknown manifest message: ${key}`);
}

for (const file of [manifest.background.service_worker, manifest.action.default_popup, manifest.options_page, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon), ...(manifest.content_scripts || []).flatMap(script => [...(script.js || []), ...(script.css || [])])]) await access(new URL(file, root));
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.(m?js)$/.test(file)) execFileSync(process.execPath, ['--input-type=module', '--check'], { input: await readFile(file) });
    else if (file.endsWith('.html')) {
      const html = await readFile(file, 'utf8');
      for (const [, key] of html.matchAll(/data-i18n(?:-[a-z-]+)?="(\w+)"/g)) {
        if (!catalogs.en[key]) throw new Error(`Unknown HTML message: ${key}`);
      }
      for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        if (!match[1].includes('://')) await access(path.resolve(path.dirname(file), match[1]));
      }
      if (/<script\b[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(html.replace(/<script\b[^>]*src="[^"]+"[^>]*>\s*<\/script>/gi, ''))) throw new Error(`Inline script: ${file}`);
    }
  }
}
await walk(fileURLToPath(new URL('src/', root)));
console.log('✓ Manifest、静态资源引用与 JavaScript 语法检查通过');
