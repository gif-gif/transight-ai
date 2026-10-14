// DOM-only engine, deliberately independent of extension APIs and API credentials.
(() => {
  if (globalThis.TransightPageEngine) return;
  const excluded = 'script,style,noscript,template,input,textarea,select,option,pre,code,kbd,samp,svg,math,canvas,iframe,object,embed,video,audio,[hidden],[aria-hidden="true"],[translate="no"],.notranslate,[data-transight],[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="combobox"],[aria-live]:not([aria-live="off"])';
  const semantic = 'p,li,td,th,dt,dd,figcaption,blockquote,h1,h2,h3,h4,h5,h6,button,label,div,section,article,main,header,footer,nav';
  class PageEngine {
    constructor(doc = document) { this.doc = doc; this.records = new Map(); this.serial = 0; this.blockSerial = 0; this.skipped = 0; this.originalView = false; }
    allowed(element, cache = new WeakMap()) {
      if (!element || element.closest(excluded) || element.isContentEditable) return false;
      for (let current = element; current; current = current.parentElement) {
        if (cache.has(current)) return cache.get(current);
        const style = this.doc.defaultView.getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.contentVisibility === 'hidden' || style.opacity === '0') { cache.set(current, false); return false; }
      }
      cache.set(element, true); return true;
    }
    scan() {
      this.skipped = 0;
      const groups = new Map(), cache = new WeakMap();
      if (!this.doc.body) return [];
      const walker = this.doc.createTreeWalker(this.doc.body, 5, { acceptNode: node => {
        if (node.nodeType === 1) return this.allowed(node, cache) ? 3 : 2;
        return /\p{L}/u.test(node.data) && this.allowed(node.parentElement, cache) ? 1 : 2;
      } });
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType !== 3) continue;
        let record = this.records.get(node);
        if (!record) {
          record = { id: `s${++this.serial}`, original: node.data, translated: null, state: 'pending', revision: 0, changes: 0 };
          this.records.set(node, record);
        } else if (node.data !== (this.originalView ? record.original : record.translated ?? record.original)) {
          record.original = node.data; record.translated = null; record.revision++; record.changes++;
          record.state = record.changes > 3 ? 'failed' : 'pending';
        }
        const parent = node.parentElement.closest(semantic) || node.parentElement;
        if (!groups.has(parent)) groups.set(parent, []);
        groups.get(parent).push({ node, record });
      }
      for (const node of this.records.keys()) if (!node.isConnected) this.records.delete(node);
      const pending = [];
      for (const [element, items] of groups) {
        // Include completed inline siblings for context without retranslating them.
        if (!items.some(item => item.record.state === 'pending')) continue;
        if (items.some(item => item.record.state === 'inflight')) continue;
        const segments = items.map(({ node, record }) => ({ id: record.id, text: record.original, node, revision: record.revision, parent: node.parentElement, value: node.data }));
        const chars = segments.reduce((n, item) => n + item.text.length, 0);
        if (items.some(item => item.record.changes > 3) || chars > 6000 || segments.length > 80 || JSON.stringify(segments.map(({ id, text }) => ({ id, text }))).length > 11500) {
          for (const { record } of items) if (record.state === 'pending') record.state = 'failed';
          this.skipped++; continue;
        }
        const rect = element.getBoundingClientRect();
        pending.push({ id: `b${++this.blockSerial}`, segments, chars, priority: rect.bottom >= 0 && rect.top < this.doc.defaultView.innerHeight ? 0 : 1, top: Math.abs(rect.top) });
      }
      return pending.sort((a, b) => a.priority - b.priority || a.top - b.top);
    }
    batch() {
      const blocks = []; let chars = 0, count = 0;
      for (const block of this.scan()) {
        if (blocks.length >= 24 || chars + block.chars > 6000 || count + block.segments.length > 80) continue;
        const wire = [...blocks, block].map(({ id, segments }) => ({ id, segments: segments.map(({ id, text }) => ({ id, text })) }));
        if (JSON.stringify({ blocks: wire }).length > 12000) continue;
        blocks.push(block); chars += block.chars; count += block.segments.length;
      }
      for (const block of blocks) for (const segment of block.segments) this.records.get(segment.node).state = 'inflight';
      return blocks;
    }
    wire(blocks) { return blocks.map(({ id, segments }) => ({ id, segments: segments.map(({ id, text }) => ({ id, text })) })); }
    apply(blocks, translations) {
      for (const block of blocks) {
        const safe = block.segments.every(segment => {
          const record = this.records.get(segment.node);
          return record && segment.node.isConnected && record.revision === segment.revision && segment.node.data === segment.value && segment.node.parentElement === segment.parent && this.allowed(segment.parent) && typeof translations[segment.id] === 'string';
        });
        if (!safe) { this.fail([block]); continue; }
        for (const segment of block.segments) {
          const record = this.records.get(segment.node);
          // Preserve spacing around inline elements even when a provider trims it.
          const leading = record.original.match(/^\s*/)[0], trailing = record.original.match(/\s*$/)[0];
          record.translated = leading + translations[segment.id].trim() + trailing;
          record.state = 'done';
          segment.node.data = this.originalView ? record.original : record.translated;
        }
      }
    }
    fail(blocks) {
      for (const block of blocks) for (const segment of block.segments) {
        const record = this.records.get(segment.node);
        if (record?.revision === segment.revision && record.state === 'inflight') record.state = 'failed';
      }
    }
    retry() { for (const record of this.records.values()) if (['failed', 'inflight'].includes(record.state)) record.state = 'pending'; }
    toggle(original) {
      this.originalView = original;
      for (const [node, record] of this.records) {
        if (node.isConnected && record.translated !== null && (node.data === record.translated || node.data === record.original)) node.data = original ? record.original : record.translated;
      }
    }
    restore() { this.toggle(true); this.records.clear(); this.originalView = false; }
    stats() {
      let done = 0, failed = 0;
      for (const record of this.records.values()) { if (record.state === 'done') done++; if (record.state === 'failed') failed++; }
      return { done, failed, total: this.records.size };
    }
  }
  globalThis.TransightPageEngine = PageEngine;
})();
