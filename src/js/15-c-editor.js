// 15-c-editor — the editor unit (jsToolbar + textarea), DESIGN §6.11, ACCEPTANCE E1 / E2.
// The ONE decorator for every .jstBlock (issue, wiki, documents, news, forums, project settings).
//   - toolbar buttons leave the Tab order (§3.2.10: textarea in two steps instead of 20) and keep their
//     icon in --gb-jstb-icon for the :hover rule in css/15-c-editor.css
//   - .gb-jst-narrow when the UNIT (not the viewport) is < 600px wide; then the toolbar is one sideways
//     row and the 「›」 cover (--gb-jst-cover) starts right after the last whole button
//   - auto-height: CSS field-sizing grows the textarea between --gb-editor-min / --gb-editor-max;
//     where field-sizing is unsupported the height follows scrollHeight here. A manual resize wins.
//   - core's empty preview 「プレビューするものがありません」 → 「プレビューする内容がありません。」
(function () {
  var GB = window.GB;
  var NARROW = 600;
  var CHEVRON = 28;
  var HELP_ROOM = 32; // css/15-c-editor.css: .jstElements padding-right on the tab line
  var PREVIEW_EMPTY = 'プレビューする内容がありません。';
  var FIELD_SIZING = !!(window.CSS && CSS.supports && CSS.supports('field-sizing', 'content'));

  function each(list, fn) { Array.prototype.forEach.call(list, fn); }

  function untab(block) {
    each(block.querySelectorAll('.jstElements button'), function (b) {
      if (b.getAttribute('tabindex') !== '-1') b.setAttribute('tabindex', '-1');
      if (b.style.getPropertyValue('--gb-jstb-icon')) return;
      var img = getComputedStyle(b).backgroundImage;
      if (img && img !== 'none') b.style.setProperty('--gb-jstb-icon', img);
    });
  }

  // narrow row (L2): the scroll end must also land on a whole button. Snap points are button starts, so
  // pad the row's end (--gb-jst-tail) until the last scroll position equals the start of the first
  // button from which every remaining button fits; the left edge then never cuts a button either.
  function syncTail(row) {
    var block = row.closest ? row.closest('.jstBlock') : null;
    if (!block || !block.classList.contains('gb-jst-narrow') || !row.clientWidth) {
      if (row.style.getPropertyValue('--gb-jst-tail')) row.style.removeProperty('--gb-jst-tail');
      return;
    }
    var origin = row.getBoundingClientRect().left + row.clientLeft - row.scrollLeft;
    var cw = row.clientWidth;
    var starts = [];
    var end = 0;
    each(row.children, function (c) {
      if (!c.offsetWidth || c.classList.contains('jstb_help')) return;
      var r = c.getBoundingClientRect();
      var right = r.right - origin + (parseFloat(getComputedStyle(c).marginRight) || 0);
      if (right > end) end = right;
      if (c.tagName === 'BUTTON') starts.push(r.left - origin);
    });
    var tail = 0;
    if (end > cw + 1) {
      for (var i = 0; i < starts.length; i++) {
        if (end - starts[i] <= cw) { tail = Math.max(0, Math.ceil(starts[i] + cw - end)); break; }
      }
    }
    var v = String(tail) + 'px';
    if (row.style.getPropertyValue('--gb-jst-tail') !== v) row.style.setProperty('--gb-jst-tail', v);
  }

  // 「›」 cover: from the right edge of the last button that is fully visible left of a 28px indicator
  // to the row's edge, so the last visible thing next to 「›」 is always a whole button.
  // .gb-more-left: a soft edge shadow on the left while buttons are scrolled out on that side.
  function syncMore(row) {
    syncTail(row);
    var more = row.scrollLeft + row.clientWidth < row.scrollWidth - 1;
    row.classList.toggle('gb-more-right', more);
    row.classList.toggle('gb-more-left', row.scrollLeft > 1);
    if (!more) { row.style.removeProperty('--gb-jst-cover'); return; }
    var box = row.getBoundingClientRect();
    var start = box.left + row.clientLeft;
    var edge = start + row.clientWidth;
    var last = start;
    each(row.querySelectorAll(':scope > button:not(.jstb_help)'), function (b) {
      if (!b.offsetWidth) return;
      var r = b.getBoundingClientRect();
      if (r.left >= start - 1 && r.right <= edge - CHEVRON && r.right > last) last = r.right;
    });
    var cover = String(Math.max(CHEVRON, Math.ceil(edge - last))) + 'px';
    if (row.style.getPropertyValue('--gb-jst-cover') !== cover) row.style.setProperty('--gb-jst-cover', cover);
  }

  // width the toolbar's buttons + spacers + gaps need on one line
  function naturalWidth(row) {
    var gap = parseFloat(getComputedStyle(row).columnGap) || 0;
    var w = 0;
    var n = 0;
    each(row.children, function (c) {
      if (!c.offsetWidth || c.classList.contains('jstb_help')) return;
      var m = getComputedStyle(c);
      w += c.offsetWidth + (parseFloat(m.marginLeft) || 0) + (parseFloat(m.marginRight) || 0);
      n++;
    });
    return w + gap * Math.max(0, n - 1);
  }
  // unit ≥ 600px: the toolbar stays on the tab line when it fits there; otherwise it takes its own
  // line under the tabs (.gb-jst-stacked) and wraps there into left-aligned rows
  function syncStacked(block, row, narrow) {
    var cell = row.parentNode;
    var ul = cell && cell.parentNode;
    if (narrow || !ul || !cell.classList.contains('tab-elements')) {
      block.classList.remove('gb-jst-stacked');
      return;
    }
    if (row.classList.contains('hidden') || !row.offsetWidth) return; // プレビュー tab: keep the last state
    var used = 0;
    each(ul.children, function (li) { if (li !== cell) used += li.offsetWidth; });
    var cellExtra = 17 + HELP_ROOM; // separator (8px margin + 8px padding + 1px border) + 「?」
    block.classList.toggle('gb-jst-stacked', naturalWidth(row) > ul.clientWidth - used - cellExtra);
  }

  function syncNarrow(block) {
    var w = block.clientWidth;
    if (!w) return; // hidden (collapsed panel, 説明 behind 「説明を編集」): decided once it is shown
    var narrow = w < NARROW;
    block.classList.toggle('gb-jst-narrow', narrow);
    var row = block.querySelector('.jstElements');
    if (!row) return;
    syncStacked(block, row, narrow);
    syncMore(row);
  }

  var ro = window.ResizeObserver ? new ResizeObserver(function (entries) {
    entries.forEach(function (e) {
      var t = e.target;
      if (t.classList.contains('jstBlock')) syncNarrow(t);
      else if (t.classList.contains('jstElements')) syncMore(t);
    });
  }) : null;

  // fallback auto-height (no field-sizing): height = scrollHeight, CSS min / max clamp it
  function fit(ta) {
    if (FIELD_SIZING || ta.classList.contains('gb-editor-resized') || !ta.offsetParent) return;
    ta.style.height = 'auto';
    ta.style.height = String(ta.scrollHeight + ta.offsetHeight - ta.clientHeight) + 'px';
  }
  // the user's drag on the resize grip wins until reload
  function watchResize(ta) {
    var before = 0;
    ta.addEventListener('pointerdown', function () { before = ta.offsetHeight; });
    ta.addEventListener('pointerup', function () {
      if (before && Math.abs(ta.offsetHeight - before) > 2) ta.classList.add('gb-editor-resized');
      before = 0;
    });
  }

  function fixEmptyPreview(root) {
    each(root.querySelectorAll('.jstBlock .wiki-preview > p:only-child'), function (p) {
      if (p.dataset.gbEmpty || !/^プレビューするものがありません。?$/.test(p.textContent.trim())) return;
      p.textContent = PREVIEW_EMPTY;
      p.classList.add('empty-preview');
      p.dataset.gbEmpty = '1';
    });
  }

  function decorate(block) {
    untab(block);
    var ta = block.querySelector('textarea.wiki-edit');
    if (block.dataset.gbJst) { if (ta) fit(ta); syncNarrow(block); return; }
    block.dataset.gbJst = '1';
    var row = block.querySelector('.jstElements');
    if (ro) ro.observe(block);
    if (row) {
      row.addEventListener('scroll', function () { syncMore(row); }, { passive: true });
      if (ro) ro.observe(row);
    }
    if (ta) {
      watchResize(ta);
      if (!FIELD_SIZING) ta.addEventListener('input', function () { fit(ta); });
      fit(ta);
    }
    // the preview tab hides the toolbar; returning to 編集 needs the cover recomputed
    block.addEventListener('click', function (e) {
      if (!e.target.closest || !e.target.closest('.jstTabs a')) return;
      setTimeout(function () {
        syncNarrow(block);
        if (ta) fit(ta);
      }, 0);
    });
    syncNarrow(block);
  }

  function run() {
    each(document.querySelectorAll('.jstBlock'), decorate);
    fixEmptyPreview(document);
  }

  GB.ready(run);
  GB.onAjax(run);
})();
