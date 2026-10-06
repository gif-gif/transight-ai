import assert from 'node:assert/strict';

// Run in either the popup document or the on-page panel's shadow root.
export function inspectSourceImageLayout(root) {
  const source = root.querySelector('#source'), wrap = root.querySelector('#source-image-wrap');
  const gallery = root.querySelector('#source-images');
  const input = source.getBoundingClientRect(), head = root.querySelector('.text-card .card-head').getBoundingClientRect();
  const style = getComputedStyle(source), thumbnails = [...root.querySelectorAll('.source-thumbnail')].map(el => el.getBoundingClientRect());
  return {
    singleRow: thumbnails.every(rect => Math.abs(rect.top - thumbnails[0].top) < 1 && rect.width === 72 && rect.height === 72),
    overflowX: getComputedStyle(gallery).overflowX,
    scrollWidth: gallery.scrollWidth,
    clientWidth: gallery.clientWidth,
    scrollbarHeight: gallery.offsetHeight - gallery.clientHeight,
    beforeInput: wrap.nextElementSibling === source,
    hidden: wrap.hidden,
    inputHeight: input.height,
    headGap: input.top - head.bottom,
    imageHeadGap: thumbnails.length ? thumbnails[0].top - head.bottom : null,
    leftOffset: thumbnails.length ? thumbnails[0].left + gallery.scrollLeft - input.left - parseFloat(style.paddingLeft) : null,
    textGap: thumbnails.length ? input.top + parseFloat(style.paddingTop) - thumbnails.at(-1).bottom : null
  };
}

export function assertSourceImageLayout(layout, hasImages = true) {
  assert.equal(layout.beforeInput, true, 'image gallery precedes source textarea in DOM and keyboard order');
  assert.equal(layout.hidden, !hasImages);
  if (hasImages) {
    assert.equal(layout.singleRow, true, 'thumbnails remain full-size in a single row');
    assert.equal(layout.overflowX, 'auto', 'overflowing images can scroll horizontally');
    assert.ok(Math.abs(layout.leftOffset) < 1, 'first thumbnail aligns with the text left edge');
    assert.ok(layout.imageHeadGap >= 0 && layout.imageHeadGap <= 8, 'images start directly below the source header');
    assert.ok(layout.textGap >= 0 && layout.textGap <= 10 + layout.scrollbarHeight, 'text starts directly below the thumbnail strip and its scrollbar');
  } else {
    assert.equal(layout.headGap, 0, 'empty gallery leaves no space above text');
    assert.equal(layout.inputHeight, 70, 'text-only input keeps its original height');
  }
}
