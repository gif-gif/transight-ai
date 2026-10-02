import { cp, copyFile, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
const outputDir = path.join(root, 'chrome-web-store/package');
const filename = `transight-${manifest.version}.zip`;
const storeIcon = path.join(root, 'chrome-web-store/icons/icon-128.png');
// Fail before packaging if store-specific transparent-padding artwork is missing.
await readFile(storeIcon);
execFileSync(process.execPath, ['scripts/check.mjs'], { cwd: root, stdio: 'inherit' });
execFileSync(process.execPath, ['--test'], { cwd: root, stdio: 'inherit' });
const staging = await mkdtemp(path.join(tmpdir(), 'transight-store-'));
try {
  const extension = path.join(staging, 'extension');
  await mkdir(extension);
  // Whitelist runtime files and the license. Never package docs, screenshots, tools, or credentials.
  for (const file of ['manifest.json', 'LICENSE']) {
    await copyFile(path.join(root, file), path.join(extension, file));
  }
  for (const [dir, extensions] of [
    ['src', new Set(['.js', '.css', '.html'])],
    ['assets', new Set(['.png', '.svg'])],
    ['_locales', new Set(['.json'])]
  ]) {
    await cp(path.join(root, dir), path.join(extension, dir), {
      recursive: true,
      filter: source => !path.basename(source).startsWith('.') &&
        (path.extname(source) === '' || extensions.has(path.extname(source)))
    });
  }
  // Store-only 96px artwork + transparent 16px margins. Development icons stay unchanged.
  await copyFile(storeIcon, path.join(extension, 'assets/icon-128.png'));
  execFileSync(process.execPath, [path.join(root, 'scripts/check.mjs'), extension], { stdio: 'inherit' });
  const archive = path.join(staging, filename);
  execFileSync('zip', ['-q', '-r', archive, 'manifest.json', 'LICENSE', 'assets', 'src', '_locales'], { cwd: extension });
  execFileSync('unzip', ['-t', archive], { stdio: 'pipe' });
  const entries = execFileSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).trim().split('\n');
  if (!entries.includes('manifest.json') || !entries.includes('LICENSE') || entries.some(entry => !/^(manifest\.json$|LICENSE$|assets\/|src\/|_locales\/)/.test(entry))) {
    throw new Error('ZIP must contain manifest.json and LICENSE at its root, plus runtime files only.');
  }
  await mkdir(outputDir, { recursive: true });
  await copyFile(archive, path.join(outputDir, filename));
  console.log(`Created ${path.join(outputDir, filename)} (dist/ was not modified).`);
} finally {
  await rm(staging, { recursive: true, force: true });
}
