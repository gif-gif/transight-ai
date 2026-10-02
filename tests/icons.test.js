import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = file => readFile(new URL(`../${file}`, import.meta.url));

test('toolbar and selection use the same language-neutral globe-and-exchange vector mark', async () => {
  const mark = (await read('assets/translation-mark.svg')).toString();
  const icon = (await read('assets/icon.svg')).toString();
  const selection = (await read('src/content/selection.js')).toString();
  const paths = text => [...text.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
  assert.equal(paths(mark).length, 3);
  assert.deepEqual(paths(icon), paths(mark));
  const bubble = selection.match(/bubble.innerHTML = `([\s\S]+?)`/)[1];
  assert.deepEqual(paths(bubble), paths(mark));
  for (const svg of [mark, icon, bubble]) assert.doesNotMatch(svg, /<text|<image|译/);
  assert.match(bubble, /aria-hidden="true"/);
  assert.match(icon, /rx="28" fill="#126754"/);
});

test('all Chrome icon sizes are shipped as correctly sized RGBA PNGs', async () => {
  const manifest = JSON.parse(await read('manifest.json'));
  for (const size of [16, 32, 48, 128]) {
    const file = manifest.icons[size];
    assert.equal(manifest.action.default_icon[size], file);
    const png = await read(file);
    assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(png.readUInt32BE(16), size);
    assert.equal(png.readUInt32BE(20), size);
    assert.equal(png[25], 6, 'preserve transparency around rounded corners');
  }
});

test('settings and shared popup/floating-view branding reuse the canonical globe mark without text glyphs', async () => {
  const mark = (await read('assets/translation-mark.svg')).toString();
  const paths = text => [...text.matchAll(/<path d="([^"]+)"/g)].map(match => match[1]);
  for (const file of ['src/options/options.html', 'src/popup/popup.html']) {
    const source = (await read(file)).toString();
    const badge = source.match(/<span class="(?:brand-icon|badge)" aria-hidden="true">([\s\S]*?)<\/span>/)?.[1];
    assert.ok(badge, `${file} has a decorative brand mark`);
    assert.deepEqual(paths(badge), paths(mark), `${file} uses the canonical vector`);
    assert.match(badge, /focusable="false"/);
    assert.equal(badge.replace(/<[^>]+>/g, '').trim(), '', `${file} has no text glyph`);
  }
});
