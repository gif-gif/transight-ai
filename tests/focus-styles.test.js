import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('shared form controls suppress native focus outlines without changing static borders', () => {
  const css = read('src/shared/ui.css');
  assert.match(css, /button:focus,a:focus,input:focus,select:focus,textarea:focus\{outline:none\}/);
  assert.match(css, /input,select\{border:1px solid var\(--line\)/);
  assert.match(css, /button:focus-visible,a:focus-visible\{filter:brightness\(/);
});

test('isolated page translation and screenshot toolbars suppress native button outlines', () => {
  for (const path of ['src/content/page-translation.js', 'src/content/screenshot-picker.js']) {
    assert.match(read(path), /button:focus\{outline:none\}/, path);
    assert.match(read(path), /button:focus-visible\{filter:brightness\(/, path);
  }
});

test('extension focus rules never add an outline or shadow ring', () => {
  const root = new URL('../src/', import.meta.url);
  for (const entry of readdirSync(root, { recursive: true })) {
    if (!/\.(css|js)$/.test(entry)) continue;
    const source = readFileSync(new URL(entry, root), 'utf8');
    for (const [, selector, declarations] of source.matchAll(/([^{}]*:focus[^{}]*)\{([^{}]*)\}/g)) {
      for (const [, property, value] of declarations.matchAll(/(?:^|;)\s*(outline|box-shadow)\s*:\s*([^;]+)/g)) {
        assert.match(value.trim(), /^(none|0)$/, `${entry}: ${selector} must not add ${property}`);
      }
    }
  }
});
