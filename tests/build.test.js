import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { buildExtension } from '../scripts/build.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
  const root = await mkdtemp(path.join(tmpdir(), 'yijian-build-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const name of ['manifest.json', 'LICENSE', 'src', 'assets', '_locales']) {
    await cp(path.join(projectRoot, name), path.join(root, name), { recursive: true });
  }
  return root;
}

test('build produces an unpacked extension with runtime files, license, and current icons', async t => {
  const root = await fixture(t);
  await writeFile(path.join(root, 'src', '.env'), 'must not ship');
  await writeFile(path.join(root, 'assets', '.DS_Store'), 'must not ship');
  await writeFile(path.join(root, 'src', 'debug.log'), 'must not ship');
  await mkdir(path.join(root, 'dist'));
  await writeFile(path.join(root, 'dist', 'stale.zip'), 'old artifact');
  const output = await buildExtension(root);
  assert.equal(output, path.join(root, 'dist'));
  assert.deepEqual((await readdir(output)).sort(), ['LICENSE', '_locales', 'assets', 'manifest.json', 'src']);
  for (const file of ['LICENSE', '_locales/en/messages.json', '_locales/zh_CN/messages.json', '_locales/zh_TW/messages.json', '_locales/ja/messages.json', '_locales/ko/messages.json', 'manifest.json', 'src/popup/popup.css', 'src/popup/popup.js', 'src/background.js', 'src/unlock/unlock.html', 'src/unlock/unlock.js', 'src/unlock/unlock.css', 'src/shared/credential-access.js', 'assets/icon-16.png', 'assets/icon-32.png', 'assets/icon-48.png', 'assets/icon-128.png']) {
    assert.deepEqual(await readFile(path.join(output, file)), await readFile(path.join(root, file)));
  }
  await assert.rejects(readFile(path.join(output, 'src', '.env')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(output, 'src', 'debug.log')), { code: 'ENOENT' });
  await assert.rejects(readFile(path.join(output, 'assets', '.DS_Store')), { code: 'ENOENT' });
  assert.equal((await readdir(root)).some(name => name.startsWith('.dist-stage-')), false);
});

test('rebuild refreshes changed source and removes obsolete output', async t => {
  const root = await fixture(t);
  const output = await buildExtension(root);
  await writeFile(path.join(output, 'src', 'obsolete.js'), '// obsolete');
  const cssPath = path.join(root, 'src', 'popup', 'popup.css');
  await writeFile(cssPath, (await readFile(cssPath, 'utf8')) + '\n/* rebuild check */\n');
  await buildExtension(root);
  assert.match(await readFile(path.join(output, 'src/popup/popup.css'), 'utf8'), /rebuild check/);
  await assert.rejects(readFile(path.join(output, 'src', 'obsolete.js')), { code: 'ENOENT' });
});

test('invalid build preserves previous output and cleans staging directory', async t => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'dist'));
  await writeFile(path.join(root, 'dist', 'previous.txt'), 'working build');
  await writeFile(path.join(root, 'manifest.json'), '{invalid json');
  await assert.rejects(buildExtension(root));
  assert.equal(await readFile(path.join(root, 'dist', 'previous.txt'), 'utf8'), 'working build');
  assert.equal((await readdir(root)).some(name => name.startsWith('.dist-stage-')), false);
});
