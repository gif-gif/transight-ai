import assert from 'node:assert/strict';

// Runs both in extension documents and inside the selection panel's shadow root.
export function inspectSelectStyle(element = this) {
  element.blur();
  const borderBefore = getComputedStyle(element).borderColor;
  element.focus();
  const style = getComputedStyle(element);
  const result = {
    borderBefore, borderAfter: style.borderColor,
    outline: style.outlineStyle, shadow: style.boxShadow,
    appearance: style.appearance, padding: parseFloat(style.paddingRight),
    image: style.backgroundImage, position: style.backgroundPosition,
    focused: element.getRootNode().activeElement === element
  };
  element.blur();
  return result;
}

export function assertSelectStyle(style) {
  assert.equal(style.focused, true);
  assert.equal(style.outline, 'none');
  assert.equal(style.shadow, 'none');
  assert.equal(style.borderAfter, style.borderBefore);
  assert.equal(style.appearance, 'none');
  assert.ok(style.padding >= 36, 'reserve space between label and chevron');
  assert.ok(style.image.includes('linear-gradient'));
  assert.ok(style.position.includes('18px') && style.position.includes('13px'), 'inset both halves of the chevron');
}
