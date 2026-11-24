
// === 00-core.js ===
// 00-core: shared helpers for all Greenboard modules.
// Public API (add only, never change signatures):
//   GB.ready(fn), GB.onAjax(fn), GB.spriteHref(), GB.svgIcon(sprite, id, cls), GB.statusIdOf(el), GB.initial(name)
//   GB.avatarIndex(name), GB.avatar(name, size) -> <span class="gb-avatar ...">, GB.avatarHTML(name, size) -> string
//   GB.avatarFor(user|name, size) -> same avatar rule from a { name } object, GB.stripFieldLabel(text)
//   GB.projectAvatar(name, size) -> <span class="gb-proj-avatar ...">
//   GB.trackerIdOf(el), GB.statusPill(text, id), GB.trackerBadge(text, id), GB.icon(id, cls)
//   GB.currentUser() -> {id, login, name, known}, GB.onCurrentUser(fn), GB.issueKey(projectIdentifier, id)
//   (known === true when the display name came from the cache; otherwise name is the login until fetched)
(function () {
  var GB = window.GB = window.GB || {};
  var readyFns = [], ajaxFns = [], isReady = false;

  GB.ready = function (fn) { if (isReady) fn(); else readyFns.push(fn); };
  GB.onAjax = function (fn) { ajaxFns.push(fn); };

  GB.spriteHref = function () {
    var use = document.querySelector('#icon-copy-source use') || document.querySelector('svg.icon-svg use');
    var href = use && (use.getAttribute('href') || use.getAttribute('xlink:href'));
    return href ? href.split('#')[0] : null;
  };

  GB.svgIcon = function (sprite, id, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', sprite + '#icon--' + id);
    svg.appendChild(use);
    return svg;
  };

  // Sprite icon with the sprite resolved automatically (null when the sprite is unknown).
  GB.icon = function (id, cls) {
    var sprite = GB.spriteHref();
    return sprite ? GB.svgIcon(sprite, id, cls || 'icon-svg') : null;
  };

  // Theme-drawn house icon (the sprite has no home shape): an inline SVG that sits like a sprite icon.
  GB.homeIcon = function (cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', (cls || 'icon-svg') + ' gb-icon-home');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M3.5 11.2 12 4l8.5 7.2M6 9.6V20h4.4v-5.6h3.2V20H18V9.6');
    svg.appendChild(path);
    return svg;
  };

  GB.statusIdOf = function (el) {
    var m = el && el.className && String(el.className).match(/(?:^|\s)status-(\d+)(?:\s|$)/);
    return m ? m[1] : null;
  };

  GB.trackerIdOf = function (el) {
    var m = el && el.className && String(el.className).match(/(?:^|\s)tracker-(\d+)(?:\s|$)/);
    return m ? m[1] : null;
  };

  GB.initial = function (name) { return (Array.from(String(name || '').trim())[0] || '?').toUpperCase(); };

  // Deterministic avatar colour: sum of UTF-16 code units of the full display name, mod 8.
  GB.avatarIndex = function (name) {
    var s = String(name || '').trim();
    if (!s) return -1;
    var sum = 0;
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return sum % 8;
  };

  function normSize(size) {
    var n = parseInt(size, 10);
    return [20, 28, 36, 64].indexOf(n) >= 0 ? n : 28;
  }

  // Round initial avatar (§2.9). aria-hidden: the visible name is the accessible label.
  GB.avatar = function (name, size) {
    var span = document.createElement('span');
    var idx = GB.avatarIndex(name);
    span.className = 'gb-avatar gb-avatar--' + normSize(size);
    span.setAttribute('data-av', String(idx));
    span.setAttribute('aria-hidden', 'true');
    span.textContent = idx < 0 ? '?' : GB.initial(name);
    return span;
  };

  GB.avatarHTML = function (name, size) { return GB.avatar(name, size).outerHTML; };

  // 「担当者: 花子 鈴木」 -> 「花子 鈴木」 (core prefixes some avatar labels with the field name)
  GB.stripFieldLabel = function (text) {
    return String(text || '').replace(/^[^:：]{1,12}[:：]\s*/, '').trim();
  };

  // One avatar rule everywhere: initial = first character of the display name, colour = hash of the
  // display name (same as GB.avatar and the decorated core avatars). user: { name } or a name string.
  GB.avatarFor = function (user, size) {
    var name = typeof user === 'string' ? user : (user && (user.name || user.login)) || '';
    return GB.avatar(GB.stripFieldLabel(name), size);
  };

  // Rounded-square project avatar with the same deterministic palette.
  GB.projectAvatar = function (name, size) {
    var span = document.createElement('span');
    var n = parseInt(size, 10);
    span.className = 'gb-proj-avatar' + (n === 36 || n === 48 ? ' gb-proj-avatar--' + n : '');
    span.setAttribute('data-av', String(Math.max(0, GB.avatarIndex(name))));
    span.setAttribute('aria-hidden', 'true');
    span.textContent = GB.initial(name);
    return span;
  };

  GB.statusPill = function (text, id) {
    var span = document.createElement('span');
    span.className = 'gb-status' + (id ? ' gb-status-' + id : '');
    span.textContent = text;
    return span;
  };

  // Issue key shared by every page: GB.issueKey('demo', 21) -> "DEMO-21"; no project -> "#21".
  GB.issueKey = function (projectIdentifier, id) {
    var ident = String(projectIdentifier || '').trim();
    return ident ? ident.toUpperCase() + '-' + id : '#' + id;
  };

  GB.trackerBadge = function (text, id) {
    var span = document.createElement('span');
    span.className = 'gb-tracker' + (id ? ' gb-tracker-' + id : '');
    span.textContent = text;
    return span;
  };

  // ---- current user (display name is cached; login is always available) ----
  var meFns = [];
  var ME_KEY = 'greenboard.me2.';
  function readMe() {
    var a = document.querySelector('#loggedas a.user, #loggedas a');
    if (!a) return null;
    var m = (a.getAttribute('href') || '').match(/\/users\/(\d+)/);
    var me = { id: m ? m[1] : null, login: a.textContent.trim(), name: a.textContent.trim(), url: a.getAttribute('href'), known: false };
    try {
      var cached = me.id && localStorage.getItem(ME_KEY + me.id);
      if (cached) { me.name = cached; me.known = true; }
    } catch (e) { /* storage unavailable */ }
    return me;
  }
  GB.currentUser = function () { return readMe(); };
  GB.onCurrentUser = function (fn) { meFns.push(fn); };

  function refreshMe() {
    var me = readMe();
    if (!me || !me.id || !window.fetch) return;
    var stamp;
    try { stamp = Number(sessionStorage.getItem(ME_KEY + 'checked.' + me.id) || 0); } catch (e) { stamp = 0; }
    if (stamp && Date.now() - stamp < 30 * 60 * 1000) return;
    fetch('/users/' + me.id, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var h2 = doc.querySelector('#content > h2');
        if (!h2) return;
        h2.querySelectorAll('.avatar, img, svg').forEach(function (n) { n.remove(); });
        var name = h2.textContent.replace(/\s+/g, ' ').trim();
        if (!name) return;
        try {
          localStorage.setItem(ME_KEY + me.id, name);
          sessionStorage.setItem(ME_KEY + 'checked.' + me.id, String(Date.now()));
        } catch (e) { /* ignore */ }
        if (name !== me.name || !me.known) {
          me.name = name;
          me.known = true;
          meFns.forEach(function (fn) { try { fn(me); } catch (err) { console.error('[greenboard]', err); } });
        }
      })
      .catch(function () { /* offline or blocked: keep the login */ });
  }

  function runReady() {
    if (isReady) return;
    isReady = true;
    readyFns.forEach(function (fn) { try { fn(); } catch (e) { console.error('[greenboard]', e); } });
    if (window.jQuery) {
      jQuery(document).ajaxComplete(function () {
        ajaxFns.forEach(function (fn) { try { fn(document); } catch (e) { console.error('[greenboard]', e); } });
      });
    }
    // rails-ujs remote forms/links (data-remote) do not go through jQuery.ajax
    document.addEventListener('ajax:complete', function () {
      setTimeout(function () {
        ajaxFns.forEach(function (fn) { try { fn(document); } catch (e) { console.error('[greenboard]', e); } });
      }, 0);
    });
    ajaxFns.forEach(function (fn) { try { fn(document); } catch (e) { console.error('[greenboard]', e); } });
    refreshMe();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runReady);
  else runReady();
})();

// === 15-c-comment.js ===
// 15-c-comment: the collapsed comment entry row (owner: c-comment, DESIGN §6.10, ACCEPTANCE K1).
// One builder for /issues/:id, /news/:id and /boards/:id/topics/:id; styled only by css/15-c-comment.css.
//   GB.commentCta(label, onOpen, userName?) -> div.gb-comment-cta
//     children: the current user's 28px GB.avatar + <button type="button" class="gb-comment-cta__btn">label</button>
//     onOpen(event) runs on click / Enter / Space (native button activation).
//     userName is optional; without it the avatar follows GB.currentUser() and updates once the display
//     name is known (GB.onCurrentUser).
// The page owns the expanded panel, where the row is inserted, and toggling `row.hidden` while the panel
// is open; it should return focus with GB.commentCta.focus(row) on close.
(function () {
  var GB = window.GB;

  function meName() {
    var me = typeof GB.currentUser === 'function' ? GB.currentUser() : null;
    return me ? me.name : '';
  }

  function commentCta(label, onOpen, userName) {
    var row = document.createElement('div');
    row.className = 'gb-comment-cta';
    var avatar = GB.avatar(userName || meName(), 28);
    row.appendChild(avatar);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gb-comment-cta__btn';
    btn.textContent = label;
    btn.addEventListener('click', function (e) {
      if (typeof onOpen === 'function') onOpen(e);
    });
    row.appendChild(btn);

    if (!userName && typeof GB.onCurrentUser === 'function') {
      GB.onCurrentUser(function (me) {
        if (!me || !me.name || !row.contains(avatar)) return;
        var next = GB.avatar(me.name, 28);
        row.replaceChild(next, avatar);
        avatar = next;
      });
    }
    return row;
  }

  commentCta.focus = function (row) {
    var btn = row && row.querySelector('.gb-comment-cta__btn');
    if (btn) btn.focus({ preventScroll: true });
  };

  GB.commentCta = commentCta;
})();

// === 15-c-editor.js ===
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

// === 15-c-filter.js ===
// 15-c-filter — filter bar `#query_form` (DESIGN §6.9, ACCEPTANCE Q1). The ONE decorator for the query
// filter panel on issues, board, time entries, calendar, gantt, /projects, /users and /admin/projects:
//   - 「＋ フィルタを追加」 as the blank option of #add_filter_select (the label stays for screen readers)
//   - the save-query link is an icon button: title + aria-label 「カスタムクエリを保存」 (css/15-c-filter.css)
//   - folded legends say what is active: フィルタ 「N件の条件」, オプション 「グループ: 〈name〉」 (.gb-opt-summary)
//   - phones (< 768px): both fieldsets start folded on every load (not persisted); a validation error or a
//     checked filter without a value keeps フィルタ open
(function () {
  var GB = window.GB;
  if (!GB) return;
  var SAVE_LABEL = 'カスタムクエリを保存';
  var ADD_PROMPT = '＋ フィルタを追加';
  var PHONE = '(max-width: 767px)';

  function isPhone() { return !!(window.matchMedia && window.matchMedia(PHONE).matches); }

  function legendOf(form, id) { return form.querySelector('fieldset#' + id + ' > legend'); }

  function legendSummary(legend, text) {
    if (!legend) return;
    var span = legend.querySelector(':scope > .gb-opt-summary');
    if (!text) { if (span) span.remove(); return; }
    if (!span) {
      span = document.createElement('span');
      span.className = 'gb-opt-summary';
      legend.appendChild(span);
    }
    if (span.textContent !== text) span.textContent = text;
  }

  function checkedFilters(form) {
    return form.querySelectorAll('#filters-table input[type=checkbox][name="f[]"]:checked');
  }

  function summarize(form) {
    var n = checkedFilters(form).length;
    legendSummary(legendOf(form, 'filters'), n ? n + '件の条件' : '');
    var group = form.querySelector('select#group_by');
    var opt = group && group.value ? group.options[group.selectedIndex] : null;
    legendSummary(legendOf(form, 'options'), opt ? 'グループ: ' + opt.textContent.trim() : '');
  }

  function decoratePrompt(form) {
    var sel = form.querySelector('#add_filter_select');
    if (!sel || sel.dataset.gbPrompt) return;
    sel.dataset.gbPrompt = '1';
    var blank = sel.querySelector('option[value=""]');
    if (blank && !blank.textContent.trim()) blank.textContent = ADD_PROMPT;
  }

  function decorateSave(form) {
    var save = form.querySelector('#query_form_with_buttons > p.buttons > a.icon-save');
    if (!save || save.dataset.gbSave) return;
    save.dataset.gbSave = '1';
    var label = save.querySelector('.icon-label');
    var text = (label && label.textContent.trim()) || save.textContent.trim() || SAVE_LABEL;
    save.title = text;
    save.setAttribute('aria-label', text);
  }

  function fold(fieldset) {
    var legend = fieldset && fieldset.querySelector(':scope > legend');
    if (!legend || fieldset.classList.contains('collapsed') || typeof window.toggleFieldset !== 'function') return;
    window.toggleFieldset(legend);
  }

  function unfold(fieldset) {
    var legend = fieldset && fieldset.querySelector(':scope > legend');
    if (!legend || !fieldset.classList.contains('collapsed') || typeof window.toggleFieldset !== 'function') return;
    window.toggleFieldset(legend);
  }

  // a checked filter whose value inputs are all empty (operators without a value — 「すべて」「なし」 … —
  // have their value span hidden, so only visible inputs count)
  function hasEmptyFilter(form) {
    return Array.prototype.some.call(checkedFilters(form), function (cb) {
      var row = cb.closest('tr, .filter');
      if (!row) return false;
      // core hides the value span with an inline display:none (the fieldset itself may be folded already)
      var inputs = row.querySelectorAll('.values > span:not([style*="none"]) :is(input:not([type=hidden]), select)');
      if (!inputs.length) return false;
      return Array.prototype.every.call(inputs, function (el) {
        if (el.tagName === 'SELECT') return !Array.prototype.some.call(el.selectedOptions, function (o) { return o.value !== ''; });
        return !String(el.value || '').trim();
      });
    });
  }

  function foldOnPhone(form) {
    if (form.dataset.gbFold || !isPhone()) return;
    form.dataset.gbFold = '1';
    var filters = form.querySelector('fieldset#filters');
    var options = form.querySelector('fieldset#options');
    var error = document.getElementById('errorExplanation');
    if (!error) fold(filters);
    fold(options);
    // core builds the filter rows in its own ready handler, after this first pass: re-open フィルタ when a
    // checked filter turned out to have no value (the user has to see what is missing)
    window.setTimeout(function () {
      if (filters && hasEmptyFilter(form)) unfold(filters);
      summarize(form);
    }, 0);
  }

  function run() {
    var form = document.getElementById('query_form');
    if (!form || !form.querySelector('#query_form_with_buttons')) return;
    decoratePrompt(form);
    decorateSave(form);
    foldOnPhone(form);
    summarize(form);
    if (form.dataset.gbSummary) return;
    form.dataset.gbSummary = '1';
    form.addEventListener('change', function () { summarize(form); });
    form.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('legend')) window.setTimeout(function () { summarize(form); }, 0);
    });
    // core adds the filter rows from JSON in its own ready handler, after this first pass
    window.setTimeout(function () { summarize(form); }, 0);
    window.addEventListener('load', function () { summarize(form); });
  }

  GB.ready(run);
  GB.onAjax(run);
})();

// === 15-c-form.js ===
// 15-c-form — form primitives (DESIGN §6.2, ACCEPTANCE F2). The ONE blank-option decorator.
// Every single select whose first option is empty (value "", no visible text) or core's
// 「--- 選んでください ---」 prompt or core's 「なし」 (label_none, "no value": デフォルトのクエリ,
// デフォルトのマイルストーン …) reads 「未設定」 (textContent and label; value stays "") and gets
// class `gb-unset` (muted, css/15-c-form.css) while that option is selected.
// An empty-value first option that means something else (「(自動設定)」, 「デフォルト」,
// 「ユーザーの言語の設定に従う」, text formatting 「なし」 = plain text …) keeps its wording but gets the
// same muted style (ACCEPTANCE L5, DESIGN §6.2). GET (filter) forms are left alone.
// Public helpers:
//   GB.form.labelBlank(select, text, muted) -> true when the blank option was (re)labelled
//     (for the listed exceptions that keep their own wording, e.g. 「すべてのユーザー」, muted === false)
//   GB.form.syncUnset(select)
//   GB.form.markRequired(label)  -> appends core's required marker once
//   GB.form.labelText(label)     -> the label's text without the marker
(function () {
  var GB = window.GB;
  var UNSET_LABEL = '未設定';
  var PROMPT = /^-+\s.*\s-+$/;
  var NONE = 'なし';
  // 「なし」 here is a real choice (no formatting / no compression), not "no value": keep the wording
  var NONE_KEEP = '#settings_text_formatting, #settings_wiki_compression';
  // an empty-value first option that is a concrete choice shown in normal colour (§6.2):
  // custom field 表示 「ドロップダウンリスト」 (drop-down vs checkboxes)
  var OWN_KEEP = '#custom_field_edit_tag_style';
  // deliberate exceptions (§6.2): their blank option means "choose an action" / "all"; filter-row value
  // selects are untouched; bulk edit reads 「(変更なし)」 (§6.4)
  var SKIP = '#add_filter_select, #block-select, #criterias, #filters-table select, ' +
    '#activity_scope_form select, #bulk_edit_form select';

  function blankOption(select) {
    var o = select.options[0];
    if (!o || o.value !== '') return null;
    var text = (o.label || '').trim();
    var mode = o.dataset.gbUnset;
    return (!text || PROMPT.test(text) || mode === '1' || mode === 'keep') ? o : null;
  }

  // core's 「なし」 for "no value" (label_none) on a non-filter form
  function noneOption(select) {
    var o = select.options[0];
    if (!o || o.value !== '' || o.dataset.gbUnset || isFilterForm(select) || select.matches(NONE_KEEP)) return null;
    return (o.label || '').trim() === NONE ? o : null;
  }

  function isFilterForm(select) {
    var f = select.form;
    return !!(f && (f.getAttribute('method') || 'get').toLowerCase() === 'get');
  }

  // '1' = 「未設定」, 'auto' = own wording, muted; 'keep' = own wording, not muted (listed exceptions)
  function syncUnset(select) {
    var o = select.options[0];
    var mode = o && o.dataset.gbUnset;
    select.classList.toggle('gb-unset', !!((mode === '1' || mode === 'auto') && select.value === ''));
  }

  // an empty-value option with its own wording (「(自動設定)」 …): same muted style, wording kept
  function muteOwnWording(select) {
    if (select.matches(OWN_KEEP)) return;
    var o = select.options[0];
    if (!o || o.value !== '' || o.dataset.gbUnset || isFilterForm(select) || !(o.label || '').trim()) return;
    if (!o.hasAttribute('value')) o.setAttribute('value', '');
    o.dataset.gbUnset = 'auto';
    syncUnset(select);
  }

  function labelBlank(select, text, muted) {
    var o = blankOption(select) || noneOption(select);
    if (!o) return false;
    // core sometimes renders <option></option> without a value attribute: pin value="" first,
    // otherwise the new label text would be submitted as the value
    if (!o.hasAttribute('value')) o.setAttribute('value', '');
    if (o.textContent !== text) o.textContent = text;
    // core renders <option value="" label=" ">: the label attribute wins over the text
    if (o.hasAttribute('label')) o.label = text;
    o.dataset.gbUnset = muted === false ? 'keep' : '1';
    syncUnset(select);
    return true;
  }

  function decorate(root) {
    Array.prototype.forEach.call((root || document).querySelectorAll('select:not([multiple])'), function (select) {
      if (select.matches(SKIP) || (select.size && select.size > 1)) return;
      if (!labelBlank(select, UNSET_LABEL)) muteOwnWording(select);
    });
  }

  // required marker 「*」 (§6.3): the same markup core renders, for labels core leaves unmarked
  var MARKER = 'span.required';
  function markRequired(label) {
    if (!label || label.querySelector(MARKER)) return;
    var mark = document.createElement('span');
    mark.className = 'required';
    mark.textContent = ' *';
    label.appendChild(mark);
  }
  // a label's text without its required marker (e.g. to match it against an error message)
  function labelText(label) {
    var copy = label.cloneNode(true);
    Array.prototype.forEach.call(copy.querySelectorAll(MARKER), function (m) { m.parentNode.removeChild(m); });
    return copy.textContent;
  }

  GB.form = {
    labelBlank: labelBlank, syncUnset: syncUnset, markRequired: markRequired, labelText: labelText,
    UNSET_LABEL: UNSET_LABEL
  };

  GB.ready(function () {
    document.addEventListener('change', function (e) {
      var t = e.target;
      if (t && t.tagName === 'SELECT' && !t.multiple) syncUnset(t);
    });
  });
  GB.onAjax(decorate);
})();

// === 15-c-issue-row.js ===
// 15-c-issue-row: issue rows, cards and gantt rows (owner: c-issue-row, DESIGN §6.6–§6.8)
//   - key column header 「#」 -> 「キー」 (table headers and the 「#」 entry of the column pickers), sort link kept
//   - gantt subject column: width and the key-only link text (the tracker name stays in the link title)
// Issue keys themselves come from GB.issueKey (00-core.js); the status-dot select row only needs data-status
// on its <p> (set by the issue form and the board modal), the dot is CSS (15-c-issue-row.css).
(function () {
  var GB = window.GB;
  var KEY_LABEL = 'キー';

  // ---------- I3: 「キー」 header wherever a column lists issue keys ----------
  function relabelKeyHeaders(root) {
    (root || document).querySelectorAll('table.list th.id').forEach(function (th) {
      if (th.getAttribute('data-gb-keyhead')) return;
      th.setAttribute('data-gb-keyhead', '1');
      var a = th.querySelector('a');
      // only the visible text node (also inside the sorted link's .icon-label); the sort link (href, data-*)
      // and its arrow stay as they are
      var walker = document.createTreeWalker(th, NodeFilter.SHOW_TEXT);
      for (var n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeValue.trim() === '#') n.nodeValue = KEY_LABEL;
      }
      if (a && a.title) a.title = a.title.replace('"#"', '"' + KEY_LABEL + '"');
    });
    // column pickers (オプション → 項目, available / selected) and sort selects
    (root || document).querySelectorAll('select option').forEach(function (o) {
      if (o.value === 'id' && o.textContent.trim() === '#') {
        o.textContent = KEY_LABEL;
        if (o.label) o.label = KEY_LABEL;
      }
    });
  }

  // ---------- I6: gantt subject column ----------
  // The column is measured on the gantt table, not the window: max(280px, min(420px, 45% of the table)).
  // At 1273px with the right sidebar open the table is ~710px -> 320px, which shows avatar / icon + key +
  // at least 12 full-width characters of every top-level subject; the chart keeps the remaining 55%+.
  // Phones (<= 480px) keep a narrow column (95-responsive.css sizes it; the subject is in the row title).
  // Every element core sized to the column width moves by the same delta (as core's own column resize does);
  // bars are untouched. Re-measured when the table width changes, never on core's own drag-resize.
  var GANTT_MIN = 280;
  var GANTT_MAX = 420;
  var GANTT_SHARE = 0.45;
  var GANTT_PHONE = 160;

  function ganttTarget(tableW) {
    if (window.matchMedia('(max-width: 480px)').matches) return GANTT_PHONE;
    return Math.max(GANTT_MIN, Math.min(GANTT_MAX, Math.floor(tableW * GANTT_SHARE)));
  }

  function sizeGanttSubjects(table, td) {
    var current = parseFloat(td.style.width);
    var tableW = table.offsetWidth;
    if (!current || !tableW) return;
    var target = ganttTarget(tableW);
    var delta = target - current;
    table.setAttribute('data-gb-subjects-w', String(Math.round(tableW)));
    var nodes = [td].concat(Array.prototype.slice.call(td.querySelectorAll(
      '.gantt_subjects_container, .gantt_subjects_container > .gantt_hdr')));
    nodes.forEach(function (n) {
      var w = parseFloat(n.style.width);
      if (w) n.style.width = Math.max(0, w + delta) + 'px';
    });
    // rows: the column's rendered width minus their indent — core's own formula in resizableSubjectColumn
    td.style.minWidth = target + 'px';
    var colW = td.getBoundingClientRect().width;
    td.querySelectorAll('.project-name, .issue-subject, .version-name').forEach(function (n) {
      var left = parseFloat(n.style.left) || 0;
      n.style.width = Math.max(0, colW - left) + 'px';
    });
  }

  // 「バグ #14」 -> 「#14」 / 「DEMO-14」: the tracker name only lives in the link title (§6.7: the gantt row is
  // one line, the subject gets the width); the full subject is appended to the title too
  function keyOnlyGanttLinks(td) {
    td.querySelectorAll('.issue-subject a.issue').forEach(function (a) {
      if (a.getAttribute('data-gb-keyonly')) return;
      a.setAttribute('data-gb-keyonly', '1');
      var m = a.textContent.trim().match(/^(.+?) (\S+-\d+|#\d+)$/);
      if (m) {
        var num = m[2].match(/^#(\d+)$/);
        var proj = document.body.className.match(/(?:^|\s)project-([^\s]+)/);
        a.textContent = m[2];
        a.title = m[1] + ' ' + (num && proj ? GB.issueKey(proj[1], num[1]) : m[2]);
      }
      var row = a.closest('.issue-subject');
      var subj = row && row.getAttribute('title');
      if (subj && a.title.indexOf(subj) < 0) a.title = a.title + ': ' + subj;
    });
  }

  function decorateGantt() {
    var td = document.querySelector('.controller-gantts table.gantt-table td.gantt_subjects_column');
    var table = td && td.closest('table.gantt-table');
    if (!table) return;
    keyOnlyGanttLinks(td);
    if (td.getAttribute('data-gb-wide')) return;
    td.setAttribute('data-gb-wide', '1');
    var timer = 0;
    var recheck = function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = 0;
        var cell = table.querySelector('td.gantt_subjects_column');
        if (!cell) return;
        var last = parseFloat(table.getAttribute('data-gb-subjects-w')) || 0;
        if (Math.abs(table.offsetWidth - last) > 1) sizeGanttSubjects(table, cell);
      }, 50);
    };
    // the stylesheet (and the sidebars) can settle after ready: measure again once loaded
    if (typeof ResizeObserver === 'function') new ResizeObserver(recheck).observe(table);
    window.addEventListener('resize', recheck);
    window.addEventListener('load', recheck);
    setTimeout(recheck, 400);
    sizeGanttSubjects(table, td);
  }

  // ---------- L6: dashboard 担当 / ウォッチ tables — tracker badge under the key ----------
  // 70-dashboard-project-home.js puts the badge in front of the subject; a copy goes under the key, and CSS
  // shows one of the two (the key copy whenever the キー column is visible), so the subject gets the cell.
  function trackerUnderKey() {
    document.querySelectorAll('#my-page .mypage-box table.list tr.issue').forEach(function (tr) {
      var idCell = tr.querySelector(':scope > td.id');
      var pill = tr.querySelector(':scope > td.subject > .gb-subj > .gb-tracker');
      if (!idCell || !pill || idCell.querySelector(':scope > .gb-tracker--key')) return;
      var copy = pill.cloneNode(true);
      copy.removeAttribute('id');
      copy.classList.add('gb-tracker--key');
      idCell.appendChild(copy);
    });
  }
  // runs after the page decorators of the same ready / ajax pass (they create the badge)
  function laterTrackerUnderKey() { setTimeout(trackerUnderKey, 0); }

  GB.ready(function () {
    relabelKeyHeaders(document);
    decorateGantt();
    laterTrackerUnderKey();
  });
  GB.onAjax(function () {
    relabelKeyHeaders(document);
    decorateGantt();
    laterTrackerUnderKey();
  });
})();

// === 15-c-timeline.js ===
// 15-c-timeline: one timeline item for every activity list (owner: c-timeline, DESIGN §6.5)
// The plugin partial (greenboard/_timeline.html.erb) prints .gb-timeline for the dashboard and the project home.
// Core's activity lists (/activity, /projects/:id/activity, /users/:id) print <h3> + <dl><dt><dd>; this file
// rewrites them into the same DOM and class names, so 15-c-timeline.css is the only stylesheet for all of them:
//   div.gb-timeline__day (今日 / 昨日 / YYYY/MM/DD)
//   ul.gb-timeline__list > li.gb-timeline__item
//     avatar · div.gb-timeline__body (meta, title, change, desc) · time.gb-timeline__time (HH:MM)
// Server data: #gb-data (statuses, trackers, projects, wording) and #gb-timeline-data (plugin hook: the day of each
// heading and, per journal id, the old and new status, which core's markup does not carry).
(function () {
  var GB = window.GB;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function readJSON(id) {
    var node = document.getElementById(id);
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (e) { return null; }
  }
  function pageData() {
    var d = typeof GB.pageData === 'function' ? GB.pageData() : readJSON('gb-data');
    return d || {};
  }
  function find(list, key, value) {
    list = list || [];
    for (var i = 0; i < list.length; i++) if (String(list[i][key]) === String(value)) return list[i];
    return null;
  }
  function squish(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // project identifier for an issue key: the project name in the row (cross-project lists) or the page's project
  function projectIdent(projectName) {
    var name = squish(projectName);
    if (name) {
      var p = find(pageData().projects, 'name', name);
      if (p) return p.identifier;
    }
    var m = String(document.body.className).match(/(?:^|\s)project-([^\s]+)/);
    return m ? m[1] : '';
  }

  // 「バグ #8 (未対応): 件名」; time entries: 「1.00 時間 (バグ #8 (未対応): 件名)」
  var ISSUE_TITLE = /^(.+?) #(\d+)(?: \(([^)]+)\))?: ([\s\S]*)$/;
  var TIME_TITLE = /^(\S+(?: \S+)?) \(([\s\S]+)\)$/;
  // excerpts are plain text cut from Markdown / Textile: drop list / heading / quote markers and emphasis
  var MARKUP_LEAD = /^\s*(?:[*\-+#>]+|\d+\.|h\d\.|bq\.)\s+/;

  function plainExcerpt(desc) {
    if (!desc) return '';
    var lines = [''];
    Array.prototype.forEach.call(desc.childNodes, function (n) {
      if (n.nodeType === 1 && n.tagName === 'BR') { lines.push(''); return; }
      lines[lines.length - 1] += n.textContent;
    });
    return squish(lines.map(function (l) {
      return l.replace(MARKUP_LEAD, '').replace(/\*\*|__|~~|`/g, '');
    }).join(' '));
  }

  function dayHeading(h3, iso, tl, text) {
    var label = squish(h3.textContent);
    if (iso && tl) {
      if (iso === tl.today) label = text.today || label;
      else if (iso === tl.yesterday) label = text.yesterday || label;
      else label = iso.replace(/-/g, '/');
    }
    var day = el('div', 'gb-timeline__day', label);
    day.setAttribute('role', 'heading');
    day.setAttribute('aria-level', '3');
    return day;
  }

  function avatarFor(name, typeIcon) {
    if (name) return GB.avatar(name, 28);
    var a = el('span', 'gb-avatar gb-avatar--28 gb-avatar--type');
    a.setAttribute('aria-hidden', 'true');
    if (typeIcon) a.appendChild(typeIcon.cloneNode(true));
    return a;
  }

  function projectChip(projectNode) {
    var name = squish(projectNode.textContent);
    var chip = el('span', 'gb-timeline__project');
    var ident = projectIdent(name);
    var found = find(pageData().projects, 'name', name);
    if (found && ident) {
      var a = el('a', null, name);
      a.href = '/projects/' + encodeURIComponent(ident);
      chip.appendChild(a);
    } else {
      chip.appendChild(el('span', null, name));
    }
    return chip;
  }

  function statusChange(link, tl, d) {
    var m = link && (link.getAttribute('href') || '').match(/#change-(\d+)$/);
    var change = m && tl && tl.status ? tl.status[m[1]] : null;
    if (!change || change[1] == null) return null;
    var to = find(d.statuses, 'id', change[1]);
    if (!to) return null;
    var box = el('div', 'gb-timeline__change');
    var from = change[0] != null ? find(d.statuses, 'id', change[0]) : null;
    if (from) box.appendChild(GB.statusPill(from.name, from.id));
    var arrow = el('span', 'gb-timeline__arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    box.appendChild(arrow);
    box.appendChild(GB.statusPill(to.name, to.id));
    return box;
  }

  // title line: [tracker] KEY subject (+ hours chip for time entries); other events: the plain linked title
  function titleLine(link, projectName, d) {
    var title = el('div', 'gb-timeline__title');
    if (!link) return title;
    var text = squish(link.textContent);
    var hours = null;
    var tm = text.match(TIME_TITLE);
    if (tm && ISSUE_TITLE.test(tm[2])) { hours = tm[1]; text = tm[2]; }
    var m = text.match(ISSUE_TITLE);
    var tracker = m && find(d.trackers, 'name', m[1]);
    link.className = 'gb-timeline__link';
    if (!tracker) {
      link.textContent = text;
      link.title = text;
      title.appendChild(link);
      return title;
    }
    title.appendChild(GB.trackerBadge(tracker.name, tracker.id));
    var wrap = el('span', 'gb-timeline__text');
    link.textContent = '';
    link.title = m[4];
    link.appendChild(el('span', 'gb-timeline__key', GB.issueKey(projectIdent(projectName), m[2])));
    link.appendChild(document.createTextNode(' '));
    link.appendChild(el('span', 'gb-timeline__subject', m[4]));
    wrap.appendChild(link);
    if (hours) {
      wrap.appendChild(document.createTextNode(' '));
      wrap.appendChild(el('span', 'gb-timeline__hours', hours));
    }
    title.appendChild(wrap);
    return title;
  }

  function buildItem(dt, dd, iso, tl, d) {
    var type = String(dt.className).trim().split(/\s+/)[0];
    var li = el('li', 'gb-timeline__item gb-ev-' + type);
    var authorLink = dd && dd.querySelector('.author a');
    var authorName = authorLink ? squish(authorLink.textContent) : '';
    var project = dt.querySelector(':scope > .project');
    var projectName = project ? project.textContent : '';
    var link = dt.querySelector(':scope > a');
    var time = dt.querySelector(':scope > .time');

    li.appendChild(avatarFor(authorName, dt.querySelector(':scope > svg')));

    var body = el('div', 'gb-timeline__body');
    var meta = el('div', 'gb-timeline__meta');
    if (authorLink) {
      var who = el('strong', 'gb-timeline__who');
      who.appendChild(authorLink);
      meta.appendChild(who);
      meta.appendChild(el('span', 'gb-timeline__action', (d.actions && d.actions[type]) || (d.text && d.text.other) || ''));
    } else {
      meta.appendChild(el('span', 'gb-timeline__action', (d.noauthor && d.noauthor[type]) || ''));
    }
    if (project && squish(projectName)) meta.appendChild(projectChip(project));
    body.appendChild(meta);
    body.appendChild(titleLine(link, projectName, d));
    var change = statusChange(link, tl, d);
    if (change) body.appendChild(change);
    var excerpt = plainExcerpt(dd && dd.querySelector('.description'));
    if (excerpt) body.appendChild(el('p', 'gb-timeline__desc', excerpt));
    li.appendChild(body);

    var clock = time ? squish(time.textContent) : '';
    var t = el('time', 'gb-timeline__time', clock);
    if (iso && /^\d{1,2}:\d{2}$/.test(clock)) {
      var hhmm = clock.length === 4 ? '0' + clock : clock;
      t.textContent = hhmm;
      t.setAttribute('datetime', iso + 'T' + hhmm);
      t.title = iso.replace(/-/g, '/') + ' ' + hhmm;
    }
    li.appendChild(t);
    return li;
  }

  // Core lists a day's rows grouped by issue (ActivitiesHelper#sort_activity_events), so times jump back and
  // forth. The dashboard / project home list a day strictly newest first (ACCEPTANCE L3), so sort the rows the
  // same way: by the event time from #gb-timeline-data (ms, core's row order) when it matches the rows, else by
  // the shown 「HH:MM」. Ties keep core's order (stable sort).
  function newestFirst(items, times) {
    var exact = Array.isArray(times) && times.length === items.length;
    var keyed = items.map(function (li, i) {
      var t = li.querySelector('.gb-timeline__time');
      var clock = t ? String(t.getAttribute('datetime') || t.textContent).match(/(\d{1,2}):(\d{2})\s*$/) : null;
      var key = exact ? Number(times[i]) : (clock ? Number(clock[1]) * 60 + Number(clock[2]) : -1);
      return { li: li, i: i, key: isFinite(key) ? key : -1 };
    });
    keyed.sort(function (a, b) { return (b.key - a.key) || (a.i - b.i); });
    return keyed.map(function (k) { return k.li; });
  }

  function decorate() {
    var root = document.getElementById('activity');
    if (!root || root.getAttribute('data-gb-tl') || !root.querySelector(':scope > dl')) return;
    root.setAttribute('data-gb-tl', '1');
    root.classList.add('gb-timeline');
    var d = pageData();
    var tl = readJSON('gb-timeline-data');
    var days = (tl && tl.days) || [];
    var times = (tl && tl.times) || [];
    var dayIndex = 0;
    Array.prototype.slice.call(root.children).forEach(function (node) {
      if (node.tagName === 'H3') {
        var iso = days[dayIndex++] || '';
        root.replaceChild(dayHeading(node, iso, tl, d.text || {}), node);
        return;
      }
      if (node.tagName !== 'DL') return;
      var prev = node.previousElementSibling;
      var dated = prev && prev.classList.contains('gb-timeline__day');
      var iso2 = dated ? days[dayIndex - 1] || '' : '';
      var ul = el('ul', 'gb-timeline__list');
      var items = Array.prototype.slice.call(node.querySelectorAll(':scope > dt')).map(function (dt) {
        var dd = dt.nextElementSibling && dt.nextElementSibling.tagName === 'DD' ? dt.nextElementSibling : null;
        return buildItem(dt, dd, iso2, tl, d);
      });
      newestFirst(items, dated ? times[dayIndex - 1] : null).forEach(function (li) { ul.appendChild(li); });
      root.replaceChild(ul, node);
    });
  }

  GB.timeline = { decorate: decorate };
  GB.ready(decorate);
  GB.onAjax(decorate);
})();

// === 20-header.js ===
// 20-header: top bar (brand, global links, search, project jump, add issue, user menu),
// project title bar avatar and flash-notice toast.
(function () {
  var GB = window.GB;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function buildUserMenu(tools, loggedAs, account) {
    var me = GB.currentUser() || { login: loggedAs.textContent.trim(), name: loggedAs.textContent.trim() };
    var wrap = el('div', 'gb-user');
    var btn = el('button', 'gb-user__btn');
    btn.type = 'button';
    btn.id = 'gb-user-btn';
    btn.setAttribute('aria-haspopup', 'menu');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'gb-user-menu');
    // first visit: the display name is not known yet -> neutral placeholder instead of the login initial
    var pending = !me.known;
    function pendingAvatar(size) {
      var s = el('span', 'gb-avatar gb-avatar--' + size + ' gb-avatar--pending');
      s.setAttribute('aria-hidden', 'true');
      return s;
    }
    var av = pending ? pendingAvatar(28) : GB.avatar(me.name, 28);
    var nm = el('span', 'gb-user__name', me.name);
    btn.appendChild(av);
    btn.appendChild(nm);
    btn.appendChild(el('span', 'gb-user__chev'));

    var menu = el('div', 'gb-user__menu');
    menu.id = 'gb-user-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-labelledby', 'gb-user-btn');

    var head = el('div', 'gb-user__head');
    var headAv = pending ? pendingAvatar(36) : GB.avatar(me.name, 36);
    var headText = el('div', 'gb-user__head-text');
    var headName = el('span', 'gb-user__head-name', me.name);
    headText.appendChild(headName);
    headText.appendChild(el('span', 'gb-user__head-login', '@' + me.login));
    head.appendChild(headAv);
    head.appendChild(headText);
    menu.appendChild(head);

    function item(a, icon) {
      a.setAttribute('role', 'menuitem');
      var ic = GB.icon(icon, 'gb-user__icon');
      if (ic && !a.querySelector('svg')) a.insertBefore(ic, a.firstChild);
      menu.appendChild(a);
    }
    var profile = el('a', '', 'プロフィール');
    profile.href = loggedAs.getAttribute('href');
    item(profile, 'user');
    var logout = null;
    account.querySelectorAll('a').forEach(function (a) {
      if (a.classList.contains('logout')) { logout = a; return; }
      item(a, a.classList.contains('my-account') ? 'settings' : 'link');
    });
    if (logout) {
      menu.appendChild(el('div', 'gb-user__sep'));
      item(logout, 'arrow-narrow-right');
    }

    function setOpen(open, focusBtn) {
      wrap.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        var first = menu.querySelector('a');
        if (first) first.focus();
      } else if (focusBtn) {
        btn.focus();
      }
    }
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!wrap.classList.contains('is-open'), false);
    });
    menu.addEventListener('keydown', function (e) {
      var items = Array.prototype.slice.call(menu.querySelectorAll('a'));
      var i = items.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false, true); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === 'Tab') { setOpen(false, false); }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) setOpen(false, false);
    });
    wrap.appendChild(btn);
    wrap.appendChild(menu);
    tools.appendChild(wrap);

    function applyName(name) {
      pending = false;
      nm.textContent = name;
      headName.textContent = name;
      av.replaceWith(av = GB.avatar(name, 28));
      headAv.replaceWith(headAv = GB.avatar(name, 36));
    }
    GB.onCurrentUser(function (u) { applyName(u.name); });
    // profile fetch failed or is slow: fall back to the login after a moment
    if (pending) setTimeout(function () { if (pending) applyName(me.name); }, 3000);
  }

  function buildHeader() {
    var top = document.getElementById('top-menu');
    if (!top || top.dataset.gbHeader) return;
    top.dataset.gbHeader = '1';

    // brand (site name = last segment of the page title)
    var parts = document.title.split(' - ');
    var brand = el('a', 'gb-brand');
    brand.href = '/';
    brand.appendChild(el('span', 'gb-brand__mark'));
    brand.appendChild(el('span', 'gb-brand__name', parts[parts.length - 1] || 'Redmine'));
    top.insertBefore(brand, top.firstChild);

    var tools = el('div', 'gb-topbar-tools');
    var search = document.getElementById('quick-search');
    if (search) {
      var q = search.querySelector('input#q');
      if (q) {
        if (!q.getAttribute('placeholder')) q.setAttribute('placeholder', '検索');
        q.setAttribute('autocomplete', 'off');
      }
      // the visually hidden "検索" link must not be an invisible tab stop
      var hiddenLink = search.querySelector('form > label a');
      if (hiddenLink) hiddenLink.setAttribute('tabindex', '-1');
      tools.appendChild(search);
      enhanceProjectJump(search.querySelector('#project-jump'));
    }

    var loggedAs = document.querySelector('#loggedas a');
    if (loggedAs) {
      var projectNew = document.querySelector('#main-menu a.new-issue-sub');
      var add = el('a', 'gb-add-issue');
      add.href = projectNew ? projectNew.getAttribute('href') : '/issues/new';
      var ic = GB.icon('add', 'gb-nav-icon');
      if (ic) add.appendChild(ic);
      add.appendChild(el('span', '', '課題の追加'));
      tools.appendChild(add);
    }

    var account = document.getElementById('account');
    if (loggedAs && account) buildUserMenu(tools, loggedAs, account);

    top.appendChild(tools);
    // logged out: ログイン / 登録する are shown last, so make them last in the tab order too
    if (!loggedAs && account) top.appendChild(account);
    markActiveGlobalLink(top);
    document.documentElement.classList.add('gb-header-ready');
  }

  var ALL_PROJECTS_LINK = 'プロジェクト一覧を見る';

  // project jump: keyboard reachable button (core trigger is a plain span), shorter idle label
  function enhanceProjectJump(jump) {
    if (!jump || jump.dataset.gbJump) return;
    var trigger = jump.querySelector('.drdn-trigger');
    var content = jump.querySelector('.drdn-content');
    if (!trigger) return;
    jump.dataset.gbJump = '1';
    var inProject = !!document.querySelector('#header .current-project');
    var label = trigger.textContent.trim();
    trigger.setAttribute('tabindex', '0');
    trigger.setAttribute('role', 'button');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    if (!inProject) {
      trigger.setAttribute('aria-label', label.replace(/[.…]+$/, ''));
      trigger.setAttribute('title', label.replace(/[.…]+$/, ''));
      trigger.textContent = 'プロジェクト';
    } else {
      trigger.setAttribute('title', label);
    }
    var input = jump.querySelector('#projects-quick-search');
    if (input && !input.getAttribute('aria-label')) input.setAttribute('aria-label', 'プロジェクトを検索');
    if (input && !input.getAttribute('placeholder')) input.setAttribute('placeholder', 'プロジェクトを検索');
    trigger.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        trigger.click();
      }
    });
    if (content) {
      // the footer link repeated the 「全プロジェクト」 section heading right above it
      var relabelAll = function () {
        content.querySelectorAll('.drdn-items.all-projects > a').forEach(function (a) {
          if (a.textContent.trim() !== ALL_PROJECTS_LINK) a.textContent = ALL_PROJECTS_LINK;
        });
      };
      relabelAll();
      new MutationObserver(relabelAll).observe(content, { childList: true, subtree: true });
      content.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          e.preventDefault();
          jump.classList.remove('expanded');
          trigger.focus();
        }
      });
    }
    new MutationObserver(function () {
      var open = jump.classList.contains('expanded');
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      // the hover tooltip (project name) must not cover the dropdown's search field while it is open
      if (open) {
        // close first: jQuery UI moves the title away while its tooltip is open and restores it on close
        if (window.jQuery) {
          var $t = jQuery(trigger);
          if ($t.data('ui-tooltip')) $t.tooltip('close');
        }
        document.querySelectorAll('.ui-tooltip').forEach(function (tip) { tip.remove(); });
        if (trigger.hasAttribute('title')) {
          trigger.setAttribute('data-gb-title', trigger.getAttribute('title'));
          trigger.removeAttribute('title');
        }
      } else if (trigger.hasAttribute('data-gb-title')) {
        trigger.setAttribute('title', trigger.getAttribute('data-gb-title'));
        trigger.removeAttribute('data-gb-title');
      }
    }).observe(jump, { attributes: true, attributeFilter: ['class'] });
  }

  // global links: core only marks some of them; mark the current section (admin, dashboard, home)
  var ADMIN_CONTROLLERS = ['admin', 'settings', 'users', 'groups', 'roles', 'trackers', 'issue_statuses', 'workflows',
    'custom_fields', 'enumerations', 'auth_sources', 'ldap_auth_sources', 'imports', 'oauth2_applications', 'issue_relations'];
  function markActiveGlobalLink(top) {
    var links = top.querySelectorAll(':scope > ul > li > a');
    var current = top.querySelector(':scope > ul > li > a.selected');
    var body = document.body;
    var inProject = !!document.querySelector('#header .current-project');
    // admin pages (incl. /admin/projects, which core marks as プロジェクト) belong to 管理
    if (body.classList.contains('controller-admin')) {
      var adminLink = top.querySelector(':scope > ul > li > a.administration');
      if (adminLink) {
        if (current && current !== adminLink) current.classList.remove('selected');
        adminLink.classList.add('selected');
        current = adminLink;
      }
    }
    if (!current) {
      var cls = null;
      var ctrl = (String(body.className).match(/(?:^|\s)controller-([\w-]+)/) || [])[1];
      var act = (String(body.className).match(/(?:^|\s)action-([\w-]+)/) || [])[1];
      if (!inProject && ADMIN_CONTROLLERS.indexOf(ctrl) >= 0 && !(ctrl === 'users' && act === 'show')) cls = 'administration';
      else if (ctrl === 'my' && act === 'page') cls = 'my-page';
      else if (ctrl === 'welcome') cls = 'home';
      else if (!inProject && ctrl === 'projects' && act === 'index') cls = 'projects';
      if (cls) current = top.querySelector(':scope > ul > li > a.' + cls);
      if (current) current.classList.add('selected');
    }
    links.forEach(function (a) { if (a === current) a.setAttribute('aria-current', 'page'); });
  }

  // project title bar: rounded-square avatar before the project name
  function decorateProjectTitle() {
    var h1 = document.querySelector('#header > h1');
    var cur = h1 && h1.querySelector('.current-project');
    if (!cur || h1.dataset.gbTitle) return;
    h1.dataset.gbTitle = '1';
    var name = cur.textContent.trim();
    var wrap = el('span', 'gb-header-title');
    while (h1.firstChild) wrap.appendChild(h1.firstChild);
    h1.appendChild(GB.projectAvatar(name, 28));
    h1.appendChild(wrap);
  }

  // #flash_notice after a save becomes a toast (errors stay in flow)
  function toastify() {
    var n = document.getElementById('flash_notice');
    if (!n || n.dataset.gbToast) return;
    n.dataset.gbToast = '1';
    n.setAttribute('role', 'status');
    n.classList.add('gb-toast');
    // 「課題 #22 が作成されました」 -> DEMO-22, the key form used on every page
    var link = n.querySelector('a[href^="/issues/"]');
    var m = link && (link.getAttribute('href') || '').match(/\/issues\/(\d+)$/);
    var pm = String(document.body.className).match(/(?:^|\s)project-([^\s]+)/);
    if (m && link.textContent.trim() === '#' + m[1]) {
      if (pm) link.textContent = GB.issueKey(pm[1], m[1]);
      else if (GB.il && typeof GB.il.applyKeys === 'function') GB.il.applyKeys([{ el: link, id: m[1] }], null);
    }
    // a visible sticky form action bar (issue form) sits at the bottom: the toast floats above it
    var bars = document.querySelectorAll('.gb-form-actions');
    for (var i = 0; i < bars.length; i++) {
      var r = bars[i].getBoundingClientRect();
      if (r.height > 0 && r.bottom >= window.innerHeight - 4 && r.top < window.innerHeight) { n.classList.add('gb-toast--raised'); break; }
    }
    // the footer (Powered by Redmine …) in view: lift the toast to 12px above its top edge
    var footer = document.getElementById('footer');
    function liftAboveFooter() {
      if (!footer) return;
      var top = footer.getBoundingClientRect().top;
      var over = Math.ceil(window.innerHeight - top);
      if (over > 0) n.style.setProperty('--gb-toast-bottom', Math.max(24, over + 12) + 'px');
      else n.style.removeProperty('--gb-toast-bottom');
    }
    var io = null;
    if (footer && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(liftAboveFooter, { threshold: [0, 0.25, 0.5, 0.75, 1] });
      io.observe(footer);
    }
    // late layout changes (other decorations, images) move the footer without crossing a threshold
    var ro = null;
    if (footer && 'ResizeObserver' in window) {
      ro = new ResizeObserver(liftAboveFooter);
      ro.observe(document.body);
    }
    window.addEventListener('scroll', liftAboveFooter, { passive: true });
    window.addEventListener('resize', liftAboveFooter);
    window.addEventListener('load', liftAboveFooter);
    liftAboveFooter();
    function unlift() {
      if (io) io.disconnect();
      if (ro) ro.disconnect();
      window.removeEventListener('load', liftAboveFooter);
      window.removeEventListener('scroll', liftAboveFooter);
      window.removeEventListener('resize', liftAboveFooter);
    }
    var close = el('button', 'gb-toast__close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '閉じる');
    n.appendChild(close);
    var timer = null, left = 5000, started = 0;
    function dismiss() {
      if (n.classList.contains('is-leaving')) return;
      n.classList.add('is-leaving');
      setTimeout(function () { n.classList.add('is-gone'); unlift(); }, 220);
    }
    function start() { if (timer || n.contains(document.activeElement)) return; started = Date.now(); timer = setTimeout(dismiss, Math.max(left, 1500)); }
    function pause() { if (timer) { clearTimeout(timer); timer = null; left -= Date.now() - started; } }
    close.addEventListener('click', dismiss);
    n.addEventListener('mouseenter', pause);
    n.addEventListener('mouseleave', start);
    n.addEventListener('focusin', pause);
    n.addEventListener('focusout', function (e) { if (!n.contains(e.relatedTarget)) start(); });
    start();
  }

  // phone drawer 全般 links: no icon may repeat one of the project menu right above them, and none may
  // mean something else elsewhere (the bookmark shape is the /projects legend's ブックマーク).
  // ホーム = the theme's house (GB.homeIcon), 管理 = shield; 95-responsive.js adds the other sprite icons.
  var DRAWER_GENERAL_ICONS = { 'administration': 'shield-check' };
  function syncDrawerGeneralIcons() {
    document.querySelectorAll('.flyout-menu .js-general-menu a.home').forEach(function (a) {
      var old = a.querySelector('svg');
      if (old && old.classList.contains('gb-icon-home')) return;
      var home = GB.homeIcon('icon-svg');
      if (old) old.replaceWith(home); else a.insertBefore(home, a.firstChild);
    });
    Object.keys(DRAWER_GENERAL_ICONS).forEach(function (cls) {
      document.querySelectorAll('.flyout-menu .js-general-menu a.' + cls).forEach(function (a) {
        var want = '#icon--' + DRAWER_GENERAL_ICONS[cls];
        var use = a.querySelector('svg use');
        if (use && (use.getAttribute('href') || '').slice(-want.length) === want) return;
        var icon = GB.icon(DRAWER_GENERAL_ICONS[cls], 'icon-svg');
        if (!icon) return;
        var old = a.querySelector('svg');
        if (old) old.replaceWith(icon); else a.insertBefore(icon, a.firstChild);
      });
    });
  }

  // phone drawer (core copies #loggedas into the flyout): the display name, not the login
  function syncFlyoutUser() {
    var me = GB.currentUser();
    if (!me || !me.known) return;
    document.querySelectorAll('.flyout-menu .flyout-menu__avatar a.user').forEach(function (a) {
      if (a.textContent.trim() !== me.name) a.textContent = me.name;
    });
  }

  GB.ready(function () {
    syncFlyoutUser();
    GB.onCurrentUser(syncFlyoutUser);
    // core fills the drawer lazily: check again whenever it is opened
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.js-flyout-menu-toggle-button')) {
        setTimeout(function () { syncFlyoutUser(); syncDrawerGeneralIcons(); }, 0);
      }
    });
    syncDrawerGeneralIcons();
    window.addEventListener('load', function () { setTimeout(syncDrawerGeneralIcons, 0); });
    buildHeader();
    decorateProjectTitle();
    toastify();
  });
})();

// === 30-sidebar-nav.js ===
// 30-sidebar-nav
(function () {
  var GB = window.GB;
  var spriteHref = GB.spriteHref, svgIcon = GB.svgIcon;
  var NAV_KEY = 'greenboard.navCollapsed';

  // Apply the collapsed state before first paint to avoid a width jump.
  try {
    if (window.localStorage && localStorage.getItem(NAV_KEY) === '1') {
      document.documentElement.classList.add('gb-nav-collapsed');
    }
  } catch (e) { /* storage unavailable: start expanded */ }

  // main-menu item class -> Redmine sprite icon id
  var NAV_ICONS = {
    'new-object': 'add',
    'overview': 'list',
    'activity': 'history',
    'roadmap': 'package',
    'issues': 'issue',
    'issues-panel': 'apps',
    'new-issue': 'issue-edit',
    'time-entries': 'time',
    'gantt': 'stats',
    'calendar': 'hourglass',
    'news': 'news',
    'documents': 'document',
    'wiki': 'wiki-page',
    'boards': 'comments',
    'files': 'folder',
    'repository': 'changeset',
    'settings': 'settings',
    // application menu (no project selected)
    'projects': 'projects'
  };

  function iconFor(a) {
    for (var cls in NAV_ICONS) {
      if (a.classList.contains(cls)) return NAV_ICONS[cls];
    }
    return 'list';
  }

  function setCollapsed(collapsed) {
    document.documentElement.classList.toggle('gb-nav-collapsed', collapsed);
    try { localStorage.setItem(NAV_KEY, collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  function buildNav() {
    var menu = document.getElementById('main-menu');
    if (!menu || menu.dataset.gbNav) return;
    menu.dataset.gbNav = '1';
    var sprite = spriteHref();

    // project block (avatar + name) linking to the overview
    var current = document.querySelector('#header h1 .current-project');
    var overview = menu.querySelector('a.overview');
    if (current) {
      var name = current.textContent.trim();
      var block = document.createElement(overview ? 'a' : 'div');
      block.className = 'gb-nav-project';
      if (overview) block.href = overview.getAttribute('href');
      block.title = name;
      var avatar = GB.projectAvatar(name, 28);
      var label = document.createElement('span');
      label.className = 'gb-label';
      label.textContent = name;
      block.appendChild(avatar);
      block.appendChild(label);
      menu.insertBefore(block, menu.firstChild);
    }

    // icon + label for each top-level item
    menu.querySelectorAll(':scope > ul > li > a').forEach(function (a) {
      var text = a.textContent.trim();
      if (a.classList.contains('new-object')) text = '追加';
      // no native title: the label is visible (expanded) or shown as a CSS tooltip (collapsed rail)
      a.removeAttribute('title');
      a.textContent = '';
      if (sprite) a.appendChild(svgIcon(sprite, iconFor(a), 'gb-nav-icon'));
      var label = document.createElement('span');
      label.className = 'gb-label';
      label.textContent = text;
      a.appendChild(label);
      if (a.classList.contains('selected')) a.setAttribute('aria-current', 'page');
      if (a.classList.contains('new-object')) {
        a.setAttribute('aria-haspopup', 'menu');
        a.setAttribute('aria-expanded', 'false');
      }
    });

    // icons for the items of the add menu
    var ADD_ICONS = {
      'new-issue-sub': 'issue', 'new-issue-category': 'list', 'new-version': 'package', 'new-timelog': 'time-add',
      'new-news': 'news', 'new-document': 'document', 'new-wiki-page': 'wiki-page', 'new-file': 'file'
    };
    if (sprite) {
      menu.querySelectorAll('ul.menu-children > li > a').forEach(function (a) {
        if (a.querySelector('svg')) return;
        for (var c in ADD_ICONS) {
          if (a.classList.contains(c)) { a.insertBefore(svgIcon(sprite, ADD_ICONS[c], 'gb-nav-subicon'), a.firstChild); break; }
        }
      });
    }

    // keep aria-expanded of the add button in sync; close its menu on outside click / Esc
    var addBtn = menu.querySelector('a.new-object');
    var addMenu = addBtn && addBtn.parentNode.querySelector('ul.menu-children');
    if (addBtn && addMenu) {
      var sync = function () { addBtn.setAttribute('aria-expanded', addMenu.classList.contains('visible') ? 'true' : 'false'); };
      new MutationObserver(sync).observe(addMenu, { attributes: true, attributeFilter: ['class'] });
      document.addEventListener('click', function (e) {
        if (addMenu.classList.contains('visible') && !addBtn.parentNode.contains(e.target)) addMenu.classList.remove('visible');
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && addMenu.classList.contains('visible')) {
          addMenu.classList.remove('visible');
          addBtn.focus();
        }
      });
    }

    // collapse / expand toggle
    var toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'gb-nav-toggle';
    if (sprite) toggle.appendChild(svgIcon(sprite, 'chevrons-left', 'gb-nav-icon'));
    var tlabel = document.createElement('span');
    tlabel.className = 'gb-label';
    tlabel.textContent = 'メニューを閉じる';
    toggle.appendChild(tlabel);
    function syncToggle() {
      var collapsed = document.documentElement.classList.contains('gb-nav-collapsed');
      var text = collapsed ? 'メニューを開く' : 'メニューを閉じる';
      // expanded: the label is visible, so no tooltip (it doubled the label); collapsed rail: tooltip only
      if (collapsed) toggle.title = text; else toggle.removeAttribute('title');
      toggle.setAttribute('aria-label', text);
      toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      tlabel.textContent = text;
    }
    toggle.addEventListener('click', function () {
      // close an open title tooltip first: jQuery UI restores the title attribute when it closes
      if (window.jQuery && jQuery(toggle).data('ui-tooltip')) jQuery(toggle).tooltip('close');
      setCollapsed(!document.documentElement.classList.contains('gb-nav-collapsed'));
      syncToggle();
    });
    syncToggle();
    menu.appendChild(toggle);
  }

  // right #sidebar collapse toggle: accessible name + state (core only swaps the icon)
  function enhanceSidebarToggle() {
    var btn = document.getElementById('sidebar-switch-button');
    var main = document.getElementById('main');
    if (!btn || !main || btn.dataset.gbToggle) return;
    btn.dataset.gbToggle = '1';
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-controls', 'sidebar-wrapper');
    function sync() {
      var collapsed = main.classList.contains('collapsedsidebar');
      var text = collapsed ? 'サイドバーを開く' : 'サイドバーを閉じる';
      btn.setAttribute('aria-label', text);
      btn.setAttribute('title', text);
      btn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
      // the jQuery UI tooltip opened on hover keeps the old text: close it so it never contradicts the state
      if (window.jQuery) {
        var $b = window.jQuery(btn);
        if ($b.data('ui-tooltip')) $b.tooltip('close');
      }
    }
    new MutationObserver(sync).observe(main, { attributes: true, attributeFilter: ['class'] });
    sync();
  }

  // ---- one stable frame: the application nav on every logged-in, non-project page ----
  // Core renders the application menu only on some global pages (projects, activity, search...).
  // Remember it there and rebuild the same nav where core omits it (home, my page/account, profile),
  // so the content card does not jump between 24px and the nav width. Admin pages get the same nav too (P2):
  // their own admin menu stays as the settings card inside the content area.
  var APPMENU_KEY = 'greenboard.appmenu.';
  var NO_APPNAV = ['account', 'issue_relations', 'repositories'];

  function appMenuKey() {
    var me = GB.currentUser();
    var lang = '.' + (document.documentElement.lang || '');
    if (!me) return APPMENU_KEY + 'anon' + lang; // logged out: the same プロジェクト / 活動 nav, cached separately
    return me.id ? APPMENU_KEY + me.id + lang : null;
  }
  function cleanMenuHTML(ul) {
    var copy = ul.cloneNode(true);
    copy.querySelectorAll('.selected').forEach(function (n) { n.classList.remove('selected'); });
    copy.querySelectorAll('[aria-current]').forEach(function (n) { n.removeAttribute('aria-current'); });
    return copy.outerHTML;
  }
  function rememberAppMenu() {
    var menu = document.getElementById('main-menu');
    if (!menu || document.querySelector('#header .current-project')) return;
    var ul = menu.querySelector(':scope > ul');
    var key = appMenuKey();
    if (!ul || !key || !ul.querySelector('li > a')) return;
    try { localStorage.setItem(key, cleanMenuHTML(ul)); } catch (e) { /* ignore */ }
  }
  function wantsAppNav() {
    if (document.getElementById('main-menu')) return false;
    var header = document.getElementById('header');
    if (!header || header.querySelector('.current-project')) return false;
    var ctrl = (String(document.body.className).match(/(?:^|\s)controller-([\w-]+)/) || [])[1];
    return NO_APPNAV.indexOf(ctrl) < 0;
  }
  function injectAppMenu(html) {
    if (!html || document.getElementById('main-menu')) return false;
    var header = document.getElementById('header');
    var tpl = document.createElement('div');
    tpl.innerHTML = html;
    var ul = tpl.firstElementChild;
    if (!ul || ul.tagName !== 'UL') return false;
    var menu = document.createElement('div');
    menu.id = 'main-menu';
    menu.className = 'tabs gb-app-nav';
    menu.setAttribute('role', 'navigation');
    menu.setAttribute('aria-label', 'グローバルメニュー');
    menu.appendChild(ul);
    // mark the current page if it is one of the items
    var here = location.pathname.replace(/\/$/, '') || '/';
    ul.querySelectorAll('li > a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0].replace(/\/$/, '') || '/';
      if (href === here) a.classList.add('selected');
    });
    header.appendChild(menu);
    ensureFlyoutSlot(ul);
    return true;
  }
  // Core renders the drawer's 「プロジェクト」 section (h3 + .js-project-menu) only where it renders #main-menu.
  // Give the rebuilt nav the same slot, so core responsive.js moves it into the drawer below 900px and the
  // 768–899 icon rail (95-responsive.css) shows on every global page, not only on /projects, /activity, /search.
  function ensureFlyoutSlot(ul) {
    var flyout = document.querySelector('.js-flyout-menu');
    if (!flyout || flyout.querySelector('.js-project-menu')) return;
    var general = flyout.querySelector('.js-general-menu');
    var before = general && general.previousElementSibling && general.previousElementSibling.tagName === 'H3'
      ? general.previousElementSibling : general;
    var h3 = document.createElement('h3');
    var first = ul.querySelector('li > a.projects') || ul.querySelector('li > a');
    h3.textContent = first ? first.textContent.trim() : '';
    var slot = document.createElement('span');
    slot.className = 'js-project-menu';
    flyout.insertBefore(h3, before || null);
    flyout.insertBefore(slot, before || null);
  }
  // A nav injected after core's setupFlyout ran in drawer mode (first visit, menu fetched late) is moved
  // into the drawer the way core would have done it; on resize core moves it back and forth by itself.
  function syncLateFlyout() {
    var slot = document.querySelector('.js-flyout-menu .js-project-menu');
    var ul = document.querySelector('#main-menu.gb-app-nav > ul');
    if (!slot || !ul || slot.querySelector(':scope > ul')) return;
    if (document.querySelector('.js-flyout-menu .js-general-menu > ul')) slot.appendChild(ul);
  }
  function ensureAppNav(done) {
    if (!wantsAppNav()) { done(); return; }
    var key = appMenuKey();
    var cached = null;
    try { cached = key && localStorage.getItem(key); } catch (e) { cached = null; }
    if (cached && injectAppMenu(cached)) { done(); return; }
    done();
    if (!window.fetch) return;
    // first visit ever: borrow the menu from the projects page once, then cache it
    fetch('/projects', { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var ul = doc.querySelector('#main-menu > ul');
        if (!ul) return;
        var clean = cleanMenuHTML(ul);
        try { if (key) localStorage.setItem(key, clean); } catch (e) { /* ignore */ }
        // place the late nav instantly: no sliding margin (and no half-finished slide in a background tab)
        var root = document.documentElement;
        var hadAnim = root.classList.contains('gb-anim');
        root.classList.remove('gb-anim');
        if (injectAppMenu(clean)) { buildNav(); syncLateFlyout(); }
        // commit the final layout now, so turning transitions on (here or on load) never animates it
        void getComputedStyle(document.getElementById('main') || document.body).marginLeft;
        if (hadAnim) root.classList.add('gb-anim');
      })
      .catch(function () { /* keep the page without the nav */ });
  }

  GB.ready(function () {
    rememberAppMenu();
    ensureAppNav(buildNav);
    enhanceSidebarToggle();
    // enable width/margin transitions only after the first paint
    window.addEventListener('load', function () {
      setTimeout(function () { document.documentElement.classList.add('gb-anim'); }, 50);
    });
    if (document.readyState === 'complete') document.documentElement.classList.add('gb-anim');
  });
})();

// === 40-issue-list.js ===
// 40-issue-list: issue list decorations (key, tracker badge, status pill, priority, avatars)
// and small shared helpers reused by 50-issue-detail (exposed as GB.il).
(function () {
  var GB = window.GB;

  // Issue list: the right sidebar (custom queries) starts collapsed on screens < 1440px so the
  // table gets the full width (DESIGN §3.3). Applied once per browser, before core reads its
  // per-page state; afterwards the user's own toggle (stored by core) is respected.
  (function defaultCollapseListSidebar() {
    if (!/^\/(?:projects\/[^\/]+\/)?issues\/?$/.test(location.pathname)) return;
    if (window.innerWidth >= 1440) return;
    try {
      if (localStorage.getItem('gb-issues-sidebar-default')) return;
      localStorage.setItem('gb-issues-sidebar-default', '1');
      localStorage.setItem('redmine-sidebar-state-action-index-controller-issues', 'hidden');
    } catch (e) { /* storage unavailable: core default applies */ }
  })();

  // ---------- shared helpers ----------
  function avatarIndex(name) {
    if (typeof GB.avatarIndex === 'function') return GB.avatarIndex(name);
    var s = String(name || '').trim(), sum = 0;
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return sum % 8;
  }

  // Round single-initial avatar (DESIGN §2.9): same markup as GB.avatar in the spec,
  // built with DOM methods (names are never parsed as HTML).
  function avatar(name, size) {
    name = String(name || '').trim();
    var span = document.createElement('span');
    span.className = 'gb-avatar gb-avatar--' + size;
    span.setAttribute('aria-hidden', 'true');
    if (name) {
      span.setAttribute('data-av', String(avatarIndex(name)));
      span.textContent = GB.initial(name);
    } else {
      span.setAttribute('data-av', 'none');
      span.textContent = '?';
    }
    return span;
  }

  function trackerIdOf(el) {
    var m = el && el.className && String(el.className).match(/(?:^|\s)tracker-(\d+)(?:\s|$)/);
    return m ? m[1] : null;
  }

  function trackerPill(text, trackerId) {
    var pill = document.createElement('span');
    pill.className = 'gb-tracker gb-tracker-' + (trackerId || 'x');
    pill.textContent = text;
    return pill;
  }

  function priorityLevel(el) {
    var c = el && el.className ? String(el.className) : '';
    if (/(?:^|\s)priority-(?:high\d*|highest)(?:\s|$)/.test(c)) return 'high';
    if (/(?:^|\s)priority-(?:low\d*|lowest)(?:\s|$)/.test(c)) return 'low';
    return 'normal';
  }

  function decoratePriority(td, level) {
    if (!td || td.querySelector('.gb-prio')) return;
    var text = td.textContent.trim();
    if (!text) return;
    var span = document.createElement('span');
    span.className = 'gb-prio gb-prio--' + level;
    var arrow = document.createElement('span');
    arrow.className = 'gb-prio__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    // one sprite arrow in a fixed 14px box, rotated per level, so the gap to the text is the same for ↑ → ↓
    var icon = GB.icon('arrow-narrow-right', 'gb-prio__icon');
    if (icon) arrow.appendChild(icon);
    else arrow.textContent = level === 'high' ? '↑' : (level === 'low' ? '↓' : '→');
    span.appendChild(arrow);
    span.appendChild(document.createTextNode(text));
    td.textContent = '';
    td.appendChild(span);
  }

  // status pill <span class="gb-status gb-status-N"> (kept as GB.badge for other modules)
  function badge(target, statusId) {
    if (!target || target.querySelector('.gb-status')) return;
    var text = target.textContent.trim();
    if (!text) return;
    var span = document.createElement('span');
    span.className = 'gb-status' + (statusId ? ' gb-status-' + statusId : '');
    span.textContent = text;
    target.textContent = '';
    target.appendChild(span);
  }

  // prepend a round avatar to each user link inside el (idempotent)
  function avatarizeUsers(el, size) {
    if (!el) return;
    el.querySelectorAll('a.user').forEach(function (a) {
      if (a.dataset.gbAv) return;
      a.dataset.gbAv = '1';
      var wrap = document.createElement('span');
      wrap.className = 'gb-user-chip';
      a.parentNode.insertBefore(wrap, a);
      wrap.appendChild(avatar(a.textContent, size));
      wrap.appendChild(a);
    });
  }

  // ---------- issue keys (DEMO-3) ----------
  function bodyProject() {
    var m = document.body.className.match(/(?:^|\s)project-([^\s]+)/);
    return m ? m[1] : null;
  }
  function keyOf(identifier, id) {
    return GB.issueKey(identifier, id);
  }

  // Resolve issue id -> project identifier for issues outside the current project context.
  // Uses the JSON API with the session; failures simply keep the "#id" fallback.
  var projectMap = null, projectMapPromise = null;
  function loadProjects() {
    if (projectMap) return Promise.resolve(projectMap);
    if (projectMapPromise) return projectMapPromise;
    try {
      var cached = JSON.parse(sessionStorage.getItem('gb-project-ids') || 'null');
      if (cached && cached.t > Date.now() - 600000) { projectMap = cached.m; return Promise.resolve(projectMap); }
    } catch (e) { projectMap = null; }
    var map = {};
    function page(offset) {
      return fetch('/projects.json?limit=100&offset=' + offset, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('projects ' + r.status); return r.json(); })
        .then(function (j) {
          (j.projects || []).forEach(function (p) { map[p.id] = p.identifier; });
          var next = offset + (j.limit || 100);
          if (next < (j.total_count || 0) && offset < 400) return page(next);
          return map;
        });
    }
    projectMapPromise = page(0).then(function (m) {
      projectMap = m;
      try { sessionStorage.setItem('gb-project-ids', JSON.stringify({ t: Date.now(), m: m })); } catch (e) { projectMap = m; }
      return m;
    });
    return projectMapPromise;
  }
  var issueProject = {};
  function resolveIssueProjects(ids) {
    var missing = ids.filter(function (id) { return !(id in issueProject); });
    if (!missing.length) return Promise.resolve(issueProject);
    return Promise.all([
      loadProjects(),
      fetch('/issues.json?status_id=*&limit=100&issue_id=' + missing.slice(0, 100).join(','), { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('issues ' + r.status); return r.json(); })
    ]).then(function (res) {
      var pm = res[0];
      (res[1].issues || []).forEach(function (i) {
        if (i.project && pm[i.project.id]) issueProject[i.id] = pm[i.project.id];
      });
      return issueProject;
    });
  }
  // links: [{el, id}] ; set text now (best guess) and correct after lookup
  function applyKeys(items, guess) {
    if (!items.length) return;
    items.forEach(function (it) { it.el.textContent = keyOf(guess, it.id); });
    resolveIssueProjects(items.map(function (it) { return it.id; })).then(function (map) {
      items.forEach(function (it) {
        if (map[it.id]) it.el.textContent = keyOf(map[it.id], it.id);
      });
    }).catch(function () { /* keep best guess */ });
  }

  // Shared key formatter for every page that labels an issue (board cards, dashboard, timelines):
  //   GB.il.issueKey(3)            -> "DEMO-3" inside project demo, "#3" outside any project
  //   GB.il.issueKey(3, 'website') -> "WEBSITE-3"
  // Cross-project lists: GB.il.applyKeys([{el, id}], guess) resolves each issue's project asynchronously.
  function issueKey(id, identifier) {
    return keyOf(identifier === undefined ? bodyProject() : identifier, id);
  }

  GB.il = {
    issueKey: issueKey,
    avatar: avatar,
    avatarIndex: avatarIndex,
    avatarizeUsers: avatarizeUsers,
    trackerIdOf: trackerIdOf,
    trackerPill: trackerPill,
    priorityLevel: priorityLevel,
    decoratePriority: decoratePriority,
    bodyProject: bodyProject,
    keyOf: keyOf,
    applyKeys: applyKeys
  };
  GB.badge = badge;

  // ---------- issue list table ----------
  var USER_COLS = ['assigned_to', 'author', 'last_updated_by', 'watcher_users'];

  function decorateListRows(root) {
    var isList = document.body.classList.contains('controller-issues') &&
      document.body.classList.contains('action-index');
    var proj = bodyProject();
    var keyItems = [];
    root.querySelectorAll('table.list.issues tr.issue').forEach(function (tr) {
      badge(tr.querySelector('td.status'), GB.statusIdOf(tr));
      if (!isList || tr.dataset.gbRow) return;
      tr.dataset.gbRow = '1';
      var idLink = tr.querySelector('td.id a');
      var id = tr.id && tr.id.replace(/^issue-/, '');
      if (idLink && id) {
        idLink.classList.add('gb-issue-key');
        idLink.setAttribute('title', '#' + id);
        var projLink = tr.querySelector('td.project a[href^="/projects/"]');
        var rowProj = projLink ? decodeURIComponent(projLink.getAttribute('href').split('/')[2] || '') : null;
        if (rowProj) idLink.textContent = keyOf(rowProj, id);
        else keyItems.push({ el: idLink, id: id });
      }
      var tracker = tr.querySelector('td.tracker');
      if (tracker && !tracker.querySelector('.gb-tracker')) {
        var t = tracker.textContent.trim();
        if (t) { tracker.textContent = ''; tracker.appendChild(trackerPill(t, trackerIdOf(tr))); }
      }
      decoratePriority(tr.querySelector('td.priority'), priorityLevel(tr));
      // timestamps: date only in the cell, full value on hover
      ['updated_on', 'created_on', 'closed_on'].forEach(function (c) {
        var td = tr.querySelector('td.' + c);
        var v = td && td.textContent.trim();
        var dm = v && v.match(/^(\d{4}[\/-]\d{2}[\/-]\d{2})\s+\d{1,2}:\d{2}$/);
        if (dm && !td.title) { td.title = v; td.textContent = dm[1]; }
      });
      USER_COLS.forEach(function (c) { avatarizeUsers(tr.querySelector('td.' + c), 20); });
      // truncated cells keep their full text on hover
      var pj = tr.querySelector('td.project');
      if (pj && !pj.title) pj.title = pj.textContent.trim();
      // cross-project lists: the project name sits as a small line above the subject (the column itself is
      // hidden on desktop so 題名 keeps >= 320px); the key prefix and this line identify the project
      var subj = tr.querySelector('td.subject');
      if (pj && subj && pj.textContent.trim() && !subj.querySelector('.gb-subj-proj')) {
        var lbl = document.createElement('span');
        lbl.className = 'gb-subj-proj';
        lbl.textContent = pj.textContent.trim();
        subj.insertBefore(lbl, subj.firstChild);
      }
      tr.querySelectorAll('td.assigned_to a.user, td.author a.user, td.last_updated_by a.user').forEach(function (u) {
        if (!u.title) u.title = u.textContent.trim();
      });
    });
    if (keyItems.length) {
      // Inside a project without subprojects every row belongs to that project: no lookup needed.
      // (Redmine offers the subproject_id filter only when the project has subprojects.)
      var hasSub = !!document.querySelector('#add_filter_select option[value="subproject_id"]');
      if (proj && !hasSub) keyItems.forEach(function (it) { it.el.textContent = keyOf(proj, it.id); });
      else applyKeys(keyItems, proj);
    }

    // 進捗率: core leaves p.percent empty in list cells -> 「40%」 next to the bar
    root.querySelectorAll('table.list.issues td.done_ratio').forEach(fillPercent);

    if (!isList) return;
    // group rows (e.g. group_by=assigned_to): avatar before a user name;
    // the blank group 「(空)」 reads 「担当者なし」/「未設定」 like the rest of the UI
    var groupBy = document.getElementById('group_by');
    var gb = groupBy ? groupBy.value : '';
    root.querySelectorAll('table.list.issues tr.group').forEach(function (tr) {
      if (tr.dataset.gbGroup) return;
      tr.dataset.gbGroup = '1';
      avatarizeUsers(tr, 20);
      var name = tr.querySelector('span.name');
      if (name && !name.children.length && /^\(\s*空\s*\)$|^\[?なし\]?$/.test(name.textContent.trim())) {
        name.classList.add('gb-group-blank');
        name.textContent = /^(assigned_to|author)$/.test(gb) ? '担当者なし' : '未設定';
        if (gb === 'author') name.textContent = '作成者なし';
      }
    });
  }

  function fillPercent(td) {
    var p = td.querySelector('p.percent');
    var bar = td.querySelector('table.progress');
    if (!p || !bar || p.textContent.trim()) return;
    var m = String(bar.className).match(/progress-(\d+)/);
    if (m) p.textContent = m[1] + '%';
  }

  // ---------- issues report: one card per report, zero cells muted ----------
  function decorateReport() {
    if (!document.body.classList.contains('controller-reports')) return;
    document.querySelectorAll('#content table.issue-report').forEach(function (table) {
      if (table.dataset.gbReport) return;
      table.dataset.gbReport = '1';
      var card = document.createElement('section');
      card.className = 'gb-report-card';
      var h3 = table.previousElementSibling;
      table.parentNode.insertBefore(card, h3 && h3.tagName === 'H3' ? h3 : table);
      if (h3 && h3.tagName === 'H3') card.appendChild(h3);
      card.appendChild(table);
      var br = card.nextElementSibling;
      if (br && br.tagName === 'BR') br.remove();
      // one term on every issue page: the version report is 「マイルストーン」 like the attributes / columns
      if (h3 && h3.tagName === 'H3' && h3.firstChild && h3.firstChild.nodeType === 3) {
        h3.firstChild.textContent = h3.firstChild.textContent.replace('バージョン', 'マイルストーン');
      }
      // 「[なし]」 rows read like the list's blank group headers (担当者なし / 作成者なし / 未設定)
      var kind = (h3 && h3.querySelector('a[href*="/issues/report/"]') || { getAttribute: function () { return ''; } })
        .getAttribute('href').split('/').pop();
      relabelBlankRows(table, kind);
      table.querySelectorAll('tbody td:not(.name), tfoot td').forEach(function (td) {
        if (td.children.length === 0 && /^[-–]?$|^0$/.test(td.textContent.trim())) {
          td.classList.add('gb-zero');
          td.textContent = '–';
        }
      });
      // spare height of the taller neighbour card goes into this empty row, so 「合計」 sits on the card's bottom edge
      var body = table.tBodies[0];
      var cols = table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells.length : 1;
      if (body && !body.querySelector('tr.gb-report-fill')) {
        var fill = document.createElement('tr');
        fill.className = 'gb-report-fill';
        fill.setAttribute('aria-hidden', 'true');
        var ftd = document.createElement('td');
        ftd.colSpan = cols;
        fill.appendChild(ftd);
        body.appendChild(fill);
      }
    });
  }

  function blankLabel(kind) {
    if (kind === 'assigned_to') return '担当者なし';
    if (kind === 'author') return '作成者なし';
    return '未設定';
  }
  function relabelBlankRows(root, kind) {
    root.querySelectorAll('td.name a, td.name').forEach(function (el) {
      if (el.children.length || el.dataset.gbBlank || !/^\[\s*なし\s*\]$/.test(el.textContent.trim())) return;
      el.dataset.gbBlank = '1';
      el.classList.add('gb-group-blank');
      el.textContent = blankLabel(kind);
    });
  }
  // report details page (/issues/report/version …): same heading term and blank labels
  function decorateReportDetails() {
    if (!document.body.classList.contains('controller-reports')) return;
    var m = location.pathname.match(/\/issues\/report\/([a-z_]+)$/);
    if (!m) return;
    document.querySelectorAll('#content > h3, #content > h2').forEach(function (h) {
      var t = h.lastChild;
      if (t && t.nodeType === 3 && /バージョン/.test(t.textContent)) t.textContent = t.textContent.replace('バージョン', 'マイルストーン');
    });
    document.querySelectorAll('#content table.issue-report, #content table.issue-report-detailed').forEach(function (t) {
      relabelBlankRows(t, m[1]);
      t.querySelectorAll('tbody td:not(.name), tfoot td').forEach(function (td) {
        if (td.children.length === 0 && /^[-–]?$|^0$/.test(td.textContent.trim())) {
          td.classList.add('gb-zero');
          td.textContent = '–';
        }
      });
    });
    joinReportHeading();
    wrapDetailedTable();
    hideBackLink();
    decorateReportCharts(m[1]);
  }

  // the detailed table scrolls sideways inside a bordered box (border and corners always visible), with the name
  // column pinned and a fade on the right edge while more columns are hidden
  function wrapDetailedTable() {
    var table = document.querySelector('#content > table.issue-report-detailed');
    if (!table || table.dataset.gbWrapped) return;
    table.dataset.gbWrapped = '1';
    var box = document.createElement('div');
    box.className = 'gb-report-scrollbox';
    var scroller = document.createElement('div');
    scroller.className = 'gb-report-scroll';
    table.parentNode.insertBefore(box, table);
    box.appendChild(scroller);
    scroller.appendChild(table);
    var sync = function () {
      var more = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 1;
      box.classList.toggle('gb-has-more', more);
    };
    scroller.addEventListener('scroll', sync, { passive: true });
    if (window.ResizeObserver) {
      // the box and the table: the table's width changes when the theme CSS arrives after this script
      var ro = new window.ResizeObserver(sync);
      ro.observe(scroller);
      ro.observe(table);
    } else {
      window.addEventListener('resize', sync);
    }
    sync();
  }

  // the breadcrumb 「レポート」 already leads back: core's bottom 「戻る」 link stays for screen readers only
  function hideBackLink() {
    var content = document.getElementById('content');
    if (!content) return;
    Array.prototype.forEach.call(content.children, function (el) {
      if (el.tagName !== 'A' || el.dataset.gbBack || !/\/issues\/report$/.test(el.getAttribute('href') || '')) return;
      el.dataset.gbBack = '1';
      el.classList.add('gb-sr-only');
      var prev = el.previousElementSibling;
      if (prev && prev.tagName === 'BR') prev.classList.add('gb-report-br');
    });
  }

  // 「レポート »」 + a separate h3 「マイルストーン」 → one breadcrumb heading 「レポート › マイルストーン」
  // (the h3 stays for screen readers, visually hidden; the copy in the h2 is aria-hidden so it is not read twice)
  function joinReportHeading() {
    var h2 = document.querySelector('#content > h2');
    var h3 = h2 && h2.nextElementSibling;
    if (!h2 || h2.dataset.gbCrumb || !h3 || h3.tagName !== 'H3' || !h2.querySelector('a')) return;
    h2.dataset.gbCrumb = '1';
    h2.classList.add('gb-crumb');
    Array.prototype.slice.call(h2.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && /^[\s»]*$/.test(n.textContent)) h2.removeChild(n);
    });
    var sep = document.createElement('span');
    sep.className = 'gb-crumb__sep';
    sep.setAttribute('aria-hidden', 'true');
    var icon = GB.icon('angle-right', 'icon-svg');
    if (icon) sep.appendChild(icon); else sep.textContent = '›';
    var cur = document.createElement('span');
    cur.className = 'gb-crumb__current';
    cur.setAttribute('aria-hidden', 'true');
    cur.textContent = h3.textContent.trim();
    h2.appendChild(sep);
    h2.appendChild(cur);
    h3.classList.add('gb-sr-only');
  }

  // core's Chart.js bar charts: same terms as the table (マイルストーン / 未設定 …), theme colours (status series use
  // the status-pill colours, other series the category palette), full content width, legend below, and one
  // y-axis width for both charts so their plot areas line up
  var reportChartMq = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var CHART_PALETTE = ['--gb-primary', '--gb-av-1', '--gb-av-2', '--gb-av-3', '--gb-av-4', '--gb-av-5', '--gb-av-6', '--gb-av-7'];
  function cssVar(name, fallback) {
    var v = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function alpha(hex, a) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ', ' + (n >> 8 & 255) + ', ' + (n & 255) + ', ' + a + ')';
  }
  // status name → id, read from the detailed table (its header cells line up with status_id links in the rows)
  function reportStatusIds() {
    var map = {};
    var table = document.querySelector('#content table.issue-report-detailed');
    if (!table || !table.tHead) return map;
    var heads = table.tHead.rows[0].cells;
    Array.prototype.forEach.call(table.tBodies[0] ? table.tBodies[0].rows : [], function (tr) {
      Array.prototype.forEach.call(tr.cells, function (td, i) {
        var a = td.querySelector('a[href*="status_id="]');
        var m = a && /[?&]status_id=(\d+)(?:&|$)/.exec(a.getAttribute('href'));
        if (m && heads[i]) map[heads[i].textContent.trim()] = m[1];
      });
    });
    return map;
  }
  function niceMax(total, maxTicks) {
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (var i = 0; i < steps.length; i++) {
      if (Math.ceil(total / steps[i]) <= maxTicks) return { max: Math.max(steps[i], Math.ceil(total / steps[i]) * steps[i]), step: steps[i] };
    }
    return { max: total, step: undefined };
  }
  function axisOf(chart, axis) {
    var scales = chart.config.options.scales || {};
    var key = Object.keys(scales).filter(function (k) { return (scales[k].axis || k.charAt(0)) === axis; })[0];
    return key ? { key: key, opts: scales[key] } : null;
  }
  function tuneReportChart(chart, kind, statusIds) {
    var blank = blankLabel(kind);
    var isBlank = function (t) { return typeof t === 'string' && /^\[\s*なし\s*\]$/.test(t.trim()); };
    var font = cssVar('--gb-font', 'sans-serif');
    var text2 = cssVar('--gb-text-2', '#55625e');
    var grid = cssVar('--gb-border', '#e0e5e3');
    var o = chart.config.options;
    o.plugins = o.plugins || {};
    var title = o.plugins.title;
    if (title) {
      if (typeof title.text === 'string') title.text = title.text.replace('バージョン', 'マイルストーン').replace(/\s+別/, '別');
      title.color = cssVar('--gb-text', '#2f3a37');
      title.font = { family: font, size: 14, weight: '600' };
      title.padding = { top: 4, bottom: 12 };
    }
    if (chart.data.labels) chart.data.labels = chart.data.labels.map(function (l) { return isBlank(l) ? blank : l; });
    var cat = 0;
    chart.data.datasets.forEach(function (d, i) {
      if (isBlank(d.label)) d.label = blank;
      var sid = statusIds[String(d.label).trim()];
      var hex = cssVar(sid ? '--gb-st-' + sid : CHART_PALETTE[cat++ % CHART_PALETTE.length], '#3fae8a');
      d.backgroundColor = alpha(hex, 0.85);
      d.hoverBackgroundColor = hex;
      d.borderColor = 'transparent';
      d.borderWidth = 0;
      d.borderRadius = 3;
      d.borderSkipped = false;
      d.maxBarThickness = 28;
      // core hides closed statuses (完了) at first, though the table counts them: show every series
      d.hidden = false;
      chart.setDatasetVisibility(i, true);
    });
    // value axis ends at the largest stacked total (not at the next 「nice」 tick far beyond it)
    var totals = [];
    chart.data.datasets.forEach(function (d) {
      (d.data || []).forEach(function (v, j) { totals[j] = (totals[j] || 0) + (Number(v) || 0); });
    });
    // at most 12 ticks on desktop, 6 on phones (so 「10」「11」 never touch)
    var phone = !!(reportChartMq && reportChartMq.matches);
    var nm = niceMax(Math.max.apply(null, totals.concat([1])), phone ? 6 : 12);
    var tickStyle = { color: text2, font: { family: font, size: 12 } };
    var x = axisOf(chart, 'x');
    if (x) {
      x.opts.min = 0;
      x.opts.max = nm.max;
      x.opts.suggestedMax = nm.max;
      x.opts.ticks = Object.assign(x.opts.ticks || {}, tickStyle, { precision: 0, stepSize: nm.step, autoSkip: true, minRotation: 0, maxRotation: 0 });
      x.opts.grid = Object.assign(x.opts.grid || {}, { color: grid, borderColor: grid, tickLength: 4 });
    }
    var y = axisOf(chart, 'y');
    if (y) {
      y.opts.ticks = Object.assign(y.opts.ticks || {}, tickStyle, { padding: 8 });
      y.opts.grid = Object.assign(y.opts.grid || {}, { display: false, drawBorder: true, borderColor: grid });
    }
    var legend = o.plugins.legend = o.plugins.legend || {};
    legend.position = 'bottom';
    legend.align = 'center';
    legend.labels = Object.assign(legend.labels || {}, {
      color: text2, font: { family: font, size: 12 }, boxWidth: 12, boxHeight: 12, padding: 16,
      usePointStyle: true, pointStyle: 'rectRounded'
    });
    o.maintainAspectRatio = false;
    o.animation = false;
  }
  // both charts get the y-axis width of the widest one (at least 96px), so their plot areas start and end together
  function alignReportAxes(charts) {
    var w = 96;
    charts.forEach(function (c) {
      var y = axisOf(c, 'y');
      if (y && c.scales[y.key]) w = Math.max(w, Math.ceil(c.scales[y.key].width));
    });
    charts.forEach(function (c) {
      var y = axisOf(c, 'y');
      if (!y) return;
      y.opts.afterFit = function (scale) { scale.width = w; };
      // the first update re-resolves the changed options; the bars are only laid out on the new axis by a second one
      c.update('none');
      c.update('none');
    });
  }
  function decorateReportCharts(kind) {
    var tries = 0;
    var statusIds = reportStatusIds();
    var run = function () {
      if (!window.Chart || typeof window.Chart.getChart !== 'function') return false;
      var canvases = document.querySelectorAll('#content .issue-report-graph canvas');
      var charts = [];
      canvases.forEach(function (cv) {
        var chart = window.Chart.getChart(cv);
        if (chart) charts.push(chart);
      });
      if (!canvases.length || charts.length !== canvases.length) return false;
      charts.forEach(function (c) {
        var y = axisOf(c, 'y');
        if (y) delete y.opts.afterFit; // measure the natural label width again (e.g. after a resize)
        tuneReportChart(c, kind, statusIds);
        c.resize();
        c.update('none');
      });
      alignReportAxes(charts);
      return true;
    };
    // core builds the charts in its own jQuery ready handler: wait for them (a few frames at most)
    var poll = function () {
      if (run() || tries++ > 40) return;
      window.setTimeout(poll, 50);
    };
    poll();
    if (reportChartMq && !reportChartMq.gbBound) {
      reportChartMq.gbBound = true;
      if (reportChartMq.addEventListener) reportChartMq.addEventListener('change', run);
      else if (reportChartMq.addListener) reportChartMq.addListener(run);
    }
  }

  // ---------- query options: column move buttons as one icon set ----------
  // core mixes sprite arrows (→ ←) with text glyphs (⇈ ↑ ↓ ⇊) of different sizes; the four get the same sprite
  // arrow as → ← (rotated in CSS), so all six are one 16px icon set
  var MOVE = [
    { re: /moveOptionTop/, icon: 'arrow-narrow-right', cls: 'gb-mv--top', label: '先頭へ移動' },
    { re: /moveOptionUp/, icon: 'arrow-narrow-right', cls: 'gb-mv--up', label: '上へ移動' },
    { re: /moveOptionDown/, icon: 'arrow-narrow-right', cls: 'gb-mv--down', label: '下へ移動' },
    { re: /moveOptionBottom/, icon: 'arrow-narrow-right', cls: 'gb-mv--bottom', label: '末尾へ移動' }
  ];
  function decorateMoveButtons(root) {
    root.querySelectorAll('#list-definition .buttons button, .query-columns ~ .buttons button').forEach(function (b) {
      if (b.dataset.gbMv) return;
      var on = b.getAttribute('onclick') || '';
      if (b.classList.contains('move-right') || b.classList.contains('move-left')) {
        b.dataset.gbMv = '1';
        b.classList.add('gb-mv');
        var l = b.classList.contains('move-right') ? '表示する列に追加' : '表示する列から外す';
        if (!b.title) b.title = l;
        if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', l);
        return;
      }
      MOVE.forEach(function (d) {
        if (!d.re.test(on) || b.dataset.gbMv) return;
        var icon = GB.icon(d.icon, 'gb-mv__icon');
        if (!icon) return;
        b.dataset.gbMv = '1';
        b.classList.add('gb-mv', d.cls);
        b.title = d.label;
        b.setAttribute('aria-label', d.label);
        b.textContent = '';
        b.appendChild(icon);
        if (d.cls === 'gb-mv--top' || d.cls === 'gb-mv--bottom') {
          var bar = document.createElement('span');
          bar.className = 'gb-mv__bar';
          bar.setAttribute('aria-hidden', 'true');
          b.appendChild(bar);
        }
      });
    });
  }

  // ---------- horizontal overflow state of the list scroller ----------
  // .gb-hscroll while the table is wider than its scroller (pinned "…" column gets an edge),
  // .gb-hscroll-end once scrolled to the right end (edge shadow dropped).
  function updateScrollState(box) {
    var over = box.scrollWidth > box.clientWidth + 1;
    box.classList.toggle('gb-hscroll', over);
    box.classList.toggle('gb-hscroll-end', over && box.scrollLeft + box.clientWidth >= box.scrollWidth - 1);
  }
  function watchListScroll(root) {
    if (!document.body.classList.contains('controller-issues') || !document.body.classList.contains('action-index')) return;
    root.querySelectorAll('.autoscroll').forEach(function (box) {
      if (!box.querySelector(':scope > table.list.issues')) return;
      if (!box.dataset.gbScroll) {
        box.dataset.gbScroll = '1';
        box.addEventListener('scroll', function () { updateScrollState(box); }, { passive: true });
        // box resizes (window, sidebar toggle) and table resizes (columns decorated, fonts loaded)
        if (window.ResizeObserver) {
          var ro = new ResizeObserver(function () { updateScrollState(box); });
          ro.observe(box);
          ro.observe(box.querySelector(':scope > table.list.issues'));
        }
      }
      updateScrollState(box);
    });
  }

  // row 「…」 / right-click menu open: the trigger's 「操作」 tooltip must not sit on top of the menu
  function watchContextMenu() {
    if (!document.body.classList.contains('controller-issues')) return;
    var menu = document.getElementById('context-menu');
    if (!menu || menu.dataset.gbWatch || !window.MutationObserver) return;
    menu.dataset.gbWatch = '1';
    var sync = function () {
      var open = window.getComputedStyle(menu).display !== 'none' && menu.children.length > 0;
      document.body.classList.toggle('gb-cm-open', open);
    };
    new window.MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
    sync();
  }

  GB.ready(decorateReport);
  GB.ready(decorateReportDetails);
  GB.ready(function () {
    watchContextMenu();
    // core adds #context-menu after its own ready handler: attach on the first interaction that can open it
    ['mousedown', 'contextmenu', 'keydown'].forEach(function (type) {
      document.addEventListener(type, watchContextMenu, true);
    });
  });
  GB.ready(function () { decorateMoveButtons(document); });
  GB.onAjax(function (root) {
    decorateListRows(root);
    watchListScroll(document);
  });
})();

// === 50-issue-detail.js ===
// 50-issue-detail: issue page header, attributes, sections, sub-issue rows, journals, watchers.
(function () {
  var GB = window.GB;
  var il = GB.il;

  function isIssueShow() {
    var b = document.body.classList;
    return b.contains('controller-issues') && b.contains('action-show');
  }

  // ---------- header: "サポート #3" -> [サポート] DEMO-3 ----------
  function decorateTitle() {
    var h2 = document.querySelector('#content > h2');
    var issue = document.querySelector('#content > div.issue');
    if (!h2 || !issue || h2.dataset.gbTitle) return;
    var m = h2.textContent.trim().match(/^(.*?)\s*#(\d+)$/);
    if (!m) return;
    h2.dataset.gbTitle = '1';
    h2.classList.add('gb-issue-title');
    h2.textContent = '';
    h2.appendChild(il.trackerPill(m[1], il.trackerIdOf(issue)));
    var key = document.createElement('span');
    key.className = 'gb-issue-key';
    key.textContent = il.keyOf(il.bodyProject(), m[2]);
    key.title = '#' + m[2];
    h2.appendChild(key);
    // same pill + key in Redmine's sticky header (shown while scrolling)
    var sticky = document.querySelector('#sticky-issue-header .issue-heading');
    if (sticky && !sticky.dataset.gbTitle) {
      sticky.dataset.gbTitle = '1';
      sticky.textContent = '';
      sticky.appendChild(il.trackerPill(m[1], il.trackerIdOf(issue)));
      var skey = key.cloneNode(true);
      sticky.appendChild(skey);
    }
    // group the title + state tags on one line
    var top = document.querySelector('#content > .contextual');
    var bar = document.createElement('div');
    bar.className = 'gb-issue-titlebar';
    h2.parentNode.insertBefore(bar, h2);
    bar.appendChild(h2);
    var n = bar.nextSibling;
    while (n && (n.nodeType === 3 || (n.nodeType === 1 && n.tagName === 'SPAN' && n.classList.contains('badge')))) {
      var next = n.nextSibling;
      if (n.nodeType === 1) bar.appendChild(n);
      n = next;
    }
    // header row = title bar + top action bar (flex: the action bar wraps below when space runs out,
    // instead of floating over the tracker badge and key)
    var head = document.createElement('div');
    head.className = 'gb-issue-head';
    bar.parentNode.insertBefore(head, bar);
    head.appendChild(bar);
    if (top && (top.compareDocumentPosition(head) & Node.DOCUMENT_POSITION_FOLLOWING)) head.appendChild(top);
  }

  // ---------- prev / next: « 前 | 12/14 | 次 » -> [‹] 12/14 [›] icon buttons ----------
  function npButton(src, dir) {
    var label = dir === 'prev' ? '前の課題' : '次の課題';
    var el;
    if (src && src.nodeType === 1 && src.tagName === 'A') {
      el = src;
      var t = el.getAttribute('title');
      el.setAttribute('title', label + (t ? ' (' + t + ')' : ''));
      el.textContent = '';
    } else {
      el = document.createElement('span');
      el.className = 'is-disabled';
      el.setAttribute('role', 'link');
      el.setAttribute('aria-disabled', 'true');
      el.setAttribute('title', label);
    }
    el.classList.add('gb-np-btn');
    el.setAttribute('aria-label', label);
    var icon = GB.icon(dir === 'prev' ? 'angle-left' : 'angle-right', 'icon-svg');
    if (icon) el.appendChild(icon);
    else el.appendChild(document.createTextNode(dir === 'prev' ? '‹' : '›'));
    return el;
  }
  function decoratePrevNext(issue) {
    var nav = issue.querySelector(':scope > .next-prev-links');
    if (!nav || nav.dataset.gbNav) return;
    nav.dataset.gbNav = '1';
    var pos = nav.querySelector(':scope > .position');
    var prev = null, next = null, prevSeen = false, nextSeen = false;
    Array.prototype.slice.call(nav.childNodes).forEach(function (n) {
      if (n === pos) return;
      var text = n.textContent || '';
      var isPrev = text.indexOf('«') !== -1, isNext = text.indexOf('»') !== -1;
      if (n.nodeType === 1 && n.tagName === 'A' && (isPrev || isNext)) {
        if (isPrev) { prev = n; prevSeen = true; } else { next = n; nextSeen = true; }
        nav.removeChild(n);
        return;
      }
      if (isPrev) prevSeen = true;
      if (isNext) nextSeen = true;
      if (n.nodeType === 3 || (n.nodeType === 1 && n.classList.contains('gb-np-disabled'))) nav.removeChild(n);
    });
    if (prevSeen) nav.insertBefore(npButton(prev, 'prev'), nav.firstChild);
    if (nextSeen) nav.appendChild(npButton(next, 'next'));
    if (pos) nav.classList.add('gb-np--has-pos');
  }
  // phones: the pager joins the author line (left of the like button) instead of an orphan row of its own
  var npInlineMq = window.matchMedia ? window.matchMedia('(max-width: 480px)') : null;
  function placePrevNext(issue) {
    var nav = issue.querySelector(':scope > .next-prev-links');
    if (!nav) return;
    var inline = !!(npInlineMq && npInlineMq.matches);
    var anchor = issue.querySelector(':scope > .reaction') || issue.querySelector(':scope > p.author');
    if (inline && anchor) {
      var target = anchor.classList.contains('reaction') ? anchor.nextSibling : anchor;
      if (nav.nextSibling !== target || !nav.classList.contains('gb-np--inline')) {
        issue.insertBefore(nav, target);
        nav.classList.add('gb-np--inline');
      }
    } else if (nav.classList.contains('gb-np--inline') || issue.firstElementChild !== nav) {
      nav.classList.remove('gb-np--inline');
      issue.insertBefore(nav, issue.firstChild);
    }
  }

  // ---------- author line: round avatar + 「名前 さんが約1時間前に追加・34分前に更新」 ----------
  function tidyAuthorText(p) {
    var texts = Array.prototype.slice.call(p.childNodes).filter(function (n) { return n.nodeType === 3; });
    texts.forEach(function (n) {
      var t = n.textContent.replace(/\s+/g, '');
      if (/\.$/.test(t)) {
        var after = n.nextSibling;
        while (after && after.nodeType === 3 && !after.textContent.trim()) after = after.nextSibling;
        t = t.replace(/\.$/, after ? '・' : '');
      }
      n.textContent = t;
    });
  }
  // 「さんが1日前に追加・1日前に更新」 -> <span.gb-when-group><span.gb-when>さんが1日前に追加・</span><span.gb-when>1日前に更新</span></span>
  // each phrase is unbreakable, so narrow screens wrap between phrases, never inside 「1日 / 前に」
  function groupPhrases(container, user) {
    if (!user || container.querySelector('.gb-when-group')) return;
    var group = document.createElement('span');
    group.className = 'gb-when-group';
    var chunk = null;
    var n = user.nextSibling;
    while (n) {
      var next = n.nextSibling;
      if (n.nodeType === 1 && n.tagName === 'SPAN' && n.id && /private_notes/.test(n.id)) break;
      if (!chunk) {
        chunk = document.createElement('span');
        chunk.className = 'gb-when';
        group.appendChild(chunk);
      }
      chunk.appendChild(n);
      if (n.nodeType === 3 && /・\s*$/.test(n.textContent)) chunk = null;
      n = next;
    }
    if (group.childNodes.length) container.insertBefore(group, n || null);
  }

  function decorateAuthor(issue) {
    var p = issue.querySelector(':scope > p.author');
    if (!p || p.dataset.gbAuthor) return;
    p.dataset.gbAuthor = '1';
    tidyAuthorText(p);
    var user = p.querySelector('a.user');
    var name = user ? user.textContent : '';
    groupPhrases(p, user);
    p.insertBefore(il.avatar(name, 28), p.firstChild);
  }

  // attachment meta 「名前, 2026/11/22 01:04」 -> 「名前 · 2026/11/22 01:04」 (same separator as the timelines)
  function tidyAttachmentMeta(issue) {
    issue.querySelectorAll('.attachments .author').forEach(function (s) {
      if (s.dataset.gbMeta || s.children.length) return;
      s.dataset.gbMeta = '1';
      s.textContent = s.textContent.replace(/\s*,\s*(?=\d{4}[\/-])/, ' · ');
    });
  }

  // ---------- attributes panel ----------
  function decorateAttributes(issue) {
    var attrs = issue.querySelector(':scope > div.attributes');
    if (!attrs) return;
    attrs.querySelectorAll('.attribute > .label').forEach(function (l) {
      if (l.dataset.gbLabel) return;
      l.dataset.gbLabel = '1';
      l.textContent = l.textContent.replace(/[:：]\s*$/, '');
    });
    GB.badge(attrs.querySelector('.status .value'), GB.statusIdOf(issue));
    il.decoratePriority(attrs.querySelector('.priority .value'), il.priorityLevel(issue));
    il.avatarizeUsers(attrs.querySelector('.assigned-to .value'), 20);
    var due = attrs.querySelector('.due-date .value');
    if (due && !due.querySelector('.gb-due-note')) {
      var mm = due.textContent.trim().match(/^(\S+)\s*(\(.+\))$/);
      if (mm) {
        due.textContent = mm[1] + ' ';
        var note = document.createElement('span');
        note.className = 'gb-due-note';
        note.textContent = mm[2];
        due.appendChild(note);
      }
    }
    // 予定工数 with only a parent total: 「 (合計: 0:00時間)」 -> 「– 合計 0:00時間」
    var est = attrs.querySelector('.estimated-hours .value');
    if (est && !est.dataset.gbEst && !est.children.length) {
      var em = est.textContent.trim().match(/^(.*?)\s*\(\s*([^:：()]+)[:：]\s*([^()]+)\)$/);
      if (em) {
        est.dataset.gbEst = '1';
        est.textContent = '';
        var own = document.createElement('span');
        own.className = em[1] ? 'gb-est-own' : 'gb-est-own gb-est-own--empty';
        own.textContent = em[1] || '–';
        var total = document.createElement('span');
        total.className = 'gb-est-total';
        total.textContent = em[2].trim() + ' ' + em[3].trim();
        est.appendChild(own);
        // a zero total next to an empty own value is noise: only 「–」; otherwise 「(合計 2:00時間)」 like 「(期日まで 1日)」
        if (em[1] || !/^0[:.]00\D*$|^0(\.0+)?\D*$/.test(em[3].trim())) {
          total.textContent = '(' + total.textContent + ')';
          est.appendChild(document.createTextNode(' '));
          est.appendChild(total);
        }
      }
    }
    // empty values: keep :empty matchable
    attrs.querySelectorAll('.attribute > .value').forEach(function (v) {
      if (!v.children.length && /^[-–]?$/.test(v.textContent.trim())) v.textContent = '';
    });
  }

  // ---------- section titles (説明 / ファイル / 子課題 / 関連する課題) ----------
  function countBadge(n) {
    var b = document.createElement('span');
    b.className = 'gb-count';
    b.textContent = String(n);
    return b;
  }
  function decorateSections(issue) {
    var desc = issue.querySelector(':scope > div.description');
    if (desc) {
      desc.classList.add('gb-sec');
      var dp = desc.querySelector(':scope > p');
      if (dp && dp.querySelector('strong')) dp.classList.add('gb-sec__title');
    }
    var att = issue.querySelector(':scope > div.attachments');
    if (att) {
      var prev = att.previousElementSibling;
      if (prev && prev.tagName === 'P' && prev.querySelector('strong') && !prev.dataset.gbSec) {
        prev.dataset.gbSec = '1';
        prev.classList.add('gb-sec__title', 'gb-sec__title--files');
        var rows = att.querySelectorAll('table tr').length;
        if (rows) prev.appendChild(countBadge(rows));
        var wrap = document.createElement('div');
        wrap.className = 'gb-sec gb-sec--files';
        issue.insertBefore(wrap, prev);
        wrap.appendChild(prev);
        wrap.appendChild(att);
      }
    }
    ['issue_tree', 'relations'].forEach(function (id) {
      var sec = document.getElementById(id);
      if (!sec) return;
      sec.classList.add('gb-sec');
      var p = sec.querySelector(':scope > p');
      if (p) p.classList.add('gb-sec__title');
      var add = sec.querySelector(':scope > .contextual > a');
      if (add) add.classList.add('gb-sec__add');
      tidyIssuesStat(p && p.querySelector('.issues-stat'));
    });
  }

  // 「3 ( 1件未完了 — 0件完了 )」 -> 「[3] 未完了 1 ・ 完了 0」 (links kept)
  function tidyIssuesStat(stat) {
    if (!stat || stat.dataset.gbStat) return;
    stat.dataset.gbStat = '1';
    var parts = [];
    Array.prototype.slice.call(stat.childNodes).forEach(function (n) {
      if (n.nodeType === 3) { stat.removeChild(n); return; }
      var target = n.querySelector && (n.querySelector('a') || n);
      var m = target && target.textContent.trim().match(/^(\d+)\s*件\s*(.+)$/);
      if (m) target.textContent = m[2] + ' ' + m[1];
      parts.push(n);
    });
    // the total stays a count pill; only 未完了 / 完了 get a separator
    parts = parts.filter(function (n) { return !(n.classList && n.classList.contains('badge-issues-count')); });
    parts.forEach(function (n, i) {
      if (!i) return;
      var sep = document.createElement('span');
      sep.className = 'gb-stat-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '・';
      stat.insertBefore(sep, n);
    });
  }

  // ---------- subtask / relation rows ----------
  function decorateSubRows(root) {
    var keyItems = [];
    root.querySelectorAll('#issue_tree tr.issue, #relations tr.issue').forEach(function (tr) {
      GB.badge(tr.querySelector('td.status'), GB.statusIdOf(tr));
      if (tr.dataset.gbSub) return;
      tr.dataset.gbSub = '1';
      il.avatarizeUsers(tr.querySelector('td.assigned_to'), 20);
      var td = tr.querySelector('td.subject');
      var a = td && td.querySelector('a.issue');
      if (!a) return;
      var m = a.textContent.trim().match(/^(.*?)\s*#(\d+)$/);
      if (!m) return;
      // relation type text before the link
      var lead = a.previousSibling;
      if (lead && lead.nodeType === 3 && lead.textContent.trim()) {
        var rel = document.createElement('span');
        rel.className = 'gb-rel-type';
        rel.textContent = lead.textContent.trim();
        td.replaceChild(rel, lead);
      }
      td.insertBefore(il.trackerPill(m[1], il.trackerIdOf(a)), a);
      a.classList.add('gb-issue-key');
      a.title = '#' + m[2];
      keyItems.push({ el: a, id: m[2] });
      // subject text after "<a>: "
      var rest = a.nextSibling;
      if (rest && rest.nodeType === 3) {
        var s = document.createElement('span');
        s.className = 'gb-subj';
        s.textContent = rest.textContent.replace(/^\s*:\s*/, '');
        td.replaceChild(s, rest);
        td.title = s.textContent;
      }
      // [relation chip][tracker][key] stay together; the subject is its own block so a wrapped second line
      // hangs under the first subject character, not under the badge
      var line = document.createElement('div');
      line.className = 'gb-sub-line';
      var leadBox = document.createElement('span');
      leadBox.className = 'gb-sub-lead';
      Array.prototype.slice.call(td.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && !n.textContent.trim()) { td.removeChild(n); return; }
        if (n.classList && n.classList.contains('gb-subj')) return;
        leadBox.appendChild(n);
      });
      line.appendChild(leadBox);
      var subj = td.querySelector(':scope > .gb-subj');
      if (subj) line.appendChild(subj);
      td.appendChild(line);
      // assignee: the name is also on the avatar's hover when the column collapses to the avatar
      var chip = tr.querySelector('td.assigned_to .gb-user-chip');
      var who = chip && chip.querySelector('a.user');
      if (who && !chip.title) chip.title = who.textContent.trim();
    });
    if (keyItems.length) il.applyKeys(keyItems, il.bodyProject());
    // no due date in any row of 子課題 and 関連する課題: the 期日 column shrinks to the dash and the subject gets the
    // width (decided for both tables together, so their columns keep lining up)
    var subTables = document.querySelectorAll('#issue_tree table.list.issues, #relations table.list.issues');
    var dues = document.querySelectorAll('#issue_tree tr.issue > td.due_date, #relations tr.issue > td.due_date');
    var none = dues.length > 0 && Array.prototype.every.call(dues, function (td) { return !td.textContent.trim(); });
    subTables.forEach(function (table) {
      if (none) table.dataset.gbNoDue = '1';
      else delete table.dataset.gbNoDue;
    });
  }

  // ---------- journals ----------
  var statusIds = null;
  function loadStatusIds() {
    if (statusIds) return Promise.resolve(statusIds);
    try {
      var c = JSON.parse(sessionStorage.getItem('gb-status-ids') || 'null');
      if (c && c.t > Date.now() - 600000) { statusIds = c.m; return Promise.resolve(statusIds); }
    } catch (e) { statusIds = null; }
    return fetch('/issue_statuses.json', { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('statuses ' + r.status); return r.json(); })
      .then(function (j) {
        var m = {};
        (j.issue_statuses || []).forEach(function (s) { m[s.name] = s.id; });
        statusIds = m;
        try { sessionStorage.setItem('gb-status-ids', JSON.stringify({ t: Date.now(), m: m })); } catch (e) { statusIds = m; }
        return m;
      });
  }

  function textAfter(el) {
    var n = el && el.nextSibling;
    return n && n.nodeType === 3 ? n : null;
  }
  // Property changes in one shape (DESIGN §3.3):
  //   「**カテゴリ**: フロントエンド にセット」「**担当者**: A → B」「**ファイル**: a.png を追加」
  //   「**期日**: ~~2026/11/30~~ を削除」「**説明** を更新（差分）」
  function decorateDetailItem(li) {
    if (li.dataset.gbDetail) return;
    li.dataset.gbDetail = '1';
    var head = li.querySelector(':scope > strong');
    var vals = li.querySelectorAll(':scope > i');
    var t1 = textAfter(head);
    if (head && t1) {
      var tx = t1.textContent;
      if (vals.length === 2 && /^\s*を\s*$/.test(tx) && /^\s*から\s*$/.test((textAfter(vals[0]) || {}).textContent || '')) {
        // "X を A から B に変更" -> "X: A → B"
        var mid = textAfter(vals[0]);
        var arrow = document.createElement('span');
        arrow.className = 'gb-arrow';
        arrow.setAttribute('aria-label', 'から');
        arrow.textContent = '→';
        li.replaceChild(arrow, mid);
        var tail = textAfter(vals[1]);
        if (tail && /^\s*に変更\s*$/.test(tail.textContent)) tail.textContent = '';
        t1.textContent = ' ';
        head.classList.add('gb-detail-name');
        li.classList.add('gb-detail--change');
      } else if (/^\s*を\s*$/.test(tx)) {
        // "X を V にセット" -> "X: V にセット"
        t1.textContent = ' ';
        head.classList.add('gb-detail-name');
      } else if (/^\s*を削除\s*\(\s*$/.test(tx)) {
        // "X を削除 (old)" -> "X: old を削除"
        var old = t1.nextSibling;
        var close = old && textAfter(old);
        t1.textContent = ' ';
        if (close && /^\s*\)\s*$/.test(close.textContent)) close.textContent = ' を削除';
        else t1.textContent = ' 削除（';
        head.classList.add('gb-detail-name');
      } else if (/^\s+$/.test(tx) && li.lastChild && li.lastChild.nodeType === 3 && /^\s*を追加\s*$/.test(li.lastChild.textContent)) {
        // "X V を追加" -> "X: V を追加"
        t1.textContent = ' ';
        head.classList.add('gb-detail-name');
      } else if (/^\s*を更新/.test(tx)) {
        // "X を更新 (差分)" -> "X を更新（差分）"
        t1.textContent = ' を更新' + (/\(\s*$/.test(tx) ? '（' : '');
      }
    }
    // remaining half-width parens -> full-width, no surrounding spaces
    Array.prototype.slice.call(li.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      n.textContent = n.textContent.replace(/\s*\(\s*$/, '（').replace(/^\s*\)\s*/, '）');
    });
    var label = li.querySelector(':scope > strong');
    if (label && label.textContent.trim() === 'ステータス' && vals.length) {
      li.classList.add('gb-detail--status');
      loadStatusIds().then(function (map) {
        vals.forEach(function (i) {
          var id = map[i.textContent.trim()];
          i.className = 'gb-status gb-status--mini' + (id ? ' gb-status-' + id : '');
        });
      }).catch(function () { /* plain text stays */ });
    }
  }

  function decorateJournals(root) {
    root.querySelectorAll('#history .journal').forEach(function (j) {
      var h4 = j.querySelector('h4.journal-header');
      if (h4 && !h4.dataset.gbHead) {
        h4.dataset.gbHead = '1';
        var info = h4.querySelector('.journal-info');
        var user = info && info.querySelector('a.user');
        var core = info && info.querySelector('.avatar:not(.gb-avatar)');
        var av = il.avatar(user ? user.textContent : (core ? core.getAttribute('title') || '' : ''), 28);
        // both avatars stay out of the heading so its name is only 「名前 さんが…」:
        // ours sits beside it (decorative, aria-hidden), the duplicate core one is dropped
        if (core) core.remove();
        if (info) tidyAuthorText(info);
        if (info) groupPhrases(info, user);
        var old = j.querySelector(':scope > .gb-avatar');
        if (old) old.remove();
        j.insertBefore(av, j.firstChild);
      }
      j.querySelectorAll('ul.journal-details > li').forEach(decorateDetailItem);
    });
    // 「子課題: #8 を追加」 -> DEMO-8 (same key form as the list and the relations)
    var keyItems = [];
    // the id comes as a link or as plain <i>#8</i> (子課題 / 親課題 / 関連 details)
    root.querySelectorAll('#history ul.journal-details a[href*="/issues/"], #history ul.journal-details > li i').forEach(function (a) {
      if (a.dataset.gbKey) return;
      var m = a.textContent.trim().match(/^#(\d+)$/);
      if (!m) return;
      a.dataset.gbKey = '1';
      a.classList.add('gb-issue-key');
      if (!a.title) a.title = '#' + m[1];
      keyItems.push({ el: a, id: m[1] });
    });
    if (keyItems.length) il.applyKeys(keyItems, il.bodyProject());
  }

  // ---------- watchers (sidebar) ----------
  function decorateWatchers(root) {
    // 「ウォッチャー (1)」 -> 「ウォッチャー」 + count pill (same as the section titles)
    root.querySelectorAll('#watchers > h3').forEach(function (h3) {
      if (h3.dataset.gbWatchCount || h3.children.length) return;
      var m = h3.textContent.trim().match(/^(.*?)\s*\((\d+)\)$/);
      if (!m) return;
      h3.dataset.gbWatchCount = '1';
      h3.textContent = m[1];
      h3.appendChild(countBadge(m[2]));
    });
    root.querySelectorAll('#watchers ul.watchers > li').forEach(function (li) {
      if (li.dataset.gbWatcher) return;
      li.dataset.gbWatcher = '1';
      var user = li.querySelector('a.user');
      var core = li.querySelector('.avatar:not(.gb-avatar)');
      if (core) core.classList.add('gb-core-avatar');
      li.insertBefore(il.avatar(user ? user.textContent : '', 20), li.firstChild);
    });
  }

  GB.ready(function () {
    if (!isIssueShow()) return;
    document.body.classList.add('gb-issue-show');
    decorateTitle();
  });
  function decorateAll(root) {
    var issue = document.querySelector('#content > div.issue');
    if (issue) {
      decoratePrevNext(issue);
      placePrevNext(issue);
      decorateAuthor(issue);
      decorateAttributes(issue);
      decorateSections(issue);
      tidyAttachmentMeta(issue);
    }
    decorateSubRows(root);
    decorateJournals(root);
    decorateWatchers(root);
  }

  // Redmine's data-remote links/forms (add relation, watch toggle, journal edit) go through rails-ujs and
  // replace #relations / #watchers / journals without jQuery ajax events: re-decorate on DOM changes too.
  // The observer is paused while decorating, and every decorator is idempotent, so it cannot loop.
  var observer = null, pending = 0;
  function observeTargets() {
    if (!observer) return;
    ['#content > div.issue', '#history', '#sidebar'].forEach(function (sel) {
      var el = document.querySelector(sel);
      if (el) observer.observe(el, { childList: true, subtree: true });
    });
  }
  function redecorate() {
    pending = 0;
    if (observer) observer.disconnect();
    try { decorateAll(document); } catch (e) { console.error('[greenboard]', e); }
    if (observer) { observer.takeRecords(); observeTargets(); }
  }
  function startObserver() {
    if (observer || !window.MutationObserver) return;
    observer = new MutationObserver(function () {
      if (!pending) pending = window.setTimeout(redecorate, 0);
    });
    observeTargets();
  }

  if (npInlineMq) {
    var onNpMq = function () { if (isIssueShow()) redecorate(); };
    if (npInlineMq.addEventListener) npInlineMq.addEventListener('change', onNpMq);
    else if (npInlineMq.addListener) npInlineMq.addListener(onNpMq);
  }

  GB.onAjax(function (root) {
    if (!isIssueShow()) return;
    if (observer) observer.disconnect();
    decorateAll(root);
    if (observer) { observer.takeRecords(); observeTargets(); }
    startObserver();
  });
})();

// === 55-issue-form.js ===
// 55-issue-form
// Issue new / copy / edit / inline edit / compact comment panel / bulk edit.
// Everything here only decorates or moves Redmine's own elements (never re-creates
// form controls) and is idempotent: GB.onAjax re-runs it after every AJAX re-render
// of #all_attributes (tracker / status / project change) and of the bulk form.
(function () {
  var GB = window.GB;
  var DONE_STATUS_NAME = '処理済み';
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var fileSeq = 0;
  var NOTES_PLACEHOLDER = 'コメント（@ でメンバーに通知）';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function bodyIs(cls) { return document.body.classList.contains(cls); }
  // the board's quick-create dialog (#new-issue-card-modal) reuses form#issue-form; board owns it
  function forms() {
    return Array.prototype.filter.call(document.querySelectorAll('form#issue-form, form#bulk_edit_form'), function (f) {
      return !f.closest('#new-issue-card-modal');
    });
  }

  // ---------------------------------------------------------------- header row
  // Visual + tab order: (プロジェクト) → トラッカー → プライベート → 題名 …
  function arrangeHeader(form) {
    var all = form.querySelector('#all_attributes');
    if (!all) return;
    var tracker = all.querySelector(':scope > p > #issue_tracker_id');
    var trackerP = tracker && tracker.parentNode;
    var priv = all.querySelector(':scope > #issue_is_private_wrap');
    if (priv && trackerP && trackerP.nextElementSibling !== priv) all.insertBefore(priv, trackerP.nextSibling);
    if (trackerP) trackerP.setAttribute('data-tracker', tracker.value);
  }

  // ------------------------------------------------------------ field helpers
  function setStatusData(status) {
    if (status && status.parentNode) status.parentNode.setAttribute('data-status', status.value || '');
  }

  function decorateFields(form) {
    var subject = form.querySelector('#issue_subject');
    if (subject && !subject.hasAttribute('placeholder')) subject.setAttribute('placeholder', '題名を入力');
    var parent = form.querySelector('#issue_parent_issue_id');
    if (parent && !parent.hasAttribute('placeholder')) parent.setAttribute('placeholder', '課題番号または題名で検索');
    var notes = form.querySelector('#issue_notes, #bulk_edit_form #notes');
    if (notes && !notes.hasAttribute('placeholder')) notes.setAttribute('placeholder', NOTES_PLACEHOLDER);

    // 時間を記録: its 「コメント」 field sat right above the 「コメント」 section heading; call it 作業メモ
    // here only (field_comments is shared with every time-entry screen, so no locale change)
    var teComments = form.querySelector('#log_time #time_entry_comments');
    if (teComments && !teComments.hasAttribute('placeholder')) teComments.setAttribute('placeholder', '作業内容のメモ');
    var teLabel = form.querySelector('#log_time label[for=time_entry_comments]');
    if (teLabel && !teLabel.hasAttribute('data-gb-relabel')) {
      teLabel.setAttribute('data-gb-relabel', '1');
      each(teLabel.childNodes, function (n) {
        if (n.nodeType === 3 && /コメント/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace('コメント', '作業メモ');
      });
    }

    // プライベートコメント: drop the whitespace between checkbox and label so the gap is the label's
    // 8px margin alone (bulk edit wraps both in one flex label with the same 8px gap)
    var priv = form.querySelector('#add_notes > #issue_private_notes');
    var gap = priv && priv.nextSibling;
    if (gap && gap.nodeType === 3 && !/\S/.test(gap.nodeValue)) gap.parentNode.removeChild(gap);

    each(form.querySelectorAll('.attributes a.icon-add, #attributes a.icon-add'), function (a) {
      if (a.hasAttribute('aria-label')) return;
      var href = a.getAttribute('href') || '';
      var label = /issue_categories/.test(href) ? 'カテゴリを追加'
        : /versions/.test(href) ? 'マイルストーンを追加'
          : (a.getAttribute('title') || '追加');
      a.setAttribute('aria-label', label);
      a.setAttribute('title', label);
    });

    if (form.id !== 'issue-form') return;
    var status = form.querySelector('#issue_status_id');
    if (status) {
      setStatusData(status);
      var sp = status.parentNode;
      if (!sp.querySelector('.gb-quick')) {
        var done = Array.prototype.find.call(status.options, function (o) {
          return o.textContent.trim() === DONE_STATUS_NAME;
        });
        if (done && !done.selected) {
          var a = el('a', 'gb-quick', DONE_STATUS_NAME + 'に設定');
          a.href = '#';
          a.addEventListener('click', function (e) {
            e.preventDefault();
            status.value = done.value;
            status.dispatchEvent(new Event('change', { bubbles: true }));
          });
          sp.appendChild(a);
        }
      }
    }
  }

  // 「私が担当」 (DESIGN §3.2.6) on every form that has core's assign-to-me link, including the
  // board's quick-create dialog, and hidden while the issue is already assigned to me
  function decorateAssignToMe(root) {
    each(root.querySelectorAll('a.assign-to-me-link'), function (me) {
      if (!me.dataset.gbLabel) {
        me.dataset.gbLabel = '1';
        me.textContent = '私が担当';
      }
      var select = me.parentNode && me.parentNode.querySelector('select');
      if (select) syncAssignToMe(me, select);
    });
  }
  function syncAssignToMe(me, select) {
    var mine = select.value !== '' && select.value === me.getAttribute('data-id');
    me.classList.toggle('hidden', mine);
    me.hidden = mine;
    // core's click handler hides it with jQuery .hide(); bring it back when someone else is picked
    if (!mine && me.style.display === 'none') me.style.removeProperty('display');
  }

  // edit forms save, they do not "send" (§3.2.4); the compact panel switches it to 登録.
  // Bulk edit is an edit too: same 「保存」 so the primary label is the same on every edit screen.
  function labelEditSubmit(form) {
    var isEdit = form.id === 'bulk_edit_form' || (form.id === 'issue-form' && form.classList.contains('edit_issue'));
    if (!isEdit) return;
    var submit = form.querySelector('input[type=submit][name=commit]');
    if (!submit || submit.dataset.gbLabel === '保存') return;
    submit.dataset.gbLabel = '保存';
    if (form.closest('#update.gb-compact')) return;
    submit.value = '保存';
    submit.setAttribute('data-disable-with', '保存');
  }

  // 説明 on edit: core hides the editor behind a pencil link. Make it a real button
  // and show a short read-only preview of the current text above it.
  function decorateDescription(form) {
    var wrap = form.querySelector('#issue_description_and_toolbar');
    var link = wrap && wrap.parentNode.querySelector(':scope > a.icon-edit');
    if (!link || link.dataset.gbDesc) return;
    link.dataset.gbDesc = '1';
    link.classList.add('gb-desc-edit');
    var label = link.querySelector('.icon-label');
    if (label) label.textContent = '説明を編集';
    var ta = wrap.querySelector('textarea');
    link.addEventListener('click', function () {
      var peekEl = link.parentNode.querySelector('.gb-desc-peek');
      if (peekEl) peekEl.remove();
      if (ta) setTimeout(function () { ta.focus(); }, 0);
    });
    if (!ta || !ta.value.trim() || wrap.style.display !== 'none') return;
    var peek = el('div', 'gb-desc-peek');
    peek.appendChild(el('span', 'gb-desc-peek__text', ta.value.trim()));
    peek.setAttribute('aria-hidden', 'true');
    peek.title = 'クリックして説明を編集';
    peek.addEventListener('click', function () { link.click(); });
    link.parentNode.insertBefore(peek, link);
    renderPeek(form, peek);
  }

  // Show the rendered description (same HTML as the issue page) instead of raw markup:
  // inline edit copies it from the page; the full edit page reads it from the issue page.
  function usePeekHtml(peek, wiki) {
    if (!wiki || !peek.isConnected) return;
    var box = el('div', 'wiki gb-desc-peek__wiki');
    each(wiki.childNodes, function (n) { box.appendChild(document.importNode(n, true)); });
    // no interactive content inside the (aria-hidden) peek
    each(box.querySelectorAll('a, input, button, [tabindex]'), function (n) { n.setAttribute('tabindex', '-1'); });
    var text = peek.querySelector('.gb-desc-peek__text');
    if (text) text.replaceWith(box);
  }
  function renderPeek(form, peek) {
    var onPage = document.querySelector('#content div.issue div.description div.wiki');
    if (onPage && form.closest('#update')) { usePeekHtml(peek, onPage); return; }
    var url = form.getAttribute('action');
    if (!url || !/^\/issues\/\d+$/.test(url) || !window.fetch || !window.DOMParser) return;
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        usePeekHtml(peek, doc.querySelector('#content div.issue div.description div.wiki'));
      })
      .catch(function () { /* keep the plain-text peek */ });
  }

  // 時間を記録: collapsed unless something is filled in (or has an error)
  function decorateLogTime(form) {
    var fs = form.querySelector('fieldset#log_time');
    var legend = fs && fs.querySelector(':scope > legend');
    if (!legend || fs.dataset.gbFold) return;
    fs.dataset.gbFold = '1';
    var filled = Array.prototype.some.call(fs.querySelectorAll('input[type=text], textarea'), function (i) {
      return i.value.trim() !== '';
    }) || !!fs.querySelector('label.error');
    fs.classList.add('gb-collapsible');
    legend.tabIndex = 0;
    legend.setAttribute('role', 'button');
    function set(open) {
      fs.classList.toggle('gb-collapsed', !open);
      legend.setAttribute('aria-expanded', String(open));
    }
    set(filled);
    legend.addEventListener('click', function () {
      var open = fs.classList.contains('gb-collapsed');
      set(open);
      if (open) {
        var first = fs.querySelector('input[type=text]');
        if (first) first.focus();
      }
    });
    legend.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); legend.click(); }
    });
  }

  // ------------------------------------------------------------- dropzone
  // Keeps core's <input type=file> (focusable, visually hidden) and labels it.
  // Core replaces the input with a clone after each pick (same id), so the label keeps working.
  function decorateDropzones(root) {
    each(root.querySelectorAll('#issue-form span.add_attachment'), function (zone) {
      if (zone.dataset.gbDrop || zone.closest('#new-issue-card-modal')) return;
      var input = zone.querySelector('input.file_selector');
      if (!input) return;
      zone.dataset.gbDrop = '1';
      zone.classList.add('gb-drop');
      if (!input.id) input.id = 'gb-file-' + (++fileSeq);
      var limit = null;
      each(Array.prototype.slice.call(zone.childNodes), function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          limit = el('span', 'gb-drop__limit', n.textContent.trim());
          zone.replaceChild(limit, n);
        }
      });
      var icon = el('span', 'gb-drop__icon');
      icon.setAttribute('aria-hidden', 'true');
      var sprite = GB.spriteHref();
      if (sprite) icon.appendChild(GB.svgIcon(sprite, 'attachment', 'icon-svg'));
      var text = el('span', 'gb-drop__text');
      text.appendChild(el('span', 'gb-drop__full', 'ファイルをドラッグ＆ドロップ、または'));
      text.appendChild(el('span', 'gb-drop__compact', 'またはドラッグ＆ドロップ'));
      var btn = el('label', 'gb-drop__btn');
      btn.htmlFor = input.id;
      btn.appendChild(el('span', 'gb-drop__full', 'ファイルを選択'));
      btn.appendChild(el('span', 'gb-drop__compact', 'ファイルを添付'));
      [icon, text, btn].forEach(function (n) { zone.insertBefore(n, limit); });
      zone.addEventListener('click', function (e) {
        if (e.target.closest('label, input, a')) return;
        var current = zone.querySelector('input.file_selector');
        if (current) current.click();
      });
    });
  }

  // (editor toolbar: tab order, narrow row, 「›」 cover, auto-height → js/15-c-editor.js)

  // core's ＋ (new category / version) links also carry tabindex="200"; positive values jump
  // the sequence, so they fall back to document order
  function dropPositiveTabindex(form) {
    each(form.querySelectorAll('[tabindex]'), function (n) {
      if (parseInt(n.getAttribute('tabindex'), 10) > 0) n.removeAttribute('tabindex');
    });
  }

  // 予定工数 / 作業時間: the 「時間」 unit becomes a span that CSS places inside the input's
  // right edge, so the input is as wide as every other field in its column (bulk has no unit: add one)
  function decorateHours(form) {
    each(form.querySelectorAll('#issue_estimated_hours, #time_entry_hours'), function (input) {
      var p = input.parentNode;
      if (!p || p.querySelector(':scope > .gb-hours-suffix')) return;
      var text = '時間';
      var n = input.nextSibling;
      while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
      if (n && n.nodeType === 3) {
        text = n.textContent.trim();
        p.removeChild(n);
      }
      var suffix = el('span', 'gb-hours-suffix', text);
      suffix.setAttribute('aria-hidden', 'true');
      p.insertBefore(suffix, input.nextSibling);
    });
  }

  // empty native date inputs show 「年/月/日」 as muted placeholder text, like every other placeholder
  function syncEmptyDate(input) {
    if (input && input.type === 'date') input.classList.toggle('gb-empty', !input.value);
  }

  // (the blank select option 「未設定」 is C-form: js/15-c-form.js)
  function decorateEmptyDates(form) {
    if (form.id !== 'issue-form' && !form.closest('#ajax-modal')) return;
    each(form.querySelectorAll('input[type=date]'), syncEmptyDate);
  }

  // ------------------------------------------------------------- watchers
  function avatarFor(name, size) {
    if (typeof GB.avatar === 'function') {
      var av = GB.avatar(name, size);
      if (av && av.nodeType === 1) return av;
    }
    var sum = 0;
    for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    var s = el('span', 'gb-f-avatar gb-f-avatar--' + size, GB.initial(name));
    s.setAttribute('data-av', String(sum % 8));
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function decorateWatchers(form) {
    each(form.querySelectorAll('#watchers_inputs label.floating'), function (label) {
      var input = label.querySelector('input');
      if (!input || label.querySelector('.gb-avatar, .gb-f-avatar')) return;
      var av = avatarFor(label.textContent.trim(), 20);
      label.insertBefore(av, input.nextSibling);
    });
    var grid = form.querySelector('#watchers_inputs');
    if (grid && !grid.dataset.gbCols) {
      grid.dataset.gbCols = '1';
      if (watchersRO) watchersRO.observe(grid);
    }
    if (grid) balanceWatchers(grid);
  }

  // Watcher columns: as many as fit the longest name without truncation, then evened out so no
  // row holds a lone name (4 users in 3 columns → 2 × 2, never 3 + 1)
  var WATCHER_GAP = 24;
  var watchersRO = window.ResizeObserver ? new ResizeObserver(function (entries) {
    entries.forEach(function (e) { balanceWatchers(e.target); });
  }) : null;
  function balanceWatchers(grid) {
    var labels = grid.querySelectorAll('label.floating');
    var w = grid.clientWidth;
    if (!labels.length || !w) return;
    var need = 0;
    each(labels, function (l) {
      var sum = 0;
      each(l.children, function (c) { sum += c.getBoundingClientRect().width; });
      var text = 0;
      each(l.childNodes, function (n) {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var r = document.createRange();
        r.selectNodeContents(n);
        text += r.getBoundingClientRect().width;
      });
      need = Math.max(need, Math.ceil(sum + text + 8 * l.children.length + 2));
    });
    var fit = Math.max(1, Math.floor((w + WATCHER_GAP) / (Math.max(need, 120) + WATCHER_GAP)));
    var rows = Math.ceil(labels.length / fit);
    var cols = Math.ceil(labels.length / rows);
    if (grid.style.getPropertyValue('--gb-w-cols') !== String(cols)) grid.style.setProperty('--gb-w-cols', String(cols));
  }

  // watcher search modal: single-initial avatars, one-line names, 560px dialog (§2.16)
  function decorateWatcherModal() {
    var list = document.getElementById('users_for_watcher');
    if (!list) return;
    // 「ユーザーの検索:」 → no trailing colon, like every other label in the theme
    var searchLabel = document.querySelector('#new-watcher-form label[for=user_search]');
    if (searchLabel && /[:：]\s*$/.test(searchLabel.textContent)) {
      searchLabel.textContent = searchLabel.textContent.replace(/\s*[:：]\s*$/, '');
    }
    var search = document.getElementById('user_search');
    if (search && !search.hasAttribute('placeholder')) search.setAttribute('placeholder', '名前で絞り込み');
    each(list.querySelectorAll('label'), function (label) {
      if (label.querySelector('.gb-avatar, .gb-f-avatar')) return;
      var input = label.querySelector('input');
      if (!input) return;
      var name = '';
      each(Array.prototype.slice.call(label.childNodes), function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) { name += n.textContent; label.removeChild(n); }
      });
      name = name.replace(/\s+/g, ' ').trim();
      if (!name) return;
      var nameEl = el('span', 'gb-w-name', name);
      label.title = name;
      label.appendChild(avatarFor(name, 20));
      label.appendChild(nameEl);
    });
    var modal = list.closest('#ajax-modal');
    var $ = window.jQuery;
    if (!modal || modal.dataset.gbWide === '1' || !$ || !$.fn.dialog) return;
    var $m = $(modal);
    if (!$m.hasClass('ui-dialog-content')) return;
    modal.dataset.gbWide = '1';
    $m.dialog('option', 'width', Math.min(560, window.innerWidth - 32));
    $m.dialog('option', 'position', { my: 'center', at: 'center', of: window });
    $m.one('dialogclose', function () { delete modal.dataset.gbWide; });
  }

  // ------------------------------------------------------------- action bar
  function kbdHint(label) {
    var s = el('span', 'gb-kbd-hint');
    s.appendChild(el('kbd', null, IS_MAC ? '⌘' : 'Ctrl'));
    s.appendChild(document.createTextNode(' + '));
    s.appendChild(el('kbd', null, 'Enter'));
    s.appendChild(document.createTextNode(' で' + (label || '送信')));
    return s;
  }

  function cancelHref(form) {
    if (form.id === 'bulk_edit_form') {
      try {
        var r = document.referrer ? new URL(document.referrer) : null;
        if (r && r.origin === location.origin && !/\/bulk_/.test(r.pathname)) return r.pathname + r.search;
      } catch (e) { /* ignore malformed referrer */ }
      var m = location.pathname.match(/^\/projects\/[^/]+/);
      return (m ? m[0] : '') + '/issues';
    }
    return form.getAttribute('action') || '/issues';
  }

  function buildActionBar(form) {
    if (form.querySelector('.gb-form-actions')) return;
    var first = form.querySelector('input[type=submit][name=commit]');
    if (!first) return;
    var bar;
    if (form.id === 'bulk_edit_form') {
      bar = first.parentNode;
      if (bar.tagName !== 'P') return;
      bar.classList.add('gb-form-actions');
    } else {
      bar = el('div', 'gb-form-actions');
      form.insertBefore(bar, first);
      each(form.querySelectorAll(':scope > input[type=submit]'), function (s) { bar.appendChild(s); });
    }
    var cancel = form.querySelector(':scope > a[href]');
    if (!cancel) {
      cancel = el('a', null, 'キャンセル');
      cancel.href = cancelHref(form);
    }
    cancel.classList.add('gb-cancel');
    bar.appendChild(cancel);
    bar.appendChild(kbdHint(first.value));
  }

  // ------------------------------------------------------------- validation
  // core's ja format is "%{attribute} %{message}" → 「題名 を入力してください」; drop the stray space
  function tidyMessage(t) {
    return t.replace(/^(\S+) (?=[をはがにのと])/, '$1');
  }

  function markInvalid(field, label, msg) {
    var p = label.closest('p');
    field.setAttribute('aria-invalid', 'true');
    if (p) p.classList.add('gb-invalid');
    var id = 'gb-err-' + field.id;
    if (document.getElementById(id)) return;
    var m = el('span', 'gb-field-error', msg);
    m.id = id;
    var anchor = field.closest('#issue_description_and_toolbar') || field;
    anchor.parentNode.insertBefore(m, anchor.nextSibling);
    var d = field.getAttribute('aria-describedby');
    field.setAttribute('aria-describedby', (d ? d + ' ' : '') + id);
  }

  function mapErrors(form) {
    var box = document.getElementById('errorExplanation');
    if (!box || box.dataset.gbErr) return;
    box.dataset.gbErr = '1';
    var msgs = Array.prototype.map.call(box.querySelectorAll('li'), function (li) {
      var t = tidyMessage(li.textContent.trim());
      if (li.children.length === 0 && li.textContent !== t) li.textContent = t;
      return t;
    });
    var labels = form.querySelectorAll('label.error[for]');
    if (!labels.length) labels = form.querySelectorAll('.tabular p > label[for]:first-child');
    each(labels, function (label) {
      var name = label.textContent.replace(/\*/g, '').trim();
      var field = document.getElementById(label.htmlFor);
      if (!name || !field) return;
      var msg = msgs.find(function (t) { return t.indexOf(name) === 0; });
      if (msg) markInvalid(field, label, msg);
    });
    box.setAttribute('tabindex', '-1');
    box.focus({ preventScroll: true });
    box.scrollIntoView({ block: 'center' });
  }

  function clearInvalid(e) {
    var f = e.target;
    if (!f || !f.getAttribute || f.getAttribute('aria-invalid') !== 'true') return;
    f.removeAttribute('aria-invalid');
    var id = 'gb-err-' + f.id;
    var m = document.getElementById(id);
    if (m) m.remove();
    var d = (f.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== id; });
    if (d.length) f.setAttribute('aria-describedby', d.join(' ')); else f.removeAttribute('aria-describedby');
    var p = f.closest('p');
    if (p) {
      p.classList.remove('gb-invalid');
      var l = p.querySelector('label.error');
      if (l) l.classList.remove('error');
    }
  }

  // ------------------------------------------------------------- issue keys (DEMO-3)
  // same format as the issue page (GB.il from 40-issue-list); "#3" when unknown
  function issueKey(id) {
    var m = document.body.className.match(/(?:^|\s)project-([^\s]+)/);
    return GB.issueKey(m ? m[1] : null, id);
  }

  // ------------------------------------------------------------- page title (edit)
  function decorateTitle() {
    var h2 = document.querySelector('#content > h2');
    var form = document.querySelector('#content > form#issue-form.edit_issue');
    if (!h2 || !form || h2.dataset.gbTitle) return;
    var m = h2.textContent.trim().match(/^(.*\S)\s+#(\d+)$/);
    if (!m) return;
    h2.dataset.gbTitle = '1';
    var tracker = form.querySelector('#issue_tracker_id');
    h2.textContent = '';
    h2.classList.add('gb-form-title', 'gb-form-title--edit');
    // one line: 課題の編集 + tracker + key; the subject lives only in the 題名 field below
    h2.appendChild(el('span', 'gb-form-heading', '課題の編集'));
    if (document.title.indexOf('課題の編集') !== 0) document.title = '課題の編集 - ' + document.title;
    if (tracker) h2.setAttribute('data-tracker', tracker.value);
    h2.appendChild(el('span', 'gb-form-tracker', m[1]));
    var key = el('span', 'gb-form-key', issueKey(m[2]));
    key.title = '#' + m[2];
    h2.appendChild(key);
  }

  // ------------------------------------------------------------- copy (/issues/3/copy)
  // title says what is copied (「DEMO-3 をコピー」 eyebrow, like the edit page) and the copy
  // checkboxes (関連 / 添付 / 子課題) get a section label instead of floating under the card
  function decorateCopy() {
    var form = document.querySelector('#content > form#issue-form.new_issue');
    var from = form && form.querySelector('input[name=copy_from]');
    var h2 = document.querySelector('#content > h2');
    if (!from || !h2 || h2.dataset.gbTitle) return;
    h2.dataset.gbTitle = '1';
    var title = h2.textContent.trim();
    h2.textContent = '';
    h2.classList.add('gb-form-title');
    h2.appendChild(el('span', 'gb-form-eyebrow', issueKey(from.value) + ' をコピー'));
    h2.appendChild(el('span', 'gb-form-main', title));
    var first = form.querySelector(':scope > .box > p:has(> input[type=checkbox])');
    var prev = first && first.previousElementSibling;
    if (first && !(prev && prev.classList.contains('gb-copy-title'))) {
      first.parentNode.insertBefore(el('div', 'gb-copy-title', 'コピーのオプション'), first);
    }
  }

  // ------------------------------------------------------------- bulk edit
  function decorateBulkTitle() {
    var h2 = document.querySelector('#content > h2');
    if (!h2 || !document.getElementById('bulk_edit_form')) return;
    var t = h2.textContent.trim();
    if (t && document.title.indexOf(t) !== 0) document.title = t + ' - ' + document.title;
  }

  function decorateBulkSelection() {
    var list = document.getElementById('bulk-selection');
    if (!list || list.dataset.gb) return;
    list.dataset.gb = '1';
    var items = list.querySelectorAll(':scope > li');
    var keyed = [];
    each(items, function (li) {
      var a = li.querySelector(':scope > a.issue');
      if (!a) return;
      var m = a.textContent.trim().match(/^(.*\S)\s+(#\d+)$/);
      var tm = a.className.match(/(?:^|\s)tracker-(\d+)/);
      if (m) {
        var badge = el('span', 'gb-bulk-tracker', m[1]);
        if (tm) badge.setAttribute('data-tracker', tm[1]);
        li.insertBefore(badge, a);
        a.textContent = m[2];
        a.title = m[2];
        keyed.push({ el: a, id: m[2].slice(1) });
      }
      var rest = '';
      var n = a.nextSibling;
      while (n) {
        var next = n.nextSibling;
        if (n.nodeType === 3) { rest += n.textContent; li.removeChild(n); }
        n = next;
      }
      rest = rest.replace(/^\s*:\s*/, '').trim();
      if (rest) li.insertBefore(el('span', 'gb-bulk-subject', rest), a.nextSibling);
    });
    if (keyed.length && GB.il && GB.il.applyKeys) GB.il.applyKeys(keyed, GB.il.bodyProject());
    if (items.length > 5) {
      for (var i = 5; i < items.length; i++) items[i].classList.add('gb-more-hidden');
      var moreLi = el('li', 'gb-bulk-more-row');
      var more = el('button', 'gb-bulk-more', 'ほか ' + (items.length - 5) + ' 件を表示');
      more.type = 'button';
      more.addEventListener('click', function () {
        each(list.querySelectorAll('.gb-more-hidden'), function (li) { li.classList.remove('gb-more-hidden'); });
        moreLi.remove();
      });
      moreLi.appendChild(more);
      list.appendChild(moreLi);
    }
  }

  function markUnchanged(select) {
    if (select.closest('#bulk_edit_form')) select.classList.toggle('gb-unchanged', select.value === '');
  }

  // ------------------------------------------------------------- compact comment panel
  function currentUserName() {
    var me = document.querySelector('#update a.assign-to-me-link[data-id]');
    if (me) {
      // skip the "<< 自分 >>" pseudo option that shares the same value
      var opt = Array.prototype.find.call(
        document.querySelectorAll('#issue_assigned_to_id option[value="' + me.getAttribute('data-id') + '"]'),
        function (o) { return !/^\s*<</.test(o.textContent); });
      if (opt) return opt.textContent.trim();
    }
    var login = document.querySelector('#loggedas a');
    return login ? login.textContent.trim() : '';
  }

  function updateVisible(update) {
    return update && update.style.display !== 'none' && getComputedStyle(update).display !== 'none';
  }

  // Compact panel tab order follows what is shown: コメント → ステータス → 担当者 → … → 登録.
  // The notes fieldset (same node, nothing re-created) goes before the attributes while
  // compact and back to its original place (marked by a comment node) for the full edit.
  var notesHome = null;
  function placeNotes(form, compact) {
    var notes = form.querySelector('fieldset#add_notes');
    var attrs = form.querySelector('.box > fieldset:has(> #all_attributes)');
    if (!notes || !attrs) return;
    if (compact) {
      if (!notesHome) {
        notesHome = document.createComment('gb-notes-home');
        notes.parentNode.insertBefore(notesHome, notes);
      }
      if (attrs.previousElementSibling !== notes) attrs.parentNode.insertBefore(notes, attrs);
    } else if (notesHome && notesHome.parentNode) {
      notesHome.parentNode.insertBefore(notes, notesHome);
    }
  }

  function setCompact(on) {
    var update = document.getElementById('update');
    var form = update && update.querySelector('#issue-form');
    if (!form) return;
    update.classList.toggle('gb-compact', on);
    placeNotes(form, on);
    var submit = form.querySelector('input[type=submit][name=commit]');
    if (submit) {
      if (!submit.dataset.gbLabel) submit.dataset.gbLabel = submit.value;
      submit.value = on ? '登録' : submit.dataset.gbLabel;
      submit.setAttribute('data-disable-with', submit.value);
    }
    var bar = form.querySelector('.gb-form-actions');
    if (bar) {
      var cancel = bar.querySelector('a.gb-cancel');
      var editAll = bar.querySelector('.gb-edit-all');
      var hint = bar.querySelector('.gb-kbd-hint');
      if (cancel) cancel.textContent = on ? '閉じる' : 'キャンセル';
      var order = on ? [editAll, hint, cancel, submit] : [submit, cancel, hint, editAll];
      order.forEach(function (n) { if (n) bar.appendChild(n); });
    }
    var notes = document.getElementById('issue_notes');
    if (notes) {
      notes.setAttribute('placeholder', NOTES_PLACEHOLDER);
    }
    decorateFields(form);
  }

  function closePanel() {
    var update = document.getElementById('update');
    var cancel = update && update.querySelector('.gb-form-actions a.gb-cancel');
    if (cancel) cancel.click();
    else if (update) update.style.display = 'none';
  }

  function buildCommentCta() {
    if (!bodyIs('controller-issues') || !bodyIs('action-show')) return;
    var update = document.getElementById('update');
    var form = update && update.querySelector('#issue-form');
    if (!form || typeof window.showAndScrollTo !== 'function') return;
    if (document.querySelector('.gb-comment-cta')) return;
    var anchor = document.getElementById('history') || document.querySelector('#content div.issue');
    if (!anchor) return;

    // the row itself is the shared C-comment component (js/15-c-comment.js); the panel logic stays here
    var cta = GB.commentCta('コメントを追加…', function () {
      setCompact(true);
      window.showAndScrollTo('update', 'issue_notes');
    }, currentUserName());
    anchor.parentNode.insertBefore(cta, anchor.nextSibling);
    // the panel opens right where the entry box is
    cta.parentNode.insertBefore(update, cta.nextSibling);

    var h3 = update.querySelector(':scope > h3');
    if (h3 && !h3.dataset.gbTitle) {
      h3.dataset.gbTitle = '1';
      h3.textContent = '課題の編集';
    }

    buildActionBar(form);
    var bar = form.querySelector('.gb-form-actions');
    if (bar && !bar.querySelector('.gb-edit-all')) {
      var all = el('a', 'gb-edit-all', 'すべての項目を編集');
      all.href = '#';
      all.addEventListener('click', function (e) {
        e.preventDefault();
        setCompact(false);
        update.scrollIntoView({ block: 'start', behavior: 'smooth' });
        var subject = document.getElementById('issue_subject');
        if (subject) subject.focus({ preventScroll: true });
      });
      bar.appendChild(all);
    }

    // CTA is visible exactly when the panel is hidden; a hidden panel resets to compact
    function sync() {
      var open = updateVisible(update);
      cta.hidden = open;
      if (!open && !update.classList.contains('gb-compact')) setCompact(true);
    }
    new MutationObserver(function () {
      var wasOpen = cta.hidden;
      sync();
      if (wasOpen && !cta.hidden) GB.commentCta.focus(cta);
    }).observe(update, { attributes: true, attributeFilter: ['style'] });
    setCompact(true);
    sync();

    // one column when the panel (not just the viewport) is too narrow for editor + 280px fields
    var stackMq = window.matchMedia('(max-width: 1000px)');
    function syncStack() {
      var w = update.clientWidth;
      if (!w) return;
      update.classList.toggle('gb-stack', stackMq.matches || w < 680);
    }
    if (window.ResizeObserver) new ResizeObserver(syncStack).observe(update);
    stackMq.addEventListener('change', syncStack);
    syncStack();

    // Esc closes an empty panel; otherwise it only leaves the field (no data loss)
    update.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || e.isComposing || !update.classList.contains('gb-compact')) return;
      var menu = document.querySelector('.tribute-container');
      if (menu && menu.offsetParent !== null) return;
      var notes = document.getElementById('issue_notes');
      var pending = update.querySelector('.attachments_fields > span');
      if (notes && !notes.value.trim() && !pending) {
        e.preventDefault();
        closePanel();
      } else {
        // keep the text and stay inside the panel: next Enter closes, Tab goes to 登録
        e.preventDefault();
        var close = update.querySelector('.gb-form-actions a.gb-cancel');
        if (close && document.activeElement !== close) close.focus();
      }
    });
  }

  // 「編集」 links (top and bottom action bars, cloned or not) open the full form
  function onEditLinkClick(e) {
    var a = e.target.closest && e.target.closest('a[onclick*="showAndScrollTo"]');
    if (!a || !/["']update["']/.test(a.getAttribute('onclick') || '')) return;
    if (!a.classList.contains('icon-edit')) return;
    setCompact(false);
    // core focuses コメント (§3.2.5) and animates to #update.offset().top (100ms), which ends
    // under the sticky issue strip; re-align with scroll-margin-top and keep focus on コメント
    setTimeout(function () {
      var update = document.getElementById('update');
      if (!updateVisible(update)) return;
      var notes = document.getElementById('issue_notes');
      if (notes && document.activeElement !== notes) notes.focus({ preventScroll: true });
      update.scrollIntoView({ block: 'start' });
    }, 180);
  }

  // ------------------------------------------------------------- keyboard
  function onKeydown(e) {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    var t = e.target;
    var form = t.closest && t.closest('form#issue-form, form#bulk_edit_form');
    if (!form || form.closest('#new-issue-card-modal')) return;
    if (e.ctrlKey || e.metaKey) {
      // textareas are handled by core (application.js)
      if (t.tagName === 'TEXTAREA' || t.type === 'file') return;
      var btn = form.querySelector('input[type=submit][name=commit]');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      if (typeof form.requestSubmit === 'function') form.requestSubmit(btn); else btn.click();
      return;
    }
    // Enter in 題名 must not create the issue by accident
    if (t.id === 'issue_subject' && form.classList.contains('new_issue')) e.preventDefault();
  }

  function onChange(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.id === 'issue_status_id' && t.closest('#issue-form')) setStatusData(t);
    if (t.tagName === 'SELECT') markUnchanged(t);
    if (t.type === 'date') syncEmptyDate(t);
    if (t.id === 'issue_assigned_to_id') {
      var me = t.parentNode.querySelector('a.assign-to-me-link');
      if (me) syncAssignToMe(me, t);
    }
  }

  // ------------------------------------------------------------- wiring
  function decorateAll() {
    each(forms(), function (form) {
      arrangeHeader(form);
      decorateFields(form);
      decorateDescription(form);
      decorateLogTime(form);
      decorateWatchers(form);
      dropPositiveTabindex(form);
      labelEditSubmit(form);
      decorateHours(form);
      decorateEmptyDates(form);
      buildActionBar(form);
      each(form.querySelectorAll('select'), markUnchanged);
    });
    each(document.querySelectorAll('#ajax-modal form'), decorateEmptyDates);
    decorateDropzones(document);
    decorateAssignToMe(document);
    decorateWatcherModal();
  }

  // in-flight spinner only on the button that was pressed (core disables every submit of the
  // form via data-disable-with; the others just look disabled)
  function onSubmit(e) {
    var form = e.target;
    if (!form.matches || !form.matches('form#issue-form, form#bulk_edit_form')) return;
    var by = e.submitter && e.submitter.form === form ? e.submitter
      : form.querySelector('input[type=submit][name=commit]');
    each(form.querySelectorAll('.gb-submitting'), function (b) { b.classList.remove('gb-submitting'); });
    if (by) by.classList.add('gb-submitting');
  }

  GB.ready(function () {
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('change', onChange);
    document.addEventListener('input', clearInvalid);
    document.addEventListener('change', clearInvalid);
    document.addEventListener('click', onEditLinkClick, true);

    decorateAll();
    buildCommentCta();
    decorateTitle();
    decorateCopy();
    decorateBulkTitle();
    decorateBulkSelection();
    each(forms(), mapErrors);

    // new issue: start typing the subject right away
    if (bodyIs('controller-issues') && bodyIs('action-new') && !document.getElementById('errorExplanation')) {
      var subject = document.querySelector('form.new_issue #issue_subject');
      if (subject && !subject.value) subject.focus({ preventScroll: true });
    }
  });
  // Bulk edit: core's defaultFocus() puts the caret in the first text field (親課題, halfway down
  // the form) and scrolls there; the page should open at its title and the selected issues
  function undoBulkAutofocus() {
    if (location.hash) return;
    var parent = document.querySelector('#bulk_edit_form #issue_parent_issue_id');
    if (!parent || document.activeElement !== parent) return;
    parent.blur();
    window.scrollTo(0, 0);
  }

  GB.ready(function () {
    if (!document.getElementById('bulk_edit_form')) return;
    setTimeout(undoBulkAutofocus, 0);
    if (window.jQuery) window.jQuery(function () { setTimeout(undoBulkAutofocus, 0); });
  });

  GB.onAjax(function () {
    decorateAll();
    decorateBulkSelection();
  });
})();

// === 60-board.js ===
// 60-board — kanban board (redmine_issues_panel)
// Card layout: [tracker pill] [#key] ......... […]
//              subject (max 3 lines)
//              [avatar] [priority] ............ [due date]
// Everything here is progressive enhancement: the plugin's markup, drag & drop,
// context menu and new-card modal keep working without it.
(function () {
  var GB = window.GB;
  var dueCache = {};       // issue id -> due date string ('' = none)
  var dueRequested = {};   // issue id -> true once a lookup was sent
  var decorated = {};      // issue id -> true once a card for it was decorated (detects AJAX re-renders)
  // fields the card shows in its own layout; other columns chosen in オプション stay visible as meta rows
  var SHOWN_FIELDS = ['priority', 'assigned_to', 'updated_on', 'due_date', 'tracker', 'status'];

  function isBoard() { return document.body.classList.contains('controller-issues_panel'); }

  // The right #sidebar only holds query links on the board but costs it ~260px, so the board starts wide.
  // Core reads this key on DOM ready (collapsibleSidebar); this runs earlier, while the theme script loads.
  // Only an unset key is changed: a user who reopens the sidebar keeps that choice.
  (function () {
    if (!/\/issues_panel\/?$/.test(location.pathname)) return;
    try {
      var key = 'redmine-sidebar-state-action-index-controller-issues_panel';
      if (window.localStorage && localStorage.getItem(key) === null) localStorage.setItem(key, 'hidden');
    } catch (e) { /* storage blocked: core falls back to its own default */ }
  })();

  function groupBy() {
    var sel = document.getElementById('group_by');
    if (sel) return sel.value;
    var m = location.search.match(/[?&]group_by=([^&]*)/);
    return m ? decodeURIComponent(m[1]) : '';
  }

  function sprite() { return GB.spriteHref ? GB.spriteHref() : null; }

  function icon(id, cls) {
    var href = sprite();
    return href ? GB.svgIcon(href, id, cls) : null;
  }

  function avatarIndex(name) {
    if (typeof GB.avatarIndex === 'function') return GB.avatarIndex(name);
    var sum = 0;
    for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return sum % 8;
  }

  function initial(name) {
    return GB.initial ? GB.initial(name) : (Array.from(String(name).trim())[0] || '?').toUpperCase();
  }

  // Round initial avatar (DESIGN.md §2.9). Same markup as the shared component.
  function avatar(name, label) {
    var av = document.createElement('span');
    av.className = 'gb-avatar gb-avatar--20';
    av.setAttribute('data-av', String(avatarIndex(name)));
    av.textContent = initial(name);
    if (label) {
      av.setAttribute('role', 'img');
      av.setAttribute('aria-label', label);
      av.title = name;
    } else {
      av.setAttribute('aria-hidden', 'true');
    }
    return av;
  }

  // priority = the same arrow + text as the issue list and detail (40-issue-list.css .gb-prio):
  // one sprite arrow rotated per level, coloured arrow, text in the normal text colour, bold when high
  function prioChip(el, level) {
    if (GB.il && typeof GB.il.decoratePriority === 'function') {
      GB.il.decoratePriority(el, level);
      return;
    }
    var text = el.textContent;
    var span = document.createElement('span');
    span.className = 'gb-prio gb-prio--' + level;
    var arrow = document.createElement('span');
    arrow.className = 'gb-prio__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    var ic = icon('arrow-narrow-right', 'gb-prio__icon');
    if (ic) arrow.appendChild(ic);
    else arrow.textContent = level === 'high' ? '↑' : (level === 'low' ? '↓' : '→');
    span.appendChild(arrow);
    span.appendChild(document.createTextNode(text));
    el.textContent = '';
    el.appendChild(span);
  }

  function fieldValue(content, field) {
    var el = content.querySelector(':scope > .' + field + ' .value');
    return el ? el.textContent.trim() : '';
  }

  // ---- issue key: the card's own project (global board shows a project row), else the board's project ----
  function projectOf(content) {
    var a = content.querySelector(':scope > .project .value a[href*="/projects/"]');
    var m = a && a.getAttribute('href').match(/\/projects\/([^\/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    var b = document.body.className.match(/(?:^|\s)project-([^\s]+)/);
    return b ? b[1] : null;
  }

  function issueKey(content, id) {
    return GB.issueKey(projectOf(content), id);
  }

  // ---- due dates: shown on every card, even when 期限日 is not a selected column ----
  function parseDate(s) {
    var m = String(s).match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }

  function renderDue(card) {
    var foot = card.querySelector('.gb-card-foot');
    if (!foot || foot.querySelector('.gb-card-due')) return;
    var id = card.getAttribute('data-issue-id');
    var text = dueCache[id];
    if (!text) return;
    var inner = card.querySelector('.hascontextmenu');
    var due = document.createElement('span');
    due.className = 'gb-card-due';
    // the 期限日 column may carry a relative suffix such as "(4日 遅れ)"; the card shows the date only
    var dateText = text.replace(/\s*[(（].*$/, '');
    var d = parseDate(dateText);
    var shown = dateText;
    if (d) {
      var now = new Date();
      if (d.getFullYear() === now.getFullYear()) shown = (d.getMonth() + 1) + '/' + d.getDate();
      var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      if (d.getTime() === today.getTime()) due.classList.add('is-today');
    }
    var overdue = inner && inner.classList.contains('overdue');
    if (overdue) due.classList.add('is-overdue');
    due.title = '期限日: ' + text + (overdue && text === dateText ? '（期限切れ）' : '');
    var ic = icon('time', 'icon-svg gb-card-due__icon');
    if (ic) due.appendChild(ic);
    var label = document.createElement('span');
    label.textContent = shown;
    due.appendChild(label);
    foot.appendChild(due);
  }

  function loadDueDates(cards) {
    var missing = [];
    cards.forEach(function (card) {
      var id = card.getAttribute('data-issue-id');
      if (!id) return;
      if (id in dueCache) { renderDue(card); return; }
      if (!dueRequested[id]) { dueRequested[id] = true; missing.push(id); }
    });
    if (!missing.length || !window.fetch) return;
    var chunks = [];
    for (var i = 0; i < missing.length; i += 150) chunks.push(missing.slice(i, i + 150));
    chunks.forEach(function (ids) {
      // CSV export does not touch the session query, so the user's saved filters stay intact
      var url = '/issues.csv?set_filter=1&f[]=issue_id&op[issue_id]=%3D&v[issue_id][]=' + ids.join(',') +
        '&f[]=status_id&op[status_id]=*&c[]=due_date&encoding=UTF-8';
      fetch(url, { credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (csv) {
          ids.forEach(function (id) { if (!(id in dueCache)) dueCache[id] = ''; });
          csv.split(/\r?\n/).slice(1).forEach(function (line) {
            var m = line.match(/^"?(\d+)"?,"?([^"]*)"?$/);
            if (m) dueCache[m[1]] = m[2].trim();
          });
          document.querySelectorAll('.issue-card[data-issue-id]').forEach(renderDue);
        })
        .catch(function () { /* due dates are optional decoration */ });
    });
  }

  // ---- cards ----
  function decorateCard(card) {
    if (card.dataset.gbCard) return;
    var content = card.querySelector('.card-content');
    var header = content && content.querySelector(':scope > .header');
    if (!header) return;
    card.dataset.gbCard = '1';
    var inner = card.querySelector('.hascontextmenu');
    var id = card.getAttribute('data-issue-id');

    // line 1: tracker pill + key (DEMO-21, same form as the issue list and detail)
    var link = header.querySelector('a[href*="/issues/"]:not(.js-contextmenu)');
    if (link) {
      var text = link.textContent.trim();
      var tracker = text.replace(/\s*#\d+\s*$/, '');
      var tm = link.className.match(/(?:^|\s)tracker-(\d+)/);
      var pill = document.createElement('span');
      pill.className = 'gb-tracker gb-tracker-' + (tm ? tm[1] : 'x');
      pill.textContent = tracker;
      var key = issueKey(content, id);
      link.textContent = key;
      link.setAttribute('aria-label', tracker + ' ' + key);
      link.classList.add('gb-issue-key');
      header.insertBefore(pill, link);
    }
    var menu = header.querySelector('.js-contextmenu');
    if (menu) {
      // aria-label only: a title tooltip would stay open over the context menu this button opens
      menu.setAttribute('aria-label', menu.getAttribute('title') || '操作');
      menu.removeAttribute('title');
    }

    // global board: the project becomes one muted line right under the subject
    var project = content.querySelector(':scope > .project');
    var subjectRow = content.querySelector(':scope > .subject');
    if (project) {
      project.classList.add('gb-card-project');
      var pv = project.querySelector('.value');
      if (pv) project.title = 'プロジェクト: ' + pv.textContent.trim();
      if (subjectRow) subjectRow.insertAdjacentElement('afterend', project);
    }

    // fields represented by the card layout are hidden; any other chosen column stays as a meta row
    SHOWN_FIELDS.forEach(function (f) {
      var row = content.querySelector(':scope > .' + f);
      if (row) row.classList.add('gb-card-hidden');
    });
    var due = fieldValue(content, 'due_date');
    if (content.querySelector(':scope > .due_date')) dueCache[id] = due === '-' ? '' : due;

    // line 3: assignee avatar + priority + due date
    var foot = document.createElement('div');
    foot.className = 'gb-card-foot';
    var userLink = content.querySelector(':scope > .assigned_to .value a.user, :scope > .assigned_to .value a');
    var name = userLink ? userLink.textContent.trim() : fieldValue(content, 'assigned_to');
    // grouped by 担当者: the swimlane title already shows who it is; unassigned = no avatar at all (§6.8)
    if (content.querySelector(':scope > .assigned_to') && groupBy() !== 'assigned_to' && name && name !== '-') {
      foot.appendChild(avatar(name, '担当者: ' + name));
    }
    var cls = inner ? inner.className : '';
    var prio = fieldValue(content, 'priority');
    var level = /\bpriority-(high\d*|highest)\b/.test(cls) ? 'high' : /\bpriority-(low\d*|lowest)\b/.test(cls) ? 'low' : 'normal';
    if (prio && prio !== '-') {
      var p = document.createElement('span');
      p.className = 'gb-card-prio';
      p.title = '優先度: ' + prio;
      p.textContent = prio;
      prioChip(p, level);
      foot.appendChild(p);
    }
    content.appendChild(foot);
  }

  // ---- column headers: status colour class + tidy add button ----
  function decorateHeaders(table) {
    var ths = table.querySelectorAll('thead tr:first-child th, tr:first-child > th');
    var ids = [];
    table.querySelectorAll('td[data-status-id]').forEach(function (td) {
      var sid = td.getAttribute('data-status-id');
      if (ids.indexOf(sid) === -1) ids.push(sid);
    });
    var offset = ths.length - ids.length;
    ids.forEach(function (sid, i) {
      var th = ths[i + offset];
      if (!th || th.dataset.gbCol) return;
      th.dataset.gbCol = '1';
      th.classList.add('gb-col-head', 'gb-col-st-' + sid);
      th.removeAttribute('style'); // older builds wrote the colour inline
      var add = th.querySelector('a.add-issue-card');
      if (add) {
        add.setAttribute('aria-label', '新しい課題');
        add.title = '新しい課題';
      }
    });
    table.classList.add('gb-board');
    table.classList.toggle('gb-board--many', ids.length >= 5);
    if (table.querySelector('tr.group')) table.classList.add('gb-board--grouped');
  }

  function headName(th) {
    return Array.prototype.filter.call(th.childNodes, function (n) { return n.nodeType === 3; })
      .map(function (n) { return n.nodeValue; }).join('').trim();
  }

  // ---- cell headings (status name + cards in this cell) ----
  // Shown only on phones in grouped mode, where every lane lists its statuses one under another (the column
  // header row is not shown there). Counts are refreshed on every pass, since drag & drop moves cards.
  function decorateCells(table) {
    var names = {};
    var ths = table.querySelectorAll('thead th.gb-col-head');
    Array.prototype.forEach.call(ths, function (th) {
      var st = th.className.match(/(?:^|\s)gb-col-st-(\d+)/);
      if (st) names[st[1]] = headName(th);
    });
    table.querySelectorAll('td.issue-card-receiver[data-status-id]').forEach(function (td) {
      var sid = td.getAttribute('data-status-id');
      td.classList.add('gb-col-st-' + sid);
      var n = td.querySelectorAll('.issue-cards > .issue-card:not(.add-issue-card)').length;
      var head = td.querySelector(':scope > .gb-cell-head');
      if (!head) {
        head = document.createElement('div');
        head.className = 'gb-cell-head';
        var name = document.createElement('span');
        name.className = 'gb-cell-head__name';
        var count = document.createElement('span');
        count.className = 'gb-cell-head__count';
        head.appendChild(name);
        head.appendChild(count);
        td.insertBefore(head, td.firstChild);
      }
      var label = names[sid] || '';
      if (head.firstChild.textContent !== label) head.firstChild.textContent = label;
      if (head.lastChild.textContent !== String(n)) head.lastChild.textContent = String(n);
    });
  }

  // ---- swimlanes (group_by): avatar in front of user names ----
  function decorateGroups(table) {
    table.querySelectorAll('tr.group > td').forEach(function (td) {
      if (td.dataset.gbGroup) return;
      td.dataset.gbGroup = '1';
      var name = td.querySelector('.name');
      var user = name && name.querySelector('a.user');
      if (user) {
        name.insertBefore(avatar(user.textContent.trim()), name.firstChild);
      } else if (name && groupBy() === 'assigned_to') {
        // unassigned lane: core prints "(空)"; use the cards' wording
        Array.prototype.forEach.call(name.childNodes, function (n) {
          if (n.nodeType === 3 && /[(（]\s*空\s*[)）]/.test(n.nodeValue)) {
            var t = document.createElement('span');
            t.className = 'gb-lane-empty';
            t.textContent = '担当者なし';
            name.replaceChild(t, n);
          }
        });
        // no placeholder circle in front: the issue list's group heading has none either
      }
      var exp = td.querySelector('.expander');
      if (exp && !exp.hasAttribute('role')) {
        exp.setAttribute('role', 'button');
        exp.setAttribute('tabindex', '0');
        exp.setAttribute('aria-label', '折りたたみ');
        exp.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); exp.click(); }
        });
      }
    });
  }

  // ---- new-card modal: wider dialog (DESIGN.md §2.16, 720px) ----
  // Keyboard order must match the visual order, so the subject row is moved to the top of the
  // attribute grid and the private flag to the end in the DOM (re-applied after the plugin re-renders
  // the form when プロジェクト / トラッカー changes).
  function orderModalFields(content) {
    var subject = content.querySelector('#issue_subject');
    var subjectP = subject && subject.closest('p');
    var grid = subjectP && subjectP.parentElement;
    if (!grid) return;
    if (grid.firstElementChild !== subjectP) grid.insertBefore(subjectP, grid.firstElementChild);
    var priv = grid.querySelector(':scope > #issue_is_private_wrap');
    if (priv && grid.lastElementChild !== priv) grid.appendChild(priv);
    // footer: キャンセル is shown left of 作成, so it comes first in the DOM too
    var buttons = content.querySelector('form > p.buttons');
    var submit = buttons && buttons.querySelector(':scope > input[type=submit]');
    var cancel = buttons && buttons.querySelector(':scope > a');
    if (submit && cancel && (submit.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      buttons.insertBefore(cancel, submit);
    }
    if (!subject.dataset.gbSubject) {
      subject.dataset.gbSubject = '1';
      var label = content.querySelector('label[for="issue_subject"]');
      var word = label ? label.textContent.replace(/[*＊\s]/g, '') : '';
      subject.setAttribute('placeholder', (word || '題名') + 'を入力');
      // the plugin posts to the full issue form on errors; catch the common empty-subject case here
      subject.setAttribute('required', 'required');
    }
  }

  // Same field decorations as the full issue form (55-issue-form.js), which leaves this dialog alone:
  // the status row carries data-status for its colour dot and the tracker row data-tracker for its
  // colour bar (the blank option 「未設定」 is C-form: js/15-c-form.js).
  function markSelectRow(select) {
    var row = select.closest('p');
    if (!row) return;
    row.setAttribute(select.id === 'issue_status_id' ? 'data-status' : 'data-tracker', select.value || '');
  }

  function decorateModalFields(content) {
    ['issue_status_id', 'issue_tracker_id'].forEach(function (id) {
      var select = content.querySelector('select#' + id);
      if (select) markSelectRow(select);
    });
  }

  // Tab from the last control wraps to the first one. jQuery UI's dialog does this too; this is a fallback
  // that only acts when focus did not move (e.g. its first :tabbable could not take focus).
  function tabbables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.tabIndex >= 0 && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden'; }
    );
  }

  function keepFocus(dlg, e) {
    if (e.key !== 'Tab') return;
    var list = tabbables(dlg);
    if (!list.length) return;
    var target = e.target;
    var edge = e.shiftKey ? list[0] : list[list.length - 1];
    if (target !== edge) return;
    var to = e.shiftKey ? list[list.length - 1] : (dlg.querySelector('#issue_subject') || list[0]);
    setTimeout(function () {
      if (document.activeElement === target || !dlg.contains(document.activeElement)) to.focus();
    }, 20);
  }

  function sizeModal() {
    var content = document.getElementById('new-issue-card-modal');
    if (!content || !window.jQuery) return;
    var $c = jQuery(content);
    if (!$c.hasClass('ui-dialog-content')) return;
    orderModalFields(content);
    decorateModalFields(content);
    if (content.dataset.gbModal) return;
    content.dataset.gbModal = '1';
    // the content element survives the plugin's form re-renders, so one delegated listener is enough
    content.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || t.tagName !== 'SELECT') return;
      if (t.id === 'issue_status_id' || t.id === 'issue_tracker_id') markSelectRow(t);
    });
    var dlg = content.closest('.ui-dialog');
    if (dlg) {
      dlg.classList.add('gb-card-modal');
      dlg.addEventListener('keydown', function (e) { keepFocus(dlg, e); });
    }
    try {
      $c.dialog('option', 'width', Math.min(720, window.innerWidth - 32));
      $c.dialog('option', 'position', { my: 'center', at: 'center', of: window });
    } catch (e) { /* dialog not ready; CSS still applies */ }
    var subject = content.querySelector('#issue_subject');
    if (subject) setTimeout(function () { subject.focus(); }, 0);
  }

  // ---- horizontal overflow cue: fade on the side that can still scroll ----
  function watchScroll(table) {
    var scroller = table.closest('.autoscroll');
    var form = scroller && scroller.parentElement;
    if (!scroller || !form || scroller.dataset.gbScroll) return;
    scroller.dataset.gbScroll = '1';
    form.classList.add('gb-board-frame');
    var update = function () {
      var max = scroller.scrollWidth - scroller.clientWidth;
      form.classList.toggle('gb-board-frame--more-left', scroller.scrollLeft > 2);
      form.classList.toggle('gb-board-frame--more-right', max - scroller.scrollLeft > 2);
    };
    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();

    // size the scroller to the space left below it, so its bottom edge and horizontal scrollbar are on screen
    // and the page itself does not scroll as well (one scrollbar, not two). --gb-board-after is the natural
    // space that follows the board (paddings, borders and margins of its ancestors plus the footer, which is
    // reserved too so the page fits the window exactly); it is summed from styles because #main is stretched
    // to the viewport and would report the stretch as space.
    var setVar = function (name, px) {
      var val = Math.max(0, Math.round(px)) + 'px';
      if (scroller.style.getPropertyValue(name) !== val) scroller.style.setProperty(name, val);
    };
    var num = function (v) { return parseFloat(v) || 0; };
    var trailing = function () {
      var sum = 0;
      for (var node = scroller; node && node !== document.body; node = node.parentElement) {
        var cs = getComputedStyle(node);
        if (cs.display !== 'inline') sum += num(cs.marginBottom);
        var bottom = node.getBoundingClientRect().bottom;
        for (var sib = node.nextElementSibling; sib; sib = sib.nextElementSibling) {
          var ss = getComputedStyle(sib);
          if (ss.display === 'none' || ss.position === 'absolute' || ss.position === 'fixed') continue;
          if (sib.getBoundingClientRect().top < bottom - 1) continue; // beside the board, not below it
          sum += sib.offsetHeight + num(ss.marginTop) + num(ss.marginBottom);
        }
        var parent = node.parentElement;
        if (parent && parent !== document.body) {
          var ps = getComputedStyle(parent);
          sum += num(ps.paddingBottom) + num(ps.borderBottomWidth);
        }
      }
      return sum;
    };
    var place = function () {
      setVar('--gb-board-top', scroller.getBoundingClientRect().top + window.scrollY);
      setVar('--gb-board-after', trailing());
      update();
    };
    var queued = false;
    var later = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; place(); });
    };
    window.addEventListener('resize', later);
    window.addEventListener('load', later);
    // filter / option sections toggle above the board
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#query_form legend, #query_form .toggle-multiselect, #query_form .add_filter, #query_form input[type=checkbox]')) {
        later();
        setTimeout(later, 250);
      }
    });
    document.addEventListener('change', function (e) {
      if (e.target.closest && e.target.closest('#query_form')) later();
    });
    if (window.ResizeObserver) {
      // anything above the board that changes height (filter card, project header row added by other
      // features, page header) changes the size of one of these
      var ro = new ResizeObserver(later);
      ['query_form', 'content', 'main', 'header', 'top-menu', 'wrapper'].forEach(function (idName) {
        var el = document.getElementById(idName);
        if (el) ro.observe(el);
      });
      Array.prototype.forEach.call(document.querySelectorAll('#content > *'), function (el) {
        if (el !== form && !el.contains(form)) ro.observe(el);
      });
    }
    place();
    later();
  }

  // ---- grouped: only the lane in view keeps its title pinned under the column headers ----
  // Every lane title used to be sticky on its own, so a lane that had scrolled away left its title pinned
  // right above the next lane's title (two titles, one of them for cards no longer shown). Now only the lane
  // crossing the header line is pinned, and the next title pushes it up and out as it arrives.
  var laneState = { table: null, raf: 0 };

  function updateLanes() {
    laneState.raf = 0;
    var table = laneState.table;
    if (!table || !table.isConnected) return;
    var scroller = table.closest('.autoscroll');
    if (!scroller) return;
    var rows = table.querySelectorAll(':scope > tbody > tr.group');
    var headH = table.tHead ? table.tHead.offsetHeight : 0;
    var base = scroller.getBoundingClientRect().top - scroller.scrollTop;
    var tops = Array.prototype.map.call(rows, function (tr) { return tr.getBoundingClientRect().top - base; });
    var line = scroller.scrollTop + headH;
    Array.prototype.forEach.call(rows, function (tr, i) {
      var td = tr.firstElementChild;
      if (!td) return;
      var next = i + 1 < tops.length ? tops[i + 1] : Infinity;
      var pinned = tops[i] <= line + 0.5 && next > line + 0.5;
      td.classList.toggle('gb-lane-pinned', pinned);
      if (pinned) {
        var top = Math.min(headH, next - scroller.scrollTop - td.offsetHeight);
        var val = Math.round(top) + 'px';
        if (td.style.getPropertyValue('--gb-lane-top') !== val) td.style.setProperty('--gb-lane-top', val);
      }
    });
  }

  function queueLanes() {
    if (!laneState.raf) laneState.raf = requestAnimationFrame(updateLanes);
  }

  function pinLanes(table) {
    if (!table.classList.contains('gb-board--grouped')) return;
    var scroller = table.closest('.autoscroll');
    if (!scroller) return;
    laneState.table = table;
    if (!scroller.dataset.gbLanes) {
      scroller.dataset.gbLanes = '1';
      scroller.addEventListener('scroll', queueLanes, { passive: true });
      window.addEventListener('resize', queueLanes);
      // a lane folded or unfolded moves every title below it
      table.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('tr.group .expander')) queueLanes();
      });
    }
    queueLanes();
  }

  // ---- phones: column headers stay readable while the page scrolls ----
  // On phones the page scrolls (not the board), so the real header row cannot be sticky inside the sideways
  // scroller. A copy of the header row is pinned under the top bar once the real one goes under it, and slides
  // sideways with the board, so the status of the column in view is always shown.
  var heads = null; // { bar, track, table, scroller }

  function topInset() {
    var bottom = 0;
    ['top-menu'].forEach(function (idName) {
      var el = document.getElementById(idName);
      if (!el) return;
      var pos = getComputedStyle(el).position;
      if (pos === 'sticky' || pos === 'fixed') bottom = Math.max(bottom, el.getBoundingClientRect().bottom);
    });
    return Math.max(0, Math.round(bottom));
  }

  function phoneQuery() { return window.matchMedia ? window.matchMedia('(max-width: 767px)') : null; }

  function syncHeads() {
    if (!heads) return;
    var mq = phoneQuery();
    var table = heads.table;
    if (!mq || !mq.matches || !table.isConnected || !table.tHead) {
      heads.bar.classList.remove('is-shown');
      return;
    }
    var top = topInset();
    var head = table.tHead.getBoundingClientRect();
    var rect = table.getBoundingClientRect();
    var show = head.top < top - 0.5 && rect.bottom > top + head.height + 24;
    heads.bar.style.setProperty('--gb-heads-top', top + 'px');
    heads.track.style.transform = 'translateX(' + (-heads.scroller.scrollLeft) + 'px)';
    heads.bar.classList.toggle('is-shown', show);
  }

  function buildHeads() {
    if (!heads) return;
    var track = heads.track;
    var table = heads.table;
    while (track.firstChild) track.removeChild(track.firstChild);
    track.style.width = table.offsetWidth + 'px';
    Array.prototype.forEach.call(table.querySelectorAll('thead th'), function (th) {
      var col = document.createElement('div');
      col.className = 'gb-board-heads__col';
      var st = th.className.match(/(?:^|\s)(gb-col-st-\d+)/);
      if (st) col.classList.add(st[1]);
      col.style.left = th.offsetLeft + 'px';
      col.style.width = th.offsetWidth + 'px';
      var name = document.createElement('span');
      name.className = 'gb-board-heads__name';
      name.textContent = Array.prototype.filter.call(th.childNodes, function (n) { return n.nodeType === 3; })
        .map(function (n) { return n.nodeValue; }).join('').trim();
      col.appendChild(name);
      var badge = th.querySelector('.badge-count');
      if (badge) {
        var count = document.createElement('span');
        count.className = 'gb-board-heads__count';
        count.textContent = badge.textContent.trim();
        col.appendChild(count);
      }
      track.appendChild(col);
    });
    syncHeads();
  }

  function phoneHeads(table) {
    var scroller = table.closest('.autoscroll');
    var form = scroller && scroller.parentElement;
    if (!scroller || !form) return;
    if (!heads || heads.table !== table) {
      var bar = form.querySelector(':scope > .gb-board-heads');
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'gb-board-heads';
        bar.setAttribute('aria-hidden', 'true'); // a visual copy; the real header row stays in the table
        var view = document.createElement('div');
        view.className = 'gb-board-heads__view';
        var track = document.createElement('div');
        track.className = 'gb-board-heads__track';
        view.appendChild(track);
        bar.appendChild(view);
        form.insertBefore(bar, scroller);
      }
      heads = { bar: bar, track: bar.querySelector('.gb-board-heads__track'), table: table, scroller: scroller };
      if (!scroller.dataset.gbHeads) {
        scroller.dataset.gbHeads = '1';
        scroller.addEventListener('scroll', syncHeads, { passive: true });
        // the columns are measured once the stylesheets have sized them (the first pass can run before that,
        // which left the copy with 85px columns far off to the left)
        if (window.ResizeObserver) new ResizeObserver(function () { requestAnimationFrame(buildHeads); }).observe(table);
        window.addEventListener('load', function () { requestAnimationFrame(buildHeads); });
      }
      if (!document.body.dataset.gbHeads) {
        document.body.dataset.gbHeads = '1';
        window.addEventListener('scroll', syncHeads, { passive: true });
        window.addEventListener('resize', function () { requestAnimationFrame(buildHeads); });
        var mq = phoneQuery();
        if (mq && mq.addEventListener) mq.addEventListener('change', buildHeads);
      }
    }
    buildHeads();
  }

  // ---- drag: dashed slot where the card was (the plugin moves the card itself, no placeholder element) ----
  function watchDrag() {
    if (document.body.dataset.gbDrag || !window.jQuery) return;
    document.body.dataset.gbDrag = '1';
    jQuery(document).on('dragstart.gbBoard', '.issue-card', function () {
      var card = this;
      var list = card.parentElement;
      if (!list || !list.classList.contains('issue-cards')) return;
      var old = list.querySelector(':scope > .gb-drag-ghost');
      if (old) old.remove();
      var ghost = document.createElement('div');
      ghost.className = 'gb-drag-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      // the card is position:relative; its slot is its offset minus any relative shift left from an earlier drag
      ghost.style.left = (card.offsetLeft - (parseFloat(card.style.left) || 0)) + 'px';
      ghost.style.top = (card.offsetTop - (parseFloat(card.style.top) || 0)) + 'px';
      ghost.style.width = card.offsetWidth + 'px';
      ghost.style.height = card.offsetHeight + 'px';
      list.appendChild(ghost);
    });
    jQuery(document).on('dragstop.gbBoard', '.issue-card', function () {
      document.querySelectorAll('.issue-cards > .gb-drag-ghost').forEach(function (g) { g.remove(); });
    });
  }

  // ---- description preview (subject hover): same key as the card, no empty divider when there is no text ----
  function decoratePreview() {
    var box = document.querySelector('#issue_panel_issue_description .issue');
    if (!box || box.dataset.gbPreview) return;
    box.dataset.gbPreview = '1';
    var link = box.querySelector('.subject a.issue');
    var m = link && link.textContent.trim().match(/^#(\d+)$/);
    if (m) {
      var card = document.querySelector('.issue-card[data-issue-id="' + m[1] + '"] .card-content');
      link.textContent = card ? issueKey(card, m[1]) : issueKey(document.body, m[1]);
      var next = link.nextSibling;
      if (next && next.nodeType === 3) next.nodeValue = next.nodeValue.replace(/^\s*:\s*/, ' ');
    }
    var wiki = box.querySelector('.description .wiki');
    var empty = !wiki || !wiki.textContent.trim() && !wiki.querySelector('img, table');
    // no description: CSS hides the whole box (it would only repeat the card's key and subject)
    box.classList.toggle('gb-preview--no-desc', empty);
    if (!empty && m) placePreview(box.parentElement, document.querySelector('.issue-card[data-issue-id="' + m[1] + '"]'));
  }

  // The plugin puts the preview 16px above the hovered subject and 90px left of it, which covers the card's own
  // first line (tracker, key) and the column to its left. It goes under the card instead, left edges aligned,
  // or above the card when there is no room below; never over the card itself.
  function placePreview(holder, card) {
    if (!holder || !card || !window.jQuery) return;
    var r = card.getBoundingClientRect();
    var w = holder.offsetWidth;
    var h = holder.offsetHeight;
    var gap = 8;
    var vw = document.documentElement.clientWidth;
    var vh = window.innerHeight;
    var left = Math.max(16, Math.min(r.left, vw - w - 16));
    var top = r.bottom + gap;
    if (top + h > vh - gap && r.top - gap - h >= gap) top = r.top - gap - h;
    jQuery(holder).offset({ left: left + window.scrollX, top: top + window.scrollY });
  }

  // the plugin fills the preview box outside jQuery's ajax events, so watch the box itself
  function watchPreview() {
    var holder = document.getElementById('issue_panel_issue_description');
    if (!holder || holder.dataset.gbWatch || !window.MutationObserver) return;
    holder.dataset.gbWatch = '1';
    new MutationObserver(decoratePreview).observe(holder, { childList: true });
    decoratePreview();
  }

  function run(root) {
    if (!isBoard()) return;
    (root || document).querySelectorAll('table.issues-panel').forEach(function (table) {
      decorateHeaders(table);
      decorateGroups(table);
      decorateCells(table);
      watchScroll(table);
      pinLanes(table);
      phoneHeads(table);
    });
    var cards = Array.prototype.slice.call(document.querySelectorAll('.issue-card[data-issue-id]'));
    // a card node that is new but whose issue was already decorated was re-rendered by AJAX
    // (e.g. a context-menu edit): drop its cached due date so the next batched lookup refreshes it
    cards.forEach(function (card) {
      if (card.dataset.gbCard) return;
      var id = card.getAttribute('data-issue-id');
      if (decorated[id]) { delete dueCache[id]; delete dueRequested[id]; }
      decorated[id] = true;
    });
    cards.forEach(decorateCard);
    loadDueDates(cards);
    watchPreview();
    sizeModal();
    watchDrag();
  }

  GB.onAjax(run);
})();

// === 65-wiki.js ===
// 65-wiki: wiki pages + rendered .wiki content (DESIGN.md §3.5).
// Progressive enhancement only: every decoration is idempotent (data-gbw-* guards) and re-run on AJAX.
(function () {
  var GB = window.GB || {};

  // JS fallback copy (locale request filed for each string).
  var T = {
    split: '並べて表示',
    splitTitle: 'エディタとプレビューを並べて表示',
    previewEmpty: 'プレビューする内容がありません。',
    previewBusy: '更新中…',
    commentsPh: '変更内容のメモ（任意）',
    toSave: 'で保存',
    pages: 'ページ',
    expand: '子ページを表示',
    collapse: '子ページを隠す',
    added: '追加',
    removed: '削除',
    cancel: 'キャンセル',
    sidebarEdit: 'サイドバーを編集',
    anchor: 'この見出しへのリンク',
    actions: '操作',
    revision: 'リビジョン',
    next: '次へ',
    newShort: '新規ページ',
    deleteWiki: 'Wikiを削除'
  };

  var LANGS = {
    js: 'JavaScript', javascript: 'JavaScript', ts: 'TypeScript', typescript: 'TypeScript', rb: 'Ruby', ruby: 'Ruby',
    py: 'Python', python: 'Python', sh: 'Shell', bash: 'Bash', shell: 'Shell', zsh: 'Shell', console: 'Console',
    html: 'HTML', xml: 'XML', css: 'CSS', scss: 'SCSS', sql: 'SQL', json: 'JSON', yaml: 'YAML', yml: 'YAML',
    java: 'Java', go: 'Go', php: 'PHP', c: 'C', cpp: 'C++', csharp: 'C#', cs: 'C#', diff: 'Diff', md: 'Markdown',
    markdown: 'Markdown', kotlin: 'Kotlin', swift: 'Swift', rust: 'Rust', erb: 'ERB', text: 'Text', plaintext: 'Text'
  };

  function once(el, key) {
    var attr = 'data-gbw-' + key;
    if (!el || el.hasAttribute(attr)) return false;
    el.setAttribute(attr, '1');
    return true;
  }
  function icon(id, cls) {
    return GB.icon ? GB.icon(id, cls || 'icon-svg') : null;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function avatar(name, size) {
    if (!GB.avatar || !name) return null;
    var a = GB.avatar(name, size);
    return a && a.nodeType === 1 ? a : null;
  }
  function decode(path) {
    try { return decodeURIComponent(path || ''); } catch (e) { return path || ''; }
  }
  function body() { return document.body ? document.body.classList : { contains: function () { return false; } }; }
  function isWiki() { return body().contains('controller-wiki'); }
  function action(name) { return body().contains('action-' + name); }

  /* ------------------------------------------------------------------
     Rendered prose, site-wide: code block language label + accessible copy button
     ------------------------------------------------------------------ */
  function langName(code) {
    var lang = code && code.getAttribute('data-language');
    if (!lang) return '';
    return LANGS[lang.toLowerCase()] || (lang.charAt(0).toUpperCase() + lang.slice(1));
  }
  function decorateProse(root) {
    root = root || document;
    // bare <pre> (live preview: core only wraps code blocks on page load)
    root.querySelectorAll('div.wiki pre > code[data-language]').forEach(function (code) {
      var pre = code.parentNode;
      if (pre.parentNode && pre.parentNode.classList && pre.parentNode.classList.contains('pre-wrapper')) return;
      if (pre.hasAttribute('data-gb-lang')) return;
      var name = langName(code);
      if (name) pre.setAttribute('data-gb-lang', name);
    });
    // tables scroll inside a wrapper (the table itself stays display:table, so a fitting table never scrolls)
    root.querySelectorAll('div.wiki table').forEach(function (t) {
      var parent = t.parentNode;
      if (!parent || (parent.classList && parent.classList.contains('gb-wiki-table-scroll'))) return;
      var wrap = el('div', 'gb-wiki-table-scroll');
      parent.insertBefore(wrap, t);
      wrap.appendChild(t);
    });
    root.querySelectorAll('div.wiki a.wiki-anchor').forEach(function (a) {
      if (!once(a, 'anc')) return;
      if (!a.getAttribute('aria-label')) a.setAttribute('aria-label', T.anchor);
      if (!a.title) a.title = T.anchor;
    });
    root.querySelectorAll('div.wiki div.pre-wrapper').forEach(function (w) {
      if (!once(w, 'pre')) return;
      var name = langName(w.querySelector('pre > code[data-language]'));
      if (name) w.setAttribute('data-gb-lang', name);
      var copy = w.querySelector('a.copy-pre-content-link');
      if (copy && !copy.hasAttribute('href')) {
        copy.setAttribute('role', 'button');
        copy.setAttribute('tabindex', '0');
        if (!copy.getAttribute('aria-label')) copy.setAttribute('aria-label', copy.getAttribute('title') || 'コピー');
        copy.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy.click(); }
        });
      }
    });
  }

  /* ------------------------------------------------------------------
     Breadcrumb / title separators: "A » B » " -> A › B
     ------------------------------------------------------------------ */
  function separators(container) {
    if (!container || !once(container, 'sep')) return;
    Array.prototype.slice.call(container.childNodes).forEach(function (n) {
      if (n.nodeType !== 3 || n.nodeValue.indexOf('»') < 0) return;
      var parts = n.nodeValue.split('»');
      var frag = document.createDocumentFragment();
      parts.forEach(function (p, i) {
        if (p.trim()) frag.appendChild(document.createTextNode(p.trim()));
        if (i < parts.length - 1) {
          var s = el('span', 'gb-wiki-crumb-sep', '›');
          s.setAttribute('aria-hidden', 'true');
          frag.appendChild(s);
        }
      });
      container.replaceChild(frag, n);
    });
  }

  /* ------------------------------------------------------------------
     Wiki page: section edit pencils live inside their heading
     ------------------------------------------------------------------ */
  function sectionEdits(root) {
    (root || document).querySelectorAll('div.wiki-page > .contextual[id^="section-"]').forEach(function (c) {
      if (!once(c, 'sedit')) return;
      var n = c.nextElementSibling;
      while (n && n.tagName === 'A' && n.hasAttribute('name')) n = n.nextElementSibling;
      if (n && /^H[1-6]$/.test(n.tagName)) {
        n.appendChild(c);
        n.classList.add('gb-wiki-has-sedit');
      }
    });
  }

  /* footer meta row: avatar + name + "…前に更新" + 履歴 link */
  function updateInfo() {
    var p = document.querySelector('#content > p.wiki-update-info');
    if (!p || !once(p, 'info')) return;
    var user = p.querySelector('a.user');
    if (user) {
      var av = avatar(user.textContent.trim(), 20);
      if (av) p.insertBefore(av, p.firstChild);
    }
    var hist = p.querySelector('a[href$="/history"]');
    if (hist) {
      hist.classList.add('gb-wiki-history-link');
      var ic = icon('history', 'icon-svg');
      if (ic) hist.insertBefore(ic, hist.firstChild);
      // drop the "·" text node in front of the history link
      var prev = hist.previousSibling;
      if (prev && prev.nodeType === 3 && prev.nodeValue.indexOf('·') >= 0) {
        prev.nodeValue = prev.nodeValue.replace('·', '');
      }
    }
    // text nodes become flex items: keep "さんが" glued to the time link
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && !n.nodeValue.trim()) p.removeChild(n);
    });
    var timeLink = user && user.nextSibling && user.nextSibling.nextSibling;
    if (user && timeLink && timeLink.tagName === 'A' && user.nextSibling.nodeType === 3) {
      var phrase = el('span', 'gb-wiki-info-phrase');
      var cur = user.nextSibling;
      while (cur && cur !== hist) {
        var next = cur.nextSibling;
        phrase.appendChild(cur);
        cur = next;
      }
      p.insertBefore(phrase, hist || null);
    }
  }

  /* ------------------------------------------------------------------
     Right sidebar: nav rows with icons + page tree fetched from the index
     ------------------------------------------------------------------ */
  function currentPagePath() {
    var a = document.querySelector('#content > .contextual a.icon-history, #content > .contextual a[href$="/history"]');
    if (a) return decode(a.pathname.replace(/\/history$/, ''));
    var e = document.querySelector('#content > .contextual a.icon-edit[href$="/edit"]');
    if (e) return decode(e.pathname.replace(/\/edit$/, ''));
    return decode(location.pathname.replace(/\/(\d+|edit|history|diff|annotate|rename)(\/.*)?$/, ''));
  }

  function sidebarNav() {
    var sb = document.getElementById('sidebar');
    if (!sb) return null;
    var idx = sb.querySelector('a[href$="/wiki/index"]');
    var ul = idx && idx.closest('ul');
    if (!ul) return null;
    if (once(ul, 'nav')) {
      ul.classList.add('gb-wiki-nav');
      var here = decode(location.pathname);
      ul.querySelectorAll('li > a').forEach(function (a) {
        var p = decode(a.pathname);
        var id = /\/wiki\/index$/.test(p) ? 'list' : /\/wiki\/date_index$/.test(p) ? 'history' : 'wiki-page';
        var ic = icon(id, 'icon-svg');
        if (ic) a.insertBefore(ic, a.firstChild);
        if (p === here) { a.classList.add('gb-current'); a.setAttribute('aria-current', 'page'); }
      });
    }
    return { sidebar: sb, nav: ul, indexUrl: idx.getAttribute('href') };
  }

  function toggleState(li, btn, open) {
    li.classList.toggle('gb-collapsed', !open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? T.collapse : T.expand);
  }

  // index page markup -> plain data: [{h: href, t: title, m: "…前に更新", c: [children]}]
  function treeData(srcUl) {
    var out = [];
    Array.prototype.forEach.call(srcUl.children, function (srcLi) {
      if (srcLi.tagName !== 'LI') return;
      var a = srcLi.querySelector(':scope > a');
      if (!a) return;
      var sub = srcLi.querySelector(':scope > ul');
      out.push({
        h: a.getAttribute('href'),
        t: a.getAttribute('data-gbw-label') || a.textContent.trim(),
        m: a.getAttribute('title') || '',
        c: sub ? treeData(sub) : []
      });
    });
    return out;
  }

  function buildTree(nodes, current, state, depth) {
    var ul = el('ul', 'gb-wiki-tree');
    nodes.forEach(function (n) {
      var hasKids = n.c && n.c.length > 0;
      state.count++;
      var li = el('li');
      var row = el('div', 'gb-wiki-tree-row');
      var btn = null;
      if (hasKids) {
        btn = el('button', 'gb-wiki-tree-toggle');
        btn.type = 'button';
        var chev = icon('angle-right', 'icon-svg');
        if (chev) btn.appendChild(chev);
        row.appendChild(btn);
      } else {
        row.appendChild(el('span', 'gb-wiki-tree-spacer'));
      }
      var a = el('a');
      a.href = n.h;
      if (n.m) a.title = n.m;
      var ic = icon(hasKids ? 'folder' : 'wiki-page', 'icon-svg');
      if (ic) a.appendChild(ic);
      a.appendChild(el('span', null, n.t));
      var isCurrent = decode(a.pathname) === current;
      if (isCurrent) {
        row.classList.add('gb-current');
        a.setAttribute('aria-current', 'page');
      }
      row.appendChild(a);
      li.appendChild(row);
      var subHasCurrent = false;
      if (hasKids) {
        var sub = buildTree(n.c, current, state, depth + 1);
        subHasCurrent = sub.hasAttribute('data-has-current');
        li.appendChild(sub);
        toggleState(li, btn, depth === 0 || isCurrent || subHasCurrent);
        btn.addEventListener('click', function () { toggleState(li, btn, li.classList.contains('gb-collapsed')); });
      }
      if (isCurrent || subHasCurrent) ul.setAttribute('data-has-current', '1');
      ul.appendChild(li);
    });
    return ul;
  }

  // sessionStorage cache: the tree renders synchronously on every wiki page after the first visit,
  // so the sidebar does not grow after load. A background fetch refreshes it when pages changed.
  var TREE_KEY = 'gb-wiki-tree:';
  function readTreeCache(url) {
    try {
      var v = sessionStorage.getItem(TREE_KEY + url);
      var d = v ? JSON.parse(v) : null;
      return Array.isArray(d) ? d : null;
    } catch (e) { return null; }
  }
  function writeTreeCache(url, data) {
    try { sessionStorage.setItem(TREE_KEY + url, JSON.stringify(data)); } catch (e) { /* storage unavailable */ }
  }

  function treeSection(data) {
    var state = { count: 0 };
    var tree = buildTree(data, currentPagePath(), state, 0);
    if (!state.count) return null;
    var section = el('div', 'gb-wiki-tree-section');
    var h3 = el('h3', null, T.pages);
    h3.appendChild(el('span', 'gb-wiki-tree-count', String(state.count)));
    section.appendChild(h3);
    var navEl = el('nav');
    navEl.setAttribute('aria-label', T.pages);
    navEl.appendChild(tree);
    section.appendChild(navEl);
    return section;
  }
  function skeletonSection() {
    var section = el('div', 'gb-wiki-tree-section gb-wiki-tree-skeleton');
    section.setAttribute('aria-hidden', 'true');
    section.appendChild(el('h3', null, T.pages));
    var box = el('div', 'gb-wiki-tree-skel');
    for (var i = 0; i < 6; i++) box.appendChild(el('span'));
    section.appendChild(box);
    return section;
  }

  // page meta ("…前に更新") by path, shared with the date index rows
  var treeMeta = {};
  function indexMeta(data) {
    data.forEach(function (n) {
      var a = document.createElement('a');
      a.href = n.h;
      if (n.m) treeMeta[decode(a.pathname)] = n.m;
      if (n.c) indexMeta(n.c);
    });
    dateIndexMeta();
  }

  function pageTree() {
    var nav = sidebarNav();
    if (!nav) return;
    if (!once(nav.sidebar, 'tree')) return;
    var url = nav.indexUrl;
    var slot = null;
    function show(data, cache) {
      var section = data && data.length ? treeSection(data) : null;
      if (cache && data) writeTreeCache(url, data);
      if (data) indexMeta(data);
      if (slot && slot.parentNode) {
        if (section) slot.parentNode.replaceChild(section, slot);
        else slot.parentNode.removeChild(slot);
      } else if (section) {
        nav.nav.parentNode.insertBefore(section, nav.nav.nextSibling);
      }
      slot = section;
    }
    // name index: the page itself is the source of truth
    var own = action('index') && document.querySelector('#content > ul.pages-hierarchy');
    if (own) { show(treeData(own), true); return; }
    var cached = readTreeCache(url);
    if (cached) {
      show(cached, false);
    } else {
      slot = skeletonSection();
      nav.nav.parentNode.insertBefore(slot, nav.nav.nextSibling);
    }
    if (!window.fetch || !window.DOMParser) { if (!cached) show(null, false); return; }
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        var root = html && new DOMParser().parseFromString(html, 'text/html').querySelector('#content > ul.pages-hierarchy');
        var data = root ? treeData(root) : (html ? [] : null);
        if (data === null) { if (!cached) show(null, false); return; }
        if (cached && JSON.stringify(cached) === JSON.stringify(data)) return;
        show(data, true);
      })
      .catch(function () { if (!cached) show(null, false); });
  }

  // date index rows: same "…前に更新" meta as the name index
  function dateIndexMeta() {
    if (!action('date_index')) return;
    document.querySelectorAll('#content > ul > li > a').forEach(function (a) {
      var m = treeMeta[decode(a.pathname)];
      if (!m) return;
      var span = a.querySelector(':scope > .gb-wiki-row-meta');
      if (!span) { span = el('span', 'gb-wiki-row-meta'); a.appendChild(span); }
      span.textContent = m;
    });
  }

  // annotate title uses core's label_version (overridden to マイルストーン site-wide): say リビジョン like show/diff
  function annotateTitle(content) {
    if (!action('annotate')) return;
    var h2 = content.querySelector(':scope > h2');
    if (!h2 || !once(h2, 'atitle')) return;
    var last = h2.lastChild;
    while (last && last.nodeType === 1 && last.classList.contains('gb-wiki-crumb-sep')) last = last.previousSibling;
    if (!last || last.nodeType !== 3) return;
    var m = last.nodeValue.match(/^(\s*)(\S+)(\s+\d+\s*)$/);
    if (!m) return;
    last.nodeValue = m[1] + T.revision + m[3];
    var label = m[2] + ' ' + m[3].trim();
    if (document.title.indexOf(label) === 0) document.title = T.revision + ' ' + m[3].trim() + document.title.slice(label.length);
  }

  /* ------------------------------------------------------------------
     Index pages: icons + "…前に更新" meta on the right
     ------------------------------------------------------------------ */
  function indexPages() {
    document.querySelectorAll('#content ul.pages-hierarchy > li > a').forEach(function (a) {
      if (!once(a, 'idx')) return;
      var hasKids = !!a.parentNode.querySelector(':scope > ul');
      var label = el('span', null, a.textContent.trim());
      a.setAttribute('data-gbw-label', label.textContent);
      a.textContent = '';
      var ic = icon(hasKids ? 'folder' : 'wiki-page', 'icon-svg');
      if (ic) a.appendChild(ic);
      a.appendChild(label);
      if (a.title) a.appendChild(el('span', 'gb-wiki-row-meta', a.title));
    });
    if (action('date_index')) {
      document.querySelectorAll('#content > ul > li > a').forEach(function (a) {
        if (!once(a, 'didx')) return;
        var ic = icon('wiki-page', 'icon-svg');
        if (ic) a.insertBefore(ic, a.firstChild);
      });
      dateIndexMeta();
    }
  }

  // index / date index: wiki-wide 削除 goes into a '…' menu, like the page view
  function indexActions() {
    if (!action('index') && !action('date_index')) return;
    var bar = document.querySelector('#content > .contextual');
    // phones: the primary button gets a short label so the actions share the title row
    var add = bar && bar.querySelector(':scope > a.icon-add > .icon-label');
    if (add && once(add.parentNode, 'short')) {
      add.classList.add('gb-wiki-label-full');
      add.parentNode.appendChild(el('span', 'icon-label gb-wiki-label-short', T.newShort));
    }
    var del = bar && bar.querySelector(':scope > a.icon-del');
    if (!del || bar.querySelector(':scope > .drdn') || !once(bar, 'idxmenu')) return;
    var drdn = el('span', 'drdn');
    var trig = el('span', 'drdn-trigger');
    var ico = el('span', 'icon-only icon-actions');
    ico.title = T.actions;
    var svg = icon('3-bullets', 's18 icon-svg');
    if (svg) ico.appendChild(svg);
    ico.appendChild(el('span', 'icon-label', T.actions));
    trig.appendChild(ico);
    trig.setAttribute('role', 'button');
    trig.setAttribute('tabindex', '0');
    trig.setAttribute('aria-haspopup', 'true');
    trig.setAttribute('aria-label', T.actions);
    trig.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trig.click(); }
    });
    var content = el('div', 'drdn-content');
    var items = el('div', 'drdn-items');
    content.appendChild(items);
    drdn.appendChild(trig);
    drdn.appendChild(content);
    bar.appendChild(drdn);
    // the only item deletes the whole wiki (not a page): say so, unlike the page view's 削除
    var delLabel = del.querySelector('.icon-label');
    if (/\/wiki\/destroy(?:$|[?#])/.test(del.getAttribute('href') || '')) {
      if (delLabel) delLabel.textContent = T.deleteWiki;
      else del.appendChild(document.createTextNode(T.deleteWiki));
    }
    items.appendChild(del);
  }

  /* ------------------------------------------------------------------
     History: avatars in the author column
     ------------------------------------------------------------------ */
  function historyTable() {
    document.querySelectorAll('table.wiki-page-versions td.author').forEach(function (td) {
      if (!once(td, 'av')) return;
      var u = td.querySelector('a.user') || td;
      var name = u.textContent.trim();
      var av = avatar(name, 20);
      if (av) td.insertBefore(av, td.firstChild);
    });
  }

  /* ------------------------------------------------------------------
     Diff: "リビジョン 1 (…) → リビジョン 2/2 (…)" as two chips + legend
     ------------------------------------------------------------------ */
  function diffHeader() {
    var p = document.querySelector('#content > h2 + p');
    var diff = document.querySelector('#content pre.text-diff');
    if (!p || !diff || !once(p, 'diff')) return;
    var nodes = Array.prototype.slice.call(p.childNodes);
    var arrowAt = -1;
    nodes.forEach(function (n, i) { if (arrowAt < 0 && n.nodeType === 3 && n.nodeValue.indexOf('→') >= 0) arrowAt = i; });
    if (arrowAt < 0) return;
    // the arrow shares its text node with the next label ("→ リビジョン "): split it
    var parts = nodes[arrowAt].nodeValue.split('→');
    nodes.splice(arrowAt, 1, document.createTextNode(parts[0]), document.createTextNode(''),
      document.createTextNode(parts.slice(1).join('→')));
    arrowAt += 1;
    function chip(list, kind) {
      var c = el('span', 'gb-wiki-rev gb-wiki-rev--' + kind);
      var key = el('span', 'gb-wiki-rev-key');
      var meta = null;
      list.forEach(function (n) {
        if (n.nodeType === 1 && n.tagName === 'EM') {
          meta = n;
        } else if (n.nodeType === 3) {
          var t = n.nodeValue.replace(/\s+/g, ' ');
          if (t.trim()) key.appendChild(document.createTextNode(t));
        } else {
          key.appendChild(n);
        }
      });
      c.appendChild(key);
      if (meta) c.appendChild(byline(meta));
      return c;
    }
    var from = chip(nodes.slice(0, arrowAt), 'from');
    var to = chip(nodes.slice(arrowAt + 1), 'to');
    // core prints "リビジョン 1 → リビジョン 2/2": give both chips the n/total form (as the old version view does)
    var total = /\/\s*(\d+)\s*$/.exec(to.querySelector('.gb-wiki-rev-key').textContent);
    var fromKey = from.querySelector('.gb-wiki-rev-key');
    if (total && fromKey.textContent.indexOf('/') < 0) fromKey.appendChild(document.createTextNode('/' + total[1]));
    p.textContent = '';
    p.appendChild(from);
    var arrow = el('span', 'gb-wiki-rev-arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    p.appendChild(arrow);
    p.appendChild(to);
    var legend = el('div', 'gb-wiki-diff-legend');
    var add = el('span', 'is-in'); add.appendChild(el('i')); add.appendChild(document.createTextNode(T.added));
    var del = el('span', 'is-out'); del.appendChild(el('i')); del.appendChild(document.createTextNode(T.removed));
    legend.appendChild(add);
    legend.appendChild(del);
    diff.parentNode.insertBefore(legend, diff);
  }

  // diff body: core joins words with ' ', so every line after the first starts with a space and ends
  // with one (" \n 2. …"). Drop the spaces next to line breaks (also across <span class=diff_in/out>
  // boundaries) and move a change's leading / trailing line breaks outside its highlight.
  function diffText() {
    var pre = document.querySelector('#content pre.text-diff');
    if (!pre || !once(pre, 'dtext')) return;
    pre.querySelectorAll('span.diff_in, span.diff_out').forEach(function (span) {
      var first = span.firstChild;
      var lead = first && first.nodeType === 3 && /^\s*\n/.exec(first.nodeValue);
      if (lead) {
        first.nodeValue = first.nodeValue.slice(lead[0].length);
        span.parentNode.insertBefore(document.createTextNode(lead[0]), span);
      }
      var last = span.lastChild;
      var trail = last && last.nodeType === 3 && /\n\s*$/.exec(last.nodeValue);
      if (trail) {
        last.nodeValue = last.nodeValue.slice(0, trail.index);
        span.parentNode.insertBefore(document.createTextNode(trail[0]), span.nextSibling);
      }
    });
    var walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    var texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(function (t) { t.nodeValue = t.nodeValue.replace(/[ \t]*\n[ \t]*/g, '\n'); });
    texts.forEach(function (t, i) {
      var next = texts[i + 1];
      var prev = texts[i - 1];
      if (!next || next.nodeValue.charAt(0) === '\n') t.nodeValue = t.nodeValue.replace(/[ \t]+$/, '');
      if (!prev || /\n$/.test(prev.nodeValue)) t.nodeValue = t.nodeValue.replace(/^[ \t]+/, '');
    });
    // no blank first / last line
    for (var i = 0; i < texts.length && !texts[i].nodeValue.trim(); i++) texts[i].nodeValue = '';
    if (texts[i]) texts[i].nodeValue = texts[i].nodeValue.replace(/^\s+/, '');
    for (var j = texts.length - 1; j >= 0 && !texts[j].nodeValue.trim(); j--) texts[j].nodeValue = '';
    if (texts[j]) texts[j].nodeValue = texts[j].nodeValue.replace(/\s+$/, '');
  }

  /* ------------------------------------------------------------------
     Edit form: labels, placeholder, keyboard hint, split live preview
     ------------------------------------------------------------------ */
  function labelFor(form) {
    form.querySelectorAll('.tabular p > label:not([for])').forEach(function (l) {
      var c = l.parentNode.querySelector('input:not([type=hidden]), select, textarea');
      if (c && c.id) l.htmlFor = c.id;
    });
  }

  function kbdHint(form) {
    var row = form.querySelector(':scope > p > input[type=submit]');
    row = row && row.parentNode;
    if (!row || !once(row, 'kbd')) return;
    var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
    var hint = el('span', 'gb-wiki-kbd-hint');
    hint.appendChild(el('kbd', null, mac ? '⌘' : 'Ctrl'));
    hint.appendChild(document.createTextNode('+'));
    hint.appendChild(el('kbd', null, 'Enter'));
    hint.appendChild(document.createTextNode(' ' + T.toSave));
    row.appendChild(hint);
  }

  var SPLIT_KEY = 'gb-wiki-split';
  function splitPref() {
    try {
      var v = localStorage.getItem(SPLIT_KEY);
      if (v === '1') return true;
      if (v === '0') return false;
    } catch (e) { /* storage unavailable */ }
    return window.innerWidth >= 1200;
  }
  function saveSplitPref(on) {
    try { localStorage.setItem(SPLIT_KEY, on ? '1' : '0'); } catch (e) { /* ignore */ }
  }

  function splitPreview(form) {
    var block = form.querySelector('.jstBlock');
    if (!block || !window.jQuery) return;
    var ul = block.querySelector('.jstTabs ul');
    var pTab = block.querySelector('a.tab-preview');
    var eTab = block.querySelector('a.tab-edit');
    var ta = block.querySelector('textarea.wiki-edit');
    var pv = block.querySelector('.wiki-preview');
    var url = pTab && pTab.getAttribute('data-url');
    if (!ul || !pTab || !eTab || !ta || !pv || !url || !once(block, 'split')) return;

    var li = el('li', 'gb-wiki-split-item');
    var btn = el('button', 'gb-wiki-split-toggle');
    btn.type = 'button';
    btn.title = T.splitTitle;
    btn.setAttribute('aria-pressed', 'false');
    btn.appendChild(el('span', 'gb-wiki-split-icon'));
    btn.appendChild(el('span', null, T.split));
    li.appendChild(btn);
    ul.appendChild(li);

    var status = el('span', 'gb-wiki-preview-status', T.previewBusy);
    status.setAttribute('aria-hidden', 'true');
    var timer = null, lastSent = null, xhr = null;

    function on() { return block.classList.contains('gb-wiki-split'); }
    // split on: Tab goes textarea -> 親ページ -> コメント -> 保存 (preview links are mouse-only).
    // プレビュー tab: only heading ¶ anchors and task checkboxes leave the Tab order; real links stay.
    var DECOR = 'a.wiki-anchor, input.task-list-item-checkbox, input[type=checkbox][disabled]';
    function untabbable() {
      pv.querySelectorAll(on() ? 'a[href], button, input, select, textarea, [tabindex]' : DECOR).forEach(function (f) {
        if (f.getAttribute('tabindex') === '-1') return;
        f.setAttribute('data-gbw-tab', f.getAttribute('tabindex') || '');
        f.setAttribute('tabindex', '-1');
      });
    }
    function retabbable() {
      pv.querySelectorAll('[data-gbw-tab]').forEach(function (f) {
        var v = f.getAttribute('data-gbw-tab');
        if (v) f.setAttribute('tabindex', v); else f.removeAttribute('tabindex');
        f.removeAttribute('data-gbw-tab');
      });
    }
    function render(force) {
      var text = ta.value;
      if (!force && text === lastSent) return;
      lastSent = text;
      if (!text.trim()) {
        pv.innerHTML = '';
        pv.appendChild(el('p', 'gb-wiki-preview-empty', T.previewEmpty));
        return;
      }
      if (xhr && xhr.abort) xhr.abort();
      pv.insertBefore(status, pv.firstChild);
      status.classList.add('is-busy');
      var params = jQuery(form).find('.attachments_fields input, [data-preview-param]').serialize();
      xhr = jQuery.ajax({
        url: url,
        type: 'post',
        data: 'text=' + encodeURIComponent(text) + (params ? '&' + params : ''),
        success: function (data) {
          var top = pv.scrollTop;
          pv.innerHTML = data;
          pv.scrollTop = top;
          if (typeof window.setupWikiTableSortableHeader === 'function') {
            try { window.setupWikiTableSortableHeader(); } catch (e) { /* ignore */ }
          }
          decorateProse(pv.parentNode);
          untabbable();
          syncNow();
        },
        complete: function () { status.classList.remove('is-busy'); }
      });
    }
    function setSplit(state, persist) {
      if (state && pTab.classList.contains('selected')) eTab.click();
      block.classList.toggle('gb-wiki-split', state);
      btn.setAttribute('aria-pressed', String(state));
      if (state) { lastSent = null; render(true); }
      else { retabbable(); pv.innerHTML = ''; pv.scrollTop = 0; }
      if (persist) saveSplitPref(state);
    }
    btn.addEventListener('click', function () { setSplit(!on(), true); });
    ta.addEventListener('input', function () {
      if (!on()) return;
      clearTimeout(timer);
      timer = setTimeout(render, 450);
    });
    // editor -> preview proportional scroll sync. rAF-throttled, with a timer fallback because some
    // embedded/background renderers deliver scroll events late; wheel/keys/pointer settle a few times.
    function syncNow() {
      if (!on()) return;
      var max = ta.scrollHeight - ta.clientHeight;
      var ratio = max > 0 ? Math.min(1, ta.scrollTop / max) : 0;
      var range = pv.scrollHeight - pv.clientHeight;
      if (range > 0) pv.scrollTop = Math.round(ratio * range);
    }
    var syncPending = false;
    function scheduleSync() {
      if (syncPending || !on()) return;
      syncPending = true;
      var done = false;
      function go() {
        if (done) return;
        done = true;
        syncPending = false;
        syncNow();
      }
      if (window.requestAnimationFrame) window.requestAnimationFrame(go);
      setTimeout(go, 50);
    }
    function settleSync() {
      if (!on()) return;
      scheduleSync();
      setTimeout(scheduleSync, 150);
      setTimeout(scheduleSync, 400);
    }
    ta.addEventListener('scroll', scheduleSync, { passive: true });
    ['wheel', 'touchmove', 'keyup', 'mouseup', 'select'].forEach(function (ev) {
      ta.addEventListener(ev, settleSync, { passive: true });
    });
    // switching to the preview tab while split is on is not possible (tab hidden); keep state sane anyway
    pTab.addEventListener('click', function () { if (on()) setSplit(false, false); });
    if (window.MutationObserver) {
      new MutationObserver(function () { if (!on()) untabbable(); }).observe(pv, { childList: true });
    }
    if (splitPref() && window.matchMedia('(min-width: 1024px)').matches) setSplit(true, false);
  }

  function editForm() {
    var form = document.getElementById('wiki_form');
    if (!form || !once(form, 'form')) return;
    labelFor(form);
    var c = document.getElementById('content_comments');
    if (c && !c.getAttribute('placeholder')) c.setAttribute('placeholder', T.commentsPh);
    kbdHint(form);
    splitPreview(form);
  }

  function otherForms(root) {
    (root || document).querySelectorAll('form#new_page, form#edit_wiki_page').forEach(function (f) {
      if (!once(f, 'form')) return;
      labelFor(f);
      var t = f.querySelector('#page_title');
      if (t && !t.value && !f.closest('#ajax-modal')) t.focus();
      if (!f.closest('#ajax-modal')) formActions(f);
    });
  }

  // full-page new / rename: [submit] キャンセル (the modal and the edit form already have one)
  function formActions(f) {
    var submit = f.querySelector(':scope > input[type=submit]');
    if (!submit || f.querySelector('.gb-wiki-form-actions')) return;
    var back = f.id === 'edit_wiki_page'
      ? location.pathname.replace(/\/rename$/, '')
      : location.pathname.replace(/\/new$/, '');
    var row = el('p', 'gb-wiki-form-actions');
    submit.parentNode.insertBefore(row, submit);
    row.appendChild(submit);
    var a = el('a', 'gb-wiki-cancel', T.cancel);
    a.href = back;
    row.appendChild(a);
  }

  // rename page: 「ページ名 › 名前変更」 (label taken from the submit button, i.e. core's locale)
  function renameTitle(content) {
    if (!action('rename')) return;
    var h2 = content.querySelector(':scope > h2');
    var submit = content.querySelector('form#edit_wiki_page input[type=submit]');
    if (!h2 || !submit || !submit.value || !once(h2, 'rtitle')) return;
    var name = h2.textContent.trim();
    if (name) {
      var link = el('a', null, name);
      link.href = location.pathname.replace(/\/rename$/, '');
      h2.textContent = '';
      h2.appendChild(link);
    }
    var sep = el('span', 'gb-wiki-crumb-sep', '›');
    sep.setAttribute('aria-hidden', 'true');
    h2.appendChild(sep);
    h2.appendChild(el('span', 'gb-wiki-title-action', submit.value));
  }

  // sidebar 「編集」 is an icon-only button: give it a clear accessible name
  function sidebarEditLink() {
    var a = document.querySelector('#sidebar-wrapper > .contextual > a.icon-edit[href$="/sidebar/edit"]');
    if (!a || !once(a, 'sbedit')) return;
    a.setAttribute('aria-label', T.sidebarEdit);
    a.title = T.sidebarEdit;
  }

  /* ------------------------------------------------------------------
     Round 2 polish
     ------------------------------------------------------------------ */
  // "ウォッチャー (0)" / "ファイル (0)" -> label + count pill (same look as the ページ count)
  function countPill(node) {
    if (!node || !once(node, 'cnt')) return;
    Array.prototype.slice.call(node.childNodes).forEach(function (n) {
      if (n.nodeType !== 3) return;
      var m = n.nodeValue.match(/^([\s\S]*?)\s*\((\d+)\)\s*$/);
      if (!m) return;
      n.nodeValue = m[1];
      node.insertBefore(el('span', 'gb-wiki-count', m[2]), n.nextSibling);
    });
  }
  function counts() {
    countPill(document.querySelector('#sidebar #watchers h3'));
    countPill(document.querySelector('#content > fieldset.collapsible > legend'));
  }

  // revision by-line shared by the old version view, diff and annotate:
  // <em>(user, date)</em> -> [20px avatar] name (600) date (--gb-text-2), no comma
  function byline(em) {
    var by = el('span', 'gb-wiki-by');
    var user = em.querySelector('a.user');
    var text = em.textContent.replace(/^\s*\(|\)\s*$/g, '').replace(/\s+/g, ' ').trim();
    var name, rest;
    if (user) {
      name = user.textContent.trim();
      rest = text.slice(text.indexOf(name) + name.length);
    } else {
      var cut = text.lastIndexOf(',');
      name = cut >= 0 ? text.slice(0, cut).trim() : '';
      rest = cut >= 0 ? text.slice(cut + 1) : text;
    }
    rest = rest.replace(/^\s*,\s*/, '').trim();
    var av = avatar(name, 20);
    if (av) by.appendChild(av);
    if (user) { user.classList.add('gb-wiki-by-name'); by.appendChild(user); }
    else if (name) by.appendChild(el('span', 'gb-wiki-by-name', name));
    if (rest) by.appendChild(el('span', 'gb-wiki-by-date', rest));
    return by;
  }

  // annotate: <p><em>user, date</em><br>comment</p> -> by-line, comment on the next row
  function annotateInfo(content) {
    if (!action('annotate')) return;
    var p = content.querySelector(':scope > h2 + p');
    var em = p && p.querySelector(':scope > em');
    if (!em || !once(p, 'ainfo')) return;
    var note = Array.prototype.slice.call(p.childNodes).filter(function (n) { return n !== em; })
      .map(function (n) { return n.textContent; }).join(' ').replace(/\s+/g, ' ').trim();
    var by = byline(em);
    p.textContent = '';
    p.classList.add('gb-wiki-revinfo');
    var n = /\/(\d+)\/annotate\/?$/.exec(location.pathname);
    if (n) {
      // same 「リビジョン n/総数」 head as the old version view; the total comes from the history page
      var head = el('span', 'gb-wiki-oldrev-head');
      var key = el('span', 'gb-wiki-rev-key', T.revision + ' ' + n[1]);
      head.appendChild(key);
      p.appendChild(head);
      revisionTotal(function (total) {
        if (total && total >= +n[1]) key.textContent = T.revision + ' ' + n[1] + '/' + total;
      });
    }
    p.appendChild(by);
    if (note) p.appendChild(el('span', 'gb-wiki-oldrev-note', note));
  }
  // latest revision number of the current page (history lists newest first)
  function revisionTotal(done) {
    if (!window.fetch || !window.DOMParser) return;
    var url = location.pathname.replace(/\/\d+\/annotate\/?$/, '/history');
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var max = 0;
        doc.querySelectorAll('table.wiki-page-versions td.id a').forEach(function (a) {
          var v = parseInt(a.textContent, 10);
          if (v > max) max = v;
        });
        done(max);
      })
      .catch(function () {});
  }

  // page 「…」 menu: create / browse / change first, destructive 削除 last after a divider
  function actionMenu(content) {
    if (!action('show')) return;
    var items = content.querySelector(':scope > .contextual .drdn-items');
    if (!items || !once(items, 'order')) return;
    var order = ['a.icon-add', 'a.icon-history', 'a.icon-move', 'a.icon-lock, a.icon-unlock'];
    order.forEach(function (sel) {
      var a = items.querySelector(':scope > ' + sel.split(', ').join(', :scope > '));
      if (a) items.appendChild(a);
    });
    var del = items.querySelector(':scope > a.icon-del');
    if (!del) return;
    // anything not listed above stays before the divider
    if (del.previousElementSibling || del.nextElementSibling) {
      var sep = el('span', 'gb-wiki-menu-sep');
      sep.setAttribute('role', 'separator');
      items.appendChild(sep);
    }
    items.appendChild(del);
  }

  // new page: 「次」 -> 「次へ」 (core's label_next is shared with pagination, so only this button)
  function newPageButton(root) {
    (root || document).querySelectorAll('form#new_page input[type=submit]').forEach(function (b) {
      if (!once(b, 'next')) return;
      if (b.value.trim() === '次') b.value = T.next;
    });
  }

  // old version view: "リビジョン 1/2 | 次 » <br> <em>user, date</em> <br> comment" -> label + nav buttons / by-line / note
  function oldRevision(content) {
    if (!action('show')) return;
    var p = content.querySelector(':scope > h2 + p');
    if (!p || !p.nextElementSibling || p.nextElementSibling.tagName !== 'HR') return;
    if (!once(p, 'oldrev')) return;
    var segs = [[]];
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'BR') segs.push([]);
      else segs[segs.length - 1].push(n);
    });
    var head = el('span', 'gb-wiki-oldrev-head');
    var label = el('span', 'gb-wiki-rev-key');
    var nav = el('span', 'gb-wiki-oldrev-nav');
    segs[0].forEach(function (n) {
      if (n.nodeType === 3) {
        var t = n.nodeValue.replace(/[|()«»\-–]/g, ' ').replace(/\s+/g, ' ').trim();
        if (t) label.appendChild(document.createTextNode((label.textContent ? ' ' : '') + t));
      } else if (n.nodeType === 1 && n.tagName === 'A') {
        var txt = n.textContent;
        var prev = txt.indexOf('«') >= 0;
        var next = txt.indexOf('»') >= 0;
        n.textContent = txt.replace(/[«»]/g, '').trim();
        var ic = prev ? icon('angle-left', 'icon-svg') : next ? icon('angle-right', 'icon-svg') : null;
        if (ic) { if (prev) n.insertBefore(ic, n.firstChild); else n.appendChild(ic); }
        nav.appendChild(n);
      }
    });
    head.appendChild(label);
    if (nav.childNodes.length) head.appendChild(nav);
    var by = el('span', 'gb-wiki-oldrev-by');
    (segs[1] || []).forEach(function (n) {
      if (n.nodeType === 1 && n.tagName === 'EM') {
        by = byline(n);
        by.classList.add('gb-wiki-oldrev-by');
      } else if (n.nodeType === 1) {
        by.appendChild(n);
      } else if (n.nodeValue.trim()) {
        by.appendChild(document.createTextNode(n.nodeValue.trim()));
      }
    });
    var noteText = segs.slice(2).map(function (seg) {
      return seg.map(function (n) { return n.textContent; }).join('');
    }).join(' ').trim();
    p.textContent = '';
    p.classList.add('gb-wiki-oldrev');
    p.appendChild(head);
    if (by.childNodes.length) p.appendChild(by);
    if (noteText) p.appendChild(el('span', 'gb-wiki-oldrev-note', noteText));
  }

  // history: アノテート gets an icon like its neighbour 削除
  function historyButtons() {
    document.querySelectorAll('table.wiki-page-versions td.buttons a[href$="/annotate"]').forEach(function (a) {
      if (!once(a, 'ann')) return;
      var ic = icon('list', 'icon-svg');
      if (ic) a.insertBefore(ic, a.firstChild);
    });
  }

  // (editor auto-height → js/15-c-editor.js)

  /* ------------------------------------------------------------------ */
  function run(root) {
    decorateProse(root && root.querySelectorAll ? root : document);
    if (!isWiki()) return;
    var content = document.getElementById('content');
    if (!content) return;
    separators(content.querySelector(':scope > p.breadcrumb'));
    separators(content.querySelector(':scope > h2'));
    renameTitle(content);
    annotateTitle(content);
    sidebarEditLink();
    sectionEdits(content);
    updateInfo();
    pageTree();
    indexPages();
    indexActions();
    historyTable();
    historyButtons();
    oldRevision(content);
    annotateInfo(content);
    actionMenu(content);
    newPageButton(document);
    counts();
    if (action('diff')) { diffHeader(); diffText(); }
    editForm();
    otherForms(document);
  }

  if (GB.ready) GB.ready(function () { run(document); });
  if (GB.onAjax) GB.onAjax(function () { run(document); });
})();

// === 66-docs-files-news-forums.js ===
// 66-docs-files-news-forums: 文書 / ファイル / ニュース / フォーラム decorations.
// Progressive enhancement only: moves/annotates existing nodes, never re-creates form controls.
(function () {
  var GB = window.GB;
  if (!GB) return;

  // Fallback UI strings (Redmine has no client-side i18n; see report "requests").
  var T = {
    readMore: '続きを読む',
    writeComment: 'コメントを追加…',
    writeReply: '返答を書く…',
    replyPanel: '返答を書く',
    commentPanel: 'コメントを追加',
    milestone: 'マイルストーン',
    cancel: 'キャンセル',
    close: '閉じる',
    forums: 'フォーラム',
    sticky: 'スティッキー',
    locked: 'ロック',
    dropText: 'ファイルをドラッグ＆ドロップ、または',
    dropButton: 'ファイルを選択',
    editNews: 'ニュースの編集',
    editDocument: '文書の編集',
    editMessage: 'メッセージの編集',
    emptyBody: '内容を入力してください',
    pickFile: 'ファイルを選択してください'
  };

  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function once(el, key) {
    if (!el || el.hasAttribute('data-gbd-' + key)) return false;
    el.setAttribute('data-gbd-' + key, '1');
    return true;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function icon(id, cls) {
    var s = GB.spriteHref();
    return s ? GB.svgIcon(s, id, 'icon-svg ' + (cls || '')) : el('span');
  }
  function avatar(name, size) {
    if (typeof GB.avatar === 'function') {
      var made = GB.avatar(name, size);
      if (made && made.nodeType) return made;
      var w = document.createElement('span');
      w.innerHTML = String(made || '');
      if (w.firstElementChild) return w.firstElementChild;
    }
    var sum = 0, n = String(name || '');
    for (var i = 0; i < n.length; i++) sum += n.charCodeAt(i);
    var a = el('span', 'gb-avatar gb-avatar--' + size, GB.initial(n));
    a.setAttribute('data-av', String(sum % 8));
    a.setAttribute('aria-hidden', 'true');
    return a;
  }
  function countBadge(n) { return el('span', 'gbd-count', String(n)); }
  // "(1コメント)" / "(1)" -> number
  function takeCount(node) {
    var m = node && node.nodeType === 3 && node.nodeValue.match(/\(\s*(\d+)\s*([^)]*)\)/);
    return m ? { n: m[1], label: m[2].trim() } : null;
  }
  // Wrap author line nodes "<a.user>名前</a> さんが<a>12分</a>前に追加" so the name can be bold.
  function authorLine(container) {
    var user = container.querySelector('a.user');
    return user ? user.textContent.trim() : '';
  }
  function menuLink(cls) {
    return document.querySelector('#main-menu a.' + cls) || null;
  }

  /* ---------------- Documents ---------------- */
  function documentsIndex() {
    $all('#document-list .document-group').forEach(function (g) {
      var h = g.querySelector('h3.group-name');
      if (h && once(h, 'count')) {
        // sort_by=date groups are ISO dates ("2026-11-22"); rows show "2026/11/22 01:04"
        var t = h.firstChild;
        if (t && t.nodeType === 3 && /^\s*\d{4}-\d{2}-\d{2}\s*$/.test(t.nodeValue)) t.nodeValue = t.nodeValue.trim().replace(/-/g, '/');
        h.appendChild(countBadge(g.querySelectorAll('.document-item').length));
      }
    });
    $all('#document-list .document-item').forEach(function (item) {
      if (!once(item, 'item')) return;
      var ic = el('span', 'gbd-doc-icon');
      ic.appendChild(icon('document'));
      item.insertBefore(ic, item.firstChild);
      var d = item.querySelector('.wiki.description');
      if (d && !d.textContent.trim()) d.classList.add('gbd-empty');
    });
  }

  function documentsShow() {
    var content = document.getElementById('content');
    var h2 = content && content.querySelector(':scope > h2');
    if (!h2 || !once(h2, 'doc')) return;
    content.classList.add('gbd-doc-show');
    var meta = h2.nextElementSibling;
    var category = '';
    if (meta && meta.tagName === 'P' && meta.querySelector('em br')) {
      var em = meta.querySelector('em');
      var parts = [], buf = '';
      Array.prototype.forEach.call(em.childNodes, function (n) {
        if (n.nodeName === 'BR') { parts.push(buf.trim()); buf = ''; } else buf += n.textContent;
      });
      parts.push(buf.trim());
      category = parts[0] || '';
      meta.className = 'gbd-meta gbd-doc-meta';
      meta.textContent = '';
      if (category) meta.appendChild(el('span', 'gbd-tag', category));
      if (parts[1]) {
        var date = el('span', 'gbd-date');
        date.appendChild(icon('time'));
        date.appendChild(document.createTextNode(parts[1]));
        meta.appendChild(date);
      }
    }
    // breadcrumb 文書 › category
    var docs = menuLink('documents');
    if (docs && !content.querySelector('p.breadcrumb')) {
      var bc = el('p', 'breadcrumb gbd-breadcrumb');
      var a = el('a', null, docs.textContent.trim());
      a.href = docs.getAttribute('href');
      bc.appendChild(a);
      if (category) {
        bc.appendChild(el('span', 'gbd-sep', '›'));
        bc.appendChild(el('span', null, category));
      }
      var first = content.querySelector(':scope > .contextual') || h2;
      content.insertBefore(bc, first);
    }
    // files section
    var link = document.getElementById('attach_files_link');
    var filesH3 = null;
    $all(':scope > h3', content).forEach(function (h) {
      var next = h.nextElementSibling;
      if (next && (next.classList.contains('attachments') || (link && next.contains(link)))) filesH3 = h;
    });
    if (filesH3 && once(filesH3, 'files')) {
      filesH3.classList.add('gbd-section-title');
      var list = filesH3.nextElementSibling;
      var n = list && list.classList.contains('attachments') ? list.querySelectorAll('table tr, p > a.icon-attachment').length : 0;
      filesH3.appendChild(countBadge(n));
      var sec = el('section', 'gbd-files-section');
      content.insertBefore(sec, filesH3);
      var node = filesH3;
      while (node && !(node.nodeType === 1 && node.style && node.style.clear === 'both')) {
        var nx = node.nextSibling;
        sec.appendChild(node);
        node = nx;
      }
    }
    if (link && once(link, 'btn')) {
      link.classList.add('gbd-btn', 'gbd-btn--sm');
      link.setAttribute('aria-controls', 'add_attachment_form');
      link.setAttribute('aria-expanded', 'false');
      link.insertBefore(icon('attachment'), link.firstChild);
      link.addEventListener('click', function () {
        link.parentNode.hidden = true;
        link.setAttribute('aria-expanded', 'true');
        var f = document.querySelector('#add_attachment_form input.file_selector');
        if (f) setTimeout(function () { f.focus(); }, 0);
      });
      var form = document.getElementById('add_attachment_form');
      var submit = form && form.querySelector('input[type=submit]');
      if (submit && !form.querySelector('.gbd-cancel')) {
        var c = el('a', 'gbd-cancel', T.cancel);
        c.href = '#';
        c.setAttribute('role', 'button');
        c.addEventListener('click', function (e) {
          e.preventDefault();
          form.style.display = 'none';
          link.parentNode.hidden = false;
          link.setAttribute('aria-expanded', 'false');
          link.focus();
        });
        submit.parentNode.insertBefore(c, submit.nextSibling);
      }
    }
  }

  /* ---------------- Files ---------------- */
  var EXT_ICON = {
    txt: 'text-plain', md: 'text-plain', csv: 'text-plain', log: 'text-plain',
    pdf: 'application-pdf', zip: 'application-zip', gz: 'application-gzip', tgz: 'application-gzip',
    png: 'image-png', jpg: 'image-jpeg', jpeg: 'image-jpeg', gif: 'image-gif', tif: 'image-tiff', tiff: 'image-tiff',
    html: 'text-html', htm: 'text-html', css: 'text-css', xml: 'text-xml', js: 'application-javascript',
    rb: 'text-x-ruby', java: 'text-x-java', php: 'text-x-php', c: 'text-x-c', cs: 'text-x-csharp'
  };
  function filesIndex() {
    $all('table.list.files td.filename').forEach(function (td) {
      if (!once(td, 'fn')) return;
      var a = td.querySelector('a');
      var ext = a ? (a.textContent.split('.').pop() || '').toLowerCase() : '';
      var wrap = el('span', 'gbd-file-icon');
      wrap.appendChild(icon(EXT_ICON[ext] || 'file'));
      td.insertBefore(wrap, td.firstChild);
    });
    $all('table.list.files').forEach(function (table) {
      var td = table.querySelector('td.digest');
      var row = td && td.parentNode;
      if (!row) return;
      var idx = Array.prototype.indexOf.call(row.children, td);
      var th = table.querySelector('thead tr') && table.querySelector('thead tr').children[idx];
      if (th) th.classList.add('gbd-th-digest');
    });
    $all('table.list.files td.digest').forEach(function (td) {
      if (!once(td, 'dg')) return;
      var full = td.textContent.trim();
      var hash = full.replace(/^[A-Z0-9]+:\s*/, '');
      td.title = full;
      // the checksum column is hidden on narrower screens: keep the hash reachable from the file name
      var fnLink = td.parentNode.querySelector('td.filename > a');
      if (fnLink && full && !fnLink.title) fnLink.title = fnLink.textContent.trim() + '\n' + full;
      td.textContent = '';
      td.appendChild(el('code', 'gbd-digest', hash.slice(0, 10)));
    });
    $all('table.list.files tr').forEach(function (tr) {
      if (tr.querySelector(':scope > th[colspan]') && once(tr, 'grp')) tr.classList.add('gbd-group');
    });
    // phone rows lose the column headers: label the bare download count with its header (「DL」)
    $all('table.list.files').forEach(function (table) {
      var td = table.querySelector('td.downloads');
      var row = td && td.parentNode;
      var head = table.querySelector('thead tr');
      var th = row && head && head.children[Array.prototype.indexOf.call(row.children, td)];
      var label = th ? th.textContent.trim() : '';
      if (!label) return;
      $all('td.downloads', table).forEach(function (cell) {
        if (!once(cell, 'dl')) return;
        cell.insertBefore(el('span', 'gbd-cell-label', label), cell.firstChild);
      });
    });
  }

  /* ---------------- News ---------------- */
  function newsMetaFrom(authorEl, extra) {
    var name = authorLine(authorEl);
    var row = el('div', 'gbd-meta');
    if (name) row.appendChild(avatar(name, 20));
    authorEl.classList.add('gbd-author');
    splitWhen(authorEl);
    row.appendChild(authorEl);
    if (extra) row.appendChild(extra);
    return row;
  }
  function newsIndex() {
    $all('article.news-article').forEach(function (art) {
      if (!once(art, 'art')) return;
      var h3 = art.querySelector('header h3');
      var author = art.querySelector('header p.author');
      var titleLink = null, chip = null;
      if (h3) {
        var links = h3.querySelectorAll(':scope > a');
        titleLink = links[links.length - 1] || null;
        Array.prototype.slice.call(h3.childNodes).forEach(function (n) {
          var c = takeCount(n);
          if (c) {
            chip = el('span', 'gbd-chip');
            chip.appendChild(icon('comments'));
            chip.appendChild(document.createTextNode(c.label ? c.label.replace(/^\s*/, '') + ' ' + c.n : c.n));
            h3.removeChild(n);
          } else if (n.nodeType === 3 && /^\s*:\s*$/.test(n.nodeValue)) {
            h3.removeChild(n);
          }
        });
        if (links.length > 1) {
          links[0].classList.add('gbd-tag', 'gbd-tag--project');
          h3.parentNode.insertBefore(links[0], h3);
        }
      }
      if (author) {
        var header = author.parentNode;
        header.appendChild(newsMetaFrom(author, chip));
      }
      var body = art.querySelector(':scope > .wiki');
      if (body && titleLink) {
        newsClamp(art, body, titleLink.getAttribute('href'));
        newsSummary(art, body, titleLink.getAttribute('href'));
      }
    });
  }
  // List excerpt: clamp to 4 lines; 「続きを読む」 appears only while the text is actually cut.
  // Re-checked on resize / late images so the link never lies.
  function newsClamp(art, body, href) {
    body.classList.add('gbd-clamp');
    var more = el('a', 'gbd-more', T.readMore);
    more.href = href;
    more.appendChild(icon('angle-right'));
    more.hidden = true;
    body.parentNode.insertBefore(more, body.nextSibling);
    function check() {
      var cut = body.scrollHeight > body.clientHeight + 2;
      body.classList.toggle('gbd-clamped', cut);
      more.hidden = !cut;
    }
    requestAnimationFrame(check);
    if (window.ResizeObserver) new ResizeObserver(check).observe(art);
    if (window.MutationObserver) new MutationObserver(check).observe(body, { childList: true, subtree: true, characterData: true });
    $all('img', body).forEach(function (img) { if (!img.complete) img.addEventListener('load', check); });
  }
  // The index view renders only the description; the summary lives on the detail page.
  // Fetch it (same-origin, read-only) and show it above the excerpt.
  var summaryCache = {};
  function newsSummary(art, body, href) {
    if (!href || !window.fetch || !window.DOMParser) return;
    var req = summaryCache[href] || (summaryCache[href] = fetch(href, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return '';
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var em = doc.querySelector('#content > .news > p:not(.gbd-lead) > em:first-child');
        return em ? em.textContent.replace(/\s+/g, ' ').trim() : '';
      })
      .catch(function () { return ''; }));
    req.then(function (text) {
      if (!text || art.querySelector('.gbd-summary')) return;
      var sum = el('p', 'gbd-summary', text);
      body.parentNode.insertBefore(sum, body);
      // the description often repeats the summary as its first paragraph: skip it in the excerpt
      var first = body.firstElementChild;
      if (first && first.tagName === 'P' && first.textContent.replace(/\s+/g, ' ').trim() === text) first.classList.add('gbd-dup-summary');
    });
  }

  // 「<name> さんが<time>前に追加」: everything after the user link goes into one nowrap span (and 「さんが」 into
  // its own span) so narrow layouts can put the time phrase on its own line without breaking it mid-phrase.
  function splitWhen(box) {
    var user = box && box.querySelector('a.user');
    if (!user || !once(box, 'when')) return;
    var when = el('span', 'gbd-when');
    while (user.nextSibling) when.appendChild(user.nextSibling);
    var t = when.firstChild;
    if (t && t.nodeType === 3) {
      var m = t.nodeValue.match(/^\s*(さんが)/);
      if (m) {
        t.nodeValue = t.nodeValue.slice(m[0].length);
        when.insertBefore(el('span', 'gbd-by', m[1]), t);
      }
    }
    var last = when.lastChild;
    if (last && last.nodeType === 3) last.nodeValue = last.nodeValue.replace(/\s+$/, '');
    box.insertBefore(document.createTextNode(' '), user.nextSibling);
    box.appendChild(when);
  }

  function timelineHeader(h4, opts) {
    // h4.journal-header > span.journal-info (avatar, [subject link, "-"], a.user, "さんが", a(time), "前に追加")
    if (!once(h4, 'jh')) return;
    var info = h4.querySelector('.journal-info');
    if (!info) return;
    var old = info.querySelector('.avatar');
    var user = info.querySelector('a.user');
    var name = user ? user.textContent.trim() : '';
    if (old) old.remove();
    var subject = null;
    if (opts && opts.subject) {
      var firstLink = info.querySelector('a:not(.user)');
      if (firstLink && user && (firstLink.compareDocumentPosition(user) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        subject = firstLink;
        var after = subject.nextSibling;
        if (after && after.nodeType === 3 && /^\s*-\s*$/.test(after.nodeValue)) after.remove();
      }
    }
    var text = el('span', 'gbd-tl-text');
    var line = el('span', 'gbd-tl-line');
    while (info.firstChild) {
      var n = info.firstChild;
      if (n === subject) { info.removeChild(n); continue; }
      line.appendChild(n);
    }
    text.appendChild(line);
    splitWhen(line);
    if (subject) {
      subject.classList.add('gbd-tl-subject');
      text.appendChild(subject);
    }
    info.appendChild(avatar(name, opts && opts.size || 28));
    info.appendChild(text);
    h4.closest('.journal') && h4.closest('.journal').classList.add('gbd-tl-item');
  }

  // The collapsed 「コメントを追加…」/「返答を書く…」 row is the shared C-comment component (GB.commentCta,
  // js/15-c-comment.js). Core's own toggle link stays in the DOM (hidden) and is what the row clicks, so core's
  // onclick keeps opening the form; this page only owns the panel around the form.
  function commentTrigger(a, formSel, label, focusSel, panelTitle) {
    if (!a || !once(a, 'pseudo')) return;
    var p = a.parentNode;
    var form = document.querySelector(formSel);
    if (!form || typeof GB.commentCta !== 'function') return;
    var row = GB.commentCta(label, function () {
      a.click();
      setTimeout(function () {
        sync();
        var f = form.querySelector(focusSel);
        if (f && document.activeElement !== f) f.focus();
      }, 0);
    });
    var btn = row.querySelector('.gb-comment-cta__btn');
    p.parentNode.insertBefore(row, p.nextSibling);
    p.hidden = true;
    function sync() {
      var open = getComputedStyle(form).display !== 'none';
      row.hidden = open;
      if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    sync();
    // core's 引用 (quote) and other scripts toggle the form directly
    if (window.MutationObserver) new MutationObserver(sync).observe(form, { attributes: true, attributeFilter: ['style', 'class'] });
    function close() {
      form.style.display = 'none';
      sync();
      GB.commentCta.focus(row);
    }
    // same panel component as the news edit panel: tinted card, titled header + close button, Esc closes
    if (panelTitle && once(form, 'fpanel')) {
      form.classList.add('gbd-add-panel', 'gbd-form-panel');
      var h = el('h2', null, panelTitle);
      var x = el('button', 'gbd-panel-close');
      x.type = 'button';
      x.setAttribute('aria-label', T.close);
      x.title = T.close;
      x.appendChild(icon('close'));
      x.addEventListener('click', close);
      h.appendChild(x);
      form.insertBefore(h, form.firstChild);
      form.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && getComputedStyle(form).display !== 'none') { e.preventDefault(); close(); }
      });
    }
    // cancel button next to submit
    var submit = form.querySelector('input[type=submit]');
    if (submit && !form.querySelector('.gbd-cancel')) {
      var c = el('a', 'gbd-cancel', T.cancel);
      c.href = '#';
      c.setAttribute('role', 'button');
      c.addEventListener('click', function (e) {
        e.preventDefault();
        close();
      });
      submit.parentNode.insertBefore(c, submit.nextSibling);
    }
  }

  function newsShow() {
    var content = document.getElementById('content');
    var news = content && content.querySelector(':scope > .news');
    if (news && once(news, 'news')) {
      var p = news.querySelector(':scope > p');
      if (p) {
        var em = p.querySelector(':scope > em');
        var author = p.querySelector('.author');
        if (em && em.textContent.trim()) {
          var lead = el('p', 'gbd-lead');
          while (em.firstChild) lead.appendChild(em.firstChild);
          news.insertBefore(lead, p.nextSibling);
          // the description often repeats the summary as its first paragraph: show it once (as the lead)
          var body = news.querySelector(':scope > .wiki');
          var firstP = body && body.firstElementChild;
          var norm = function (t) { return t.replace(/\s+/g, ' ').trim(); };
          if (firstP && firstP.tagName === 'P' && norm(firstP.textContent) === norm(lead.textContent)) firstP.classList.add('gbd-dup-summary');
        }
        if (author) {
          var meta = newsMetaFrom(author);
          var react = news.querySelector(':scope > .reaction');
          if (react) meta.appendChild(react);
          news.insertBefore(meta, news.firstChild);
        }
        p.remove();
      }
    }
    var com = document.getElementById('comments');
    if (com) {
      var h3 = com.querySelector('h3.comments');
      if (h3 && once(h3, 'count')) h3.appendChild(countBadge(com.querySelectorAll('.journal').length));
      $all('.journal h4.journal-header', com).forEach(function (h) { timelineHeader(h, { size: 28 }); });
    }
    var trig = content && content.querySelector('p > a[onclick*="add_comment_form"]');
    commentTrigger(trig, '#add_comment_form', T.writeComment, 'textarea', T.commentPanel);
    emptyGuard(document.getElementById('add_comment_form'));
    titleRow(content);
    newsEditPanel();
  }

  // Inline edit on the news page: same panel header (title + close) as the "add" panels,
  // and the 編集 button hides while the panel is open.
  function newsEditPanel() {
    var panel = document.getElementById('edit-news');
    if (!panel || !once(panel, 'epanel')) return;
    panel.classList.add('gbd-add-panel');
    var h = el('h2', null, T.editNews);
    var btn = el('button', 'gbd-panel-close');
    btn.type = 'button';
    btn.setAttribute('aria-label', T.close);
    btn.title = T.close;
    btn.appendChild(icon('close'));
    h.appendChild(btn);
    panel.insertBefore(h, panel.firstChild);
    var trigger = document.querySelector('#content .gbd-title-row a.icon-edit');
    var bar = trigger && trigger.parentNode;
    if (trigger) {
      trigger.classList.add('gbd-panel-trigger');
      trigger.setAttribute('aria-controls', 'edit-news');
    }
    function isOpen() { return getComputedStyle(panel).display !== 'none'; }
    function close() {
      panel.style.display = 'none';
      if (bar) bar.classList.remove('gbd-panel-open'); // un-hide the trigger before focusing it
      if (trigger) trigger.focus();
    }
    btn.addEventListener('click', close);
    panel.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(); }
    });
    var wasOpen = isOpen();
    function sync() {
      var open = isOpen();
      if (bar) bar.classList.toggle('gbd-panel-open', open);
      if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      // while editing, the read view (title, author row, lead, body) is hidden: the panel replaces it
      var content = document.getElementById('content');
      if (content) content.classList.toggle('gbd-news-editing', open);
      if (open && !wasOpen) {
        revealPanel(panel);
        var f = document.getElementById('news_title');
        if (f) f.focus();
      }
      wasOpen = open;
    }
    sync();
    if (window.MutationObserver) new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['style', 'class'] });
  }

  /* ---------------- Forums ---------------- */
  function boardsIndex() {
    var table = document.querySelector('table.list.boards');
    if (!table || !once(table, 'boards')) return;
    var heads = $all('thead th', table).map(function (th) { return th.textContent.trim(); });
    $all('tbody tr.board', table).forEach(function (tr) {
      $all(':scope > td', tr).forEach(function (td, i) { if (heads[i]) td.setAttribute('data-label', heads[i]); });
      var name = tr.querySelector('td.name > a.board');
      if (name) name.classList.add('gbd-board-link');
      var last = tr.querySelector('td.last-message');
      if (last) decorateLastMessage(last);
    });
  }
  function decorateLastMessage(td) {
    if (!once(td, 'last')) return;
    var user = td.querySelector('a.user');
    if (!user) return;
    var line = el('span', 'gbd-last-line');
    line.appendChild(avatar(user.textContent.trim(), 20));
    var n = user;
    var nodes = [];
    while (n && n.nodeName !== 'BR') { nodes.push(n); n = n.nextSibling; }
    td.insertBefore(line, user);
    // "名前 さんが <a>約3時間</a> 前に追加" -> "名前 ・ 約3時間前" (short, single line)
    var timeLink = null;
    nodes.forEach(function (x) {
      if (x === user) { user.classList.add('gbd-last-name'); line.appendChild(x); return; }
      if (x.nodeType === 1 && x.tagName === 'A') { timeLink = x; x.remove(); return; }
      // drop "さんが" / "前に追加" and whitespace; the short form is rebuilt below
      if (x.nodeType === 3 && (!x.nodeValue.trim() || /\u3055\u3093\u304c/.test(x.nodeValue) || (timeLink && /\u524d/.test(x.nodeValue)))) { x.remove(); return; }
      line.appendChild(x);
    });
    if (timeLink) {
      line.appendChild(el('span', 'gbd-last-sep', '\u30fb'));
      var t = el('span', 'gbd-last-time');
      t.appendChild(timeLink);
      t.appendChild(document.createTextNode('\u524d'));
      line.appendChild(t);
    }
    if (n && n.nodeName === 'BR') n.remove();
    var link = td.querySelector(':scope > a:not(.user)');
    if (link) link.classList.add('gbd-last-title');
  }
  function boardsShow() {
    var replyHead = '';
    var rcCell = document.querySelector('table.list.messages tbody tr.message td.reply-count');
    var headRow = document.querySelector('table.list.messages thead tr');
    if (rcCell && headRow) {
      var hth = headRow.children[Array.prototype.indexOf.call(rcCell.parentNode.children, rcCell)];
      replyHead = hth ? hth.textContent.trim() : '';
    }
    $all('table.list.messages tbody tr.message').forEach(function (tr) {
      if (!once(tr, 'msg')) return;
      var subj = tr.querySelector('td.subject > span');
      var link = subj && subj.querySelector('a');
      if (link) {
        var cl = tr.classList;
        subj.classList.add('gbd-subject');
        if (cl.contains('sticky')) subj.insertBefore(stateTag(T.sticky, 'bookmarked', 'sticky'), link);
        if (cl.contains('locked')) subj.insertBefore(stateTag(T.locked, 'lock', 'locked'), link);
      }
      var au = tr.querySelector('td.author a.user');
      if (au) {
        var who = el('span', 'gbd-who');
        au.parentNode.insertBefore(who, au);
        who.appendChild(avatar(au.textContent.trim(), 20));
        who.appendChild(au);
      }
      var rc = tr.querySelector('td.reply-count');
      if (rc && !rc.querySelector('.gbd-count')) {
        var v = rc.textContent.trim();
        rc.textContent = '';
        var b = countBadge(v);
        if (v !== '0') b.classList.add('gbd-count--on');
        rc.appendChild(b);
        // phone rows: the same 「コメント 1」 chip as the news list, labelled with the column header (「返答 1」)
        var chip = el('span', 'gbd-chip');
        chip.appendChild(icon('comments'));
        chip.appendChild(document.createTextNode((replyHead ? replyHead + ' ' : '') + v));
        rc.appendChild(chip);
      }
      // 「2026/11/22 01:29」: the clock part can be dropped on phones so the meta line fits on one row
      var co = tr.querySelector('td.created_on');
      var cm = co && co.childNodes.length === 1 && co.firstChild.nodeType === 3 && co.firstChild.nodeValue.match(/^(\s*\S+)(\s+\d{1,2}:\d{2}\s*)$/);
      if (cm) {
        co.textContent = cm[1];
        co.appendChild(el('span', 'gbd-hm', cm[2]));
      }
      var last = tr.querySelector('td.last_message');
      if (last) decorateLastMessage(last);
    });
  }
  function stateTag(text, ic, mod) {
    var t = el('span', 'gbd-state gbd-state--' + mod);
    t.appendChild(icon(ic));
    t.appendChild(document.createTextNode(text));
    return t;
  }

  function messagesShow() {
    var content = document.getElementById('content');
    if (!content) return;
    var topic = content.querySelector(':scope > [data-controller="quote-reply"]');
    var first = topic && topic.querySelector(':scope > .message');
    if (first && once(first, 'post')) {
      first.classList.add('gbd-post', 'gbd-post--topic');
      var p = first.querySelector(':scope > p');
      var author = p && p.querySelector('.author');
      if (author) {
        var head = el('div', 'gbd-post-head');
        var name = authorLine(author);
        head.appendChild(avatar(name, 36));
        var txt = el('div', 'gbd-post-who');
        author.classList.add('gbd-author');
        splitWhen(author);
        txt.appendChild(author);
        head.appendChild(txt);
        var react = first.querySelector(':scope > .reaction');
        if (react) head.appendChild(react);
        first.insertBefore(head, first.firstChild);
        p.remove();
      }
    }
    var replies = document.getElementById('replies');
    if (replies) {
      var h3 = replies.querySelector(':scope > h3.comments');
      if (h3 && once(h3, 'count')) {
        Array.prototype.slice.call(h3.childNodes).forEach(function (n) {
          var c = takeCount(n);
          if (c) { h3.replaceChild(countBadge(c.n), n); }
        });
      }
      var topicH2 = topic && topic.querySelector('h2');
      var topicTitle = '';
      if (topicH2) {
        // ignore the avatar initial core renders inside the h2
        var h2c = topicH2.cloneNode(true);
        $all('.avatar, .gb-avatar', h2c).forEach(function (x) { x.remove(); });
        topicTitle = h2c.textContent.replace(/\s+/g, ' ').trim();
      }
      $all('.message.reply', replies).forEach(function (m) {
        m.classList.add('gbd-post', 'gbd-post--reply');
        var h = m.querySelector('h4.reply-header');
        if (h) timelineHeader(h, { size: 28, subject: true });
        // 「RE: <topic title>」 repeats the page title: hide it (it stays for replies with their own subject)
        var subj = m.querySelector('a.gbd-tl-subject');
        if (subj && topicTitle && subj.textContent.replace(/\s+/g, ' ').trim() === 'RE: ' + topicTitle) subj.classList.add('gbd-tl-subject--same');
      });
    }
    var trig = content.querySelector('p > a[onclick*="#reply"]');
    commentTrigger(trig, '#reply', T.writeReply, 'textarea', T.replyPanel);
    emptyGuard(document.querySelector('#reply form#message-form'));
    titleRow(topic);
    messageForm();
  }

  // Message form (new topic / edit / reply): wrap checkbox pairs, label the bare "ファイル" text.
  function requiredMarks(root) {
    ['message_subject', 'message_content'].forEach(function (id) {
      var lab = root.querySelector('label[for="' + id + '"]');
      if (!lab || !once(lab, 'req') || !window.GB.form) return;
      window.GB.form.markRequired(lab);
    });
  }
  function messageForm() {
    $all('form#message-form > .box, #message-form .box').forEach(function (box) {
      requiredMarks(box);
      if (!once(box, 'mform')) return;
      box.classList.add('gbd-mform');
      $all('input[type=checkbox]', box).forEach(function (cb) {
        var lab = cb.id && box.querySelector('label[for="' + cb.id + '"]');
        if (!lab) return;
        var wrap = el('span', 'gbd-check');
        cb.parentNode.insertBefore(wrap, cb);
        wrap.appendChild(cb);
        wrap.appendChild(lab);
        var p = wrap.parentNode;
        p.classList.add('gbd-has-checks');
      });
      $all(':scope > p', box).forEach(function (p) {
        var tn = p.firstChild;
        if (tn && tn.nodeType === 3 && tn.nodeValue.trim() && p.querySelector('.attachments_form')) {
          var lab = el('span', 'gbd-label', tn.nodeValue.trim());
          p.replaceChild(lab, tn);
          p.classList.add('gbd-files-row');
        }
        var c = p.querySelector('.hidden-for-sighted');
        if (c) c.classList.add('gbd-label-visible');
      });
    });
  }

  /* ---------------- Breadcrumb: "A » B » " -> "A › B" ---------------- */
  function breadcrumb() {
    var bc = document.querySelector('#content p.breadcrumb:not(.gbd-breadcrumb)');
    if (!bc || !once(bc, 'bc')) return;
    Array.prototype.slice.call(bc.childNodes).forEach(function (n) {
      if (n.nodeType !== 3 || n.nodeValue.indexOf('\u00bb') < 0) return;
      var last = !n.nextSibling || (n.nextSibling.nodeType === 3 && !n.nextSibling.nodeValue.trim() && !n.nextSibling.nextSibling);
      if (last) { n.remove(); return; }
      bc.replaceChild(el('span', 'gbd-sep', '\u203a'), n);
    });
  }

  /* ---------------- Dropzone (same markup/classes as the issue form's §2.12 dropzone) ---------------- */
  var fileSeq = 0;
  function dropzones() {
    $all('#content span.add_attachment').forEach(function (zone) {
      if (zone.closest('#issue-form') || zone.classList.contains('gb-drop') || !once(zone, 'drop')) return;
      var input = zone.querySelector('input.file_selector');
      if (!input) return;
      zone.classList.add('gb-drop');
      if (!input.id) input.id = 'gbd-file-' + (++fileSeq);
      var limit = null;
      Array.prototype.slice.call(zone.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          limit = el('span', 'gb-drop__limit', n.textContent.trim());
          zone.replaceChild(limit, n);
        }
      });
      var ic = el('span', 'gb-drop__icon');
      ic.setAttribute('aria-hidden', 'true');
      ic.appendChild(icon('attachment'));
      var text = el('span', 'gb-drop__text', T.dropText);
      var btn = el('label', 'gb-drop__btn', T.dropButton);
      btn.htmlFor = input.id;
      [ic, text, btn].forEach(function (n) { zone.insertBefore(n, limit); });
      zone.addEventListener('click', function (e) {
        if (e.target.closest('label, input, a')) return;
        var current = zone.querySelector('input.file_selector');
        if (current) current.click();
      });
    });
  }

  /* ---------------- Inline "add" panels on list pages ---------------- */
  // Core puts the hidden panel above the h2; move the same node below the page title/description,
  // give it a header row with a close button and hide the now-redundant primary button while open.
  function revealPanel(panel) {
    var r = panel.getBoundingClientRect();
    var bar = document.getElementById('top-menu');
    var top = bar && /^(fixed|sticky)$/.test(getComputedStyle(bar).position) ? bar.offsetHeight : 0;
    if (r.top >= top + 8 && r.bottom <= window.innerHeight) return; // already fully visible
    if (panel.scrollIntoView) panel.scrollIntoView({ block: 'start' });
  }
  function inlinePanels() {
    ['add-document', 'add-news', 'add-message'].forEach(function (id) {
      var panel = document.getElementById(id);
      if (!panel || !once(panel, 'panel')) return;
      panel.classList.add('gbd-add-panel');
      var content = document.getElementById('content');
      if (panel.parentNode === content) {
        var h2 = content.querySelector(':scope > h2');
        if (h2) {
          var anchor = h2;
          var next = h2.nextElementSibling;
          if (next && next.tagName === 'P' && (next.classList.contains('subtitle') || next.classList.contains('description'))) anchor = next;
          content.insertBefore(panel, anchor.nextSibling);
        }
      }
      var trigger = document.querySelector('#content .contextual a[onclick*="' + id + '"]');
      var bar = trigger && trigger.parentNode;
      if (trigger) {
        trigger.classList.add('gbd-panel-trigger');
        trigger.setAttribute('aria-controls', id);
      }
      function isOpen() { return getComputedStyle(panel).display !== 'none'; }
      function close() {
        panel.style.display = 'none';
        if (bar) bar.classList.remove('gbd-panel-open'); // un-hide the trigger before focusing it
        if (trigger) trigger.focus();
      }
      var title = panel.querySelector(':scope > h2');
      // "雑談 » 新しいメッセージ": the panel already lives on the forum page, keep only the action text
      if (title && once(title, 'ptitle') && title.textContent.indexOf('\u00bb') >= 0) {
        var txt = title.textContent.split('\u00bb').pop().trim();
        if (txt) title.textContent = txt;
      }
      if (title && !title.querySelector('.gbd-panel-close')) {
        var btn = el('button', 'gbd-panel-close');
        btn.type = 'button';
        btn.setAttribute('aria-label', T.close);
        btn.title = T.close;
        btn.appendChild(icon('close'));
        btn.addEventListener('click', close);
        title.appendChild(btn);
      }
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpen()) { e.preventDefault(); close(); }
      });
      var wasOpen = isOpen();
      function sync() {
        var open = isOpen();
        if (bar) bar.classList.toggle('gbd-panel-open', open);
        if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && !wasOpen) revealPanel(panel);
        if (!open && wasOpen && trigger && document.activeElement && panel.contains(document.activeElement)) trigger.focus();
        wasOpen = open;
      }
      sync();
      if (window.MutationObserver) new MutationObserver(sync).observe(panel, { attributes: true, attributeFilter: ['style', 'class'] });
    });
  }

  /* ---------------- New topic: "雑談 » 新しいメッセージ" -> breadcrumb + clean title ---------------- */
  function messageTitle() {
    var content = document.getElementById('content');
    var h2 = content && content.querySelector(':scope > h2');
    if (!h2 || content.querySelector(':scope > p.breadcrumb') || !once(h2, 'title')) return;
    var boardLink = h2.querySelector(':scope > a[href]');
    if (!boardLink || h2.textContent.indexOf('\u00bb') < 0) return;
    var rest = '';
    var n = boardLink.nextSibling;
    while (n) { rest += n.textContent; n = n.nextSibling; }
    rest = rest.replace(/^[\s\u00bb]+/, '').trim();
    if (!rest) return;
    var bc = el('p', 'breadcrumb gbd-breadcrumb');
    var forums = menuLink('boards');
    if (forums) {
      var fa = el('a', null, forums.textContent.trim() || T.forums);
      fa.href = forums.getAttribute('href');
      bc.appendChild(fa);
      bc.appendChild(el('span', 'gbd-sep', '\u203a'));
    }
    bc.appendChild(boardLink);
    h2.textContent = rest;
    content.insertBefore(bc, h2);
  }

  /* ---------------- Title row: h2 + its action bar share one wrapping flex row ---------------- */
  // Core floats .contextual right of the h2, which squeezes long titles into a narrow column.
  // Wrap both (title first) so the actions drop under the title when there is not enough room.
  // The node stays inside its original parent, so Stimulus scopes (quote-reply) keep working.
  function titleRow(container) {
    var h2 = container && container.querySelector(':scope > h2');
    if (!h2 || (h2.parentNode && h2.parentNode.classList.contains('gbd-title-row'))) return;
    var ctx = h2.previousElementSibling;
    if (!ctx || !ctx.classList.contains('contextual')) return;
    var row = el('div', 'gbd-title-row');
    container.insertBefore(row, ctx);
    // the page breadcrumb shares the first row with the actions (like wiki pages)
    var bc = document.querySelector('#content > p.breadcrumb');
    if (bc && (bc.compareDocumentPosition(row) & Node.DOCUMENT_POSITION_FOLLOWING)) row.appendChild(bc);
    row.appendChild(h2);
    row.appendChild(ctx);
    // icon-only on very narrow screens: keep a tooltip with the label
    $all(':scope > a', ctx).forEach(function (a) {
      var label = a.querySelector('.icon-label');
      if (label && !a.title) a.title = label.textContent.trim();
    });
  }

  // List pages: core renders the action bar first and floats it; on narrow screens the second
  // action row then overlaps the first item. Put title + actions in one flex row instead.
  function listTitleRow() {
    var content = document.getElementById('content');
    var ctx = content && content.querySelector(':scope > .contextual');
    var h2 = content && content.querySelector(':scope > h2');
    if (!ctx || !h2 || !ctx.querySelector('a') || !once(h2, 'lrow')) return;
    if (!(ctx.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
    var row = el('div', 'gbd-title-row gbd-title-row--list');
    content.insertBefore(row, ctx);
    row.appendChild(h2);
    row.appendChild(ctx);
    $all(':scope > a', ctx).forEach(function (a) {
      var label = a.querySelector('.icon-label');
      if (label && !a.title) a.title = label.textContent.trim();
    });
  }

  /* ---------------- Empty reply / comment guard ---------------- */
  // Core accepts an empty reply (redirects with 「更新しました。」) and silently reloads on an empty news comment.
  var guardSeq = 0;
  function emptyGuard(form) {
    if (!form || !once(form, 'guard')) return;
    var ta = form.querySelector('textarea');
    if (!ta) return;
    var msg = null;
    function clear() {
      ta.removeAttribute('aria-invalid');
      if (msg) {
        msg.hidden = true;
        ta.removeAttribute('aria-describedby');
      }
    }
    form.addEventListener('submit', function (e) {
      if (ta.value.trim()) return;
      e.preventDefault();
      e.stopPropagation(); // keep rails-ujs from disabling the submit button
      ta.setAttribute('aria-invalid', 'true');
      if (!msg) {
        msg = el('p', 'gbd-field-error', T.emptyBody);
        msg.id = 'gbd-empty-' + (++guardSeq);
        msg.setAttribute('role', 'alert');
        var block = ta.closest('.jstBlock') || ta;
        block.parentNode.insertBefore(msg, block.nextSibling);
      }
      msg.hidden = false;
      ta.setAttribute('aria-describedby', msg.id);
      if (!ta.offsetParent) {
        var editTab = form.querySelector('.jstTabs a.tab-edit');
        if (editTab) editTab.click();
      }
      ta.focus();
    });
    ta.addEventListener('input', function () { if (ta.value.trim()) clear(); });
  }

  /* ---------------- Edit pages: generic title -> breadcrumb + "〇〇の編集" ---------------- */
  function newsEditTitle() { editTitle('news', 'news_title', T.editNews); }
  function documentEditTitle() { editTitle('documents', 'document_title', T.editDocument); }
  function editTitle(menuCls, fieldId, text) {
    var content = document.getElementById('content');
    var h2 = content && content.querySelector(':scope > h2');
    if (!h2 || content.querySelector(':scope > p.breadcrumb') || !once(h2, 'title')) return;
    var news = menuLink(menuCls);
    var titleField = document.getElementById(fieldId);
    var bc = el('p', 'breadcrumb gbd-breadcrumb');
    if (news) {
      var a = el('a', null, news.textContent.trim());
      a.href = news.getAttribute('href');
      bc.appendChild(a);
    }
    var back = location.pathname.replace(/\/edit$/, '');
    if (titleField && titleField.defaultValue.trim()) {
      if (news) bc.appendChild(el('span', 'gbd-sep', '\u203a'));
      var t = el('a', null, titleField.defaultValue.trim());
      t.href = back;
      bc.appendChild(t);
    }
    if (bc.firstChild) content.insertBefore(bc, h2);
    h2.textContent = text;
  }

  // Topic / reply edit: core titles the page with the subject; match 文書 / ニュース
  // (breadcrumb ends with the subject, the page title says what you are doing).
  function messageEditTitle() {
    var content = document.getElementById('content');
    var h2 = content && content.querySelector(':scope > h2');
    var bc = content && content.querySelector(':scope > p.breadcrumb');
    if (!h2 || !bc || !document.getElementById('message-form') || !once(h2, 'etitle')) return;
    var clone = h2.cloneNode(true);
    $all('.avatar, .gb-avatar', clone).forEach(function (x) { x.remove(); });
    var subject = clone.textContent.replace(/\s+/g, ' ').trim();
    if (subject) {
      bc.appendChild(el('span', 'gbd-sep', '\u203a'));
      var a = el('a', null, subject);
      a.href = location.pathname.replace(/\/edit$/, '');
      bc.appendChild(a);
    }
    h2.textContent = T.editMessage;
  }

  /* ---------------- Files create error: flash sits above the h2; move it below like documents/news ---------------- */
  function filesFlash() {
    var content = document.getElementById('content');
    var h2 = content && content.querySelector(':scope > h2');
    if (!h2) return;
    var anchor = h2;
    $all(':scope > div.flash.error, :scope > #errorExplanation', content).forEach(function (f) {
      if (!(f.compareDocumentPosition(h2) & Node.DOCUMENT_POSITION_FOLLOWING)) return;
      content.insertBefore(f, anchor.nextSibling);
      anchor = f;
    });
    // core builds 「ファイル は不正な値です」 from two generic strings (no dedicated key to override): say what to do instead
    $all(':scope > div.flash.error', content).forEach(function (f) {
      if (/^\s*\u30d5\u30a1\u30a4\u30eb\s*\u306f\u4e0d\u6b63\u306a\u5024\u3067\u3059\s*$/.test(f.textContent)) f.textContent = T.pickFile;
    });
  }

  /* ---------------- Message form errors: core doesn't wrap fields in .field_with_errors ---------------- */
  function messageErrors() {
    var form = document.getElementById('message-form');
    if (!form || !document.getElementById('errorExplanation') || !once(form, 'err')) return;
    var first = null;
    ['message_subject', 'message_content'].forEach(function (id) {
      var f = document.getElementById(id);
      if (f && !f.value.trim()) {
        f.setAttribute('aria-invalid', 'true');
        f.addEventListener('input', function () {
          if (f.value.trim()) f.removeAttribute('aria-invalid');
        });
        if (!first) first = f;
      }
    });
    if (first) first.focus();
  }

  /* ---------------- Cancel link on standalone new/edit pages ---------------- */
  function backHref() {
    var path = location.pathname;
    if (/\/edit$/.test(path)) return path.replace(/\/edit$/, '');
    var crumbs = document.querySelectorAll('#content > p.breadcrumb a[href]');
    if (crumbs.length && document.body.classList.contains('controller-messages')) return crumbs[crumbs.length - 1].getAttribute('href');
    var h2link = document.querySelector('#content > h2 > a[href]');
    if (h2link) return h2link.getAttribute('href');
    var c = document.body.classList;
    var mod = c.contains('controller-documents') ? 'documents' : c.contains('controller-files') ? 'files' :
      c.contains('controller-news') ? 'news' : c.contains('controller-messages') ? 'boards' : null;
    var m = mod && menuLink(mod);
    return m ? m.getAttribute('href') : null;
  }
  function cancelLink() {
    var form = document.querySelector('#content > form');
    if (!form || !once(form, 'cancel')) return;
    var submit = form.querySelector('input[type=submit][name=commit]');
    if (!submit || (submit.nextElementSibling && submit.nextElementSibling.tagName === 'A')) return;
    var href = backHref();
    if (!href) return;
    var c = el('a', 'gbd-cancel', T.cancel);
    c.href = href;
    var row = submit.parentNode;
    if (row.tagName !== 'P') {
      // files/new renders the submit as a bare child of the form: give it the same <p> action row as the other forms
      var p = el('p', null);
      row.insertBefore(p, submit);
      p.appendChild(submit);
      row = p;
    }
    submit.parentNode.insertBefore(c, submit.nextSibling);
    row.classList.add('gbd-actions');
  }

  /* ---------------- New forms: same 13px breadcrumb above the h2 as the edit / topic forms ---------------- */
  function newFormCrumb(menuCls) {
    var content = document.getElementById('content');
    var h2 = content && content.querySelector(':scope > h2');
    var link = menuLink(menuCls);
    if (!h2 || !link || content.querySelector(':scope > p.breadcrumb') || !once(h2, 'ncrumb')) return;
    var bc = el('p', 'breadcrumb gbd-breadcrumb');
    var a = el('a', null, link.textContent.trim());
    a.href = link.getAttribute('href');
    bc.appendChild(a);
    content.insertBefore(bc, h2);
  }

  /* ---------------- Files form: the version select reads マイルストーン like the rest of the UI ---------------- */
  // Fallback only: core labels it with field_version, which must stay 「バージョン」 elsewhere (/admin/plugins).
  function filesVersionLabel() {
    var lab = document.querySelector('#content label[for="version_id"]');
    if (!lab || !once(lab, 'ms')) return;
    Array.prototype.forEach.call(lab.childNodes, function (n) {
      if (n.nodeType === 3 && n.nodeValue.trim()) n.nodeValue = n.nodeValue.replace(n.nodeValue.trim(), T.milestone);
    });
  }

  /* ---------------- Sidebar watchers: same card as the issue page ---------------- */
  // 「ウォッチャー (2)」 -> 「ウォッチャー」 + count badge; round avatar instead of core's square one.
  function sidebarWatchers() {
    var box = document.querySelector('#sidebar #watchers');
    if (!box) return;
    box.classList.add('gbd-watchers');
    var h3 = box.querySelector(':scope > h3');
    if (h3 && !h3.querySelector('.gb-count')) {
      var m = h3.textContent.trim().match(/^(.*?)\s*\((\d+)\)$/);
      if (m) {
        h3.textContent = m[1];
        var b = el('span', 'gb-count', m[2]);
        h3.appendChild(b);
      }
    }
    $all('ul.watchers > li', box).forEach(function (li) {
      if (!once(li, 'w')) return;
      var user = li.querySelector('a.user');
      var core = li.querySelector('.avatar:not(.gb-avatar)');
      if (core) core.classList.add('gbd-core-avatar');
      li.insertBefore(avatar(user ? user.textContent.trim() : '', 20), li.firstChild);
    });
  }
  // watch / unwatch and add / remove watcher replace #watchers through rails-ujs (no jQuery ajax event)
  var watchObserver = null;
  function observeWatchers() {
    var wrap = document.getElementById('sidebar-wrapper');
    if (!wrap || watchObserver || !window.MutationObserver) return;
    watchObserver = new MutationObserver(function () {
      watchObserver.disconnect();
      sidebarWatchers();
      watchObserver.observe(wrap, { childList: true, subtree: true });
    });
    watchObserver.observe(wrap, { childList: true, subtree: true });
  }

  /* ---------------- Form pages: the browser tab names the screen (「新しい文書 - デモ（削除可） - Redmine」) ---------------- */
  function formDocTitle() {
    var h2 = document.querySelector('#content > h2');
    if (!h2) return;
    var clone = h2.cloneNode(true);
    $all('.avatar, .gb-avatar', clone).forEach(function (x) { x.remove(); });
    var t = clone.textContent.replace(/\s+/g, ' ').trim();
    if (!t || document.title.indexOf(t + ' - ') === 0) return;
    document.title = t + ' - ' + document.title;
  }

  function run() {
    var b = document.body;
    if (!b) return;
    var c = b.classList;
    if (c.contains('controller-documents')) {
      if (c.contains('action-index')) documentsIndex();
      if (c.contains('action-show')) { documentsShow(); titleRow(document.getElementById('content')); }
      if (c.contains('action-edit') || c.contains('action-update')) documentEditTitle();
    }
    if (c.contains('controller-files') && c.contains('action-index')) filesIndex();
    if (c.contains('controller-files') && c.contains('action-create')) filesFlash();
    if (c.contains('controller-news')) {
      if (c.contains('action-index')) newsIndex();
      if (c.contains('action-show')) newsShow();
      if (c.contains('action-edit') || c.contains('action-update')) newsEditTitle();
    }
    if (c.contains('controller-boards')) {
      if (c.contains('action-index')) boardsIndex();
      if (c.contains('action-show')) boardsShow();
    }
    if (c.contains('controller-messages')) {
      if (c.contains('action-show')) messagesShow();
      else {
        messageForm();
        if (c.contains('action-new') || c.contains('action-create')) messageTitle();
        messageErrors();
      }
    }
    if (c.contains('controller-boards') && c.contains('action-show')) messageForm();
    inlinePanels();
    if (c.contains('action-index') && /(^|\s)controller-(documents|files|news|boards)(\s|$)/.test(b.className)) listTitleRow();
    if (c.contains('controller-boards') && c.contains('action-show')) listTitleRow();
    breadcrumb();
    if (c.contains('controller-messages') && (c.contains('action-edit') || c.contains('action-update'))) messageEditTitle();
    var isNew = c.contains('action-new') || c.contains('action-create');
    if (isNew && c.contains('controller-documents')) newFormCrumb('documents');
    if (isNew && c.contains('controller-news')) newFormCrumb('news');
    if (isNew && c.contains('controller-files')) { newFormCrumb('files'); filesVersionLabel(); }
    if (/(^|\s)controller-(documents|files|news|boards|messages)(\s|$)/.test(b.className)) { sidebarWatchers(); observeWatchers(); }
    dropzones();
    if (/(^|\s)action-(new|edit|create|update)(\s|$)/.test(b.className) &&
        /(^|\s)controller-(documents|files|news|messages)(\s|$)/.test(b.className)) { cancelLink(); formDocTitle(); }
  }

  GB.ready(run);
  GB.onAjax(run);
})();

// === 70-dashboard-project-home.js ===
// 70-dashboard-project-home: dashboard blocks + project home cards (owner: project-pages)
(function () {
  var GB = window.GB;

  // Server-provided names/wording (plugin hook view_layouts_base_html_head).
  GB.pageData = GB.pageData || function () {
    if (GB._pageData !== undefined) return GB._pageData;
    var el = document.getElementById('gb-data');
    var data = null;
    try { data = el ? JSON.parse(el.textContent) : null; } catch (e) { data = null; }
    GB._pageData = data || { statuses: [], trackers: [], actions: {}, text: {} };
    return GB._pageData;
  };

  // Issue key "DEMO-21" for an issue id; the project comes from its name (cross-project pages,
  // via gb-data.projects) or from the body class (project pages). Shared with 75-project-pages.
  GB.ppIssueKey = GB.ppIssueKey || function (id, projectName) {
    var ident = null;
    var name = String(projectName || '').replace(/\s+/g, ' ').trim();
    if (name) {
      var list = GB.pageData().projects || [];
      for (var i = 0; i < list.length; i++) {
        if (list[i].name === name) { ident = list[i].identifier; break; }
      }
    }
    if (!ident && GB.il && typeof GB.il.bodyProject === 'function') ident = GB.il.bodyProject();
    return GB.issueKey(ident, id);
  };

  function avatarIndex(name) {
    if (typeof GB.avatarIndex === 'function') return GB.avatarIndex(name);
    var s = 0, str = String(name || '');
    for (var i = 0; i < str.length; i++) s += str.charCodeAt(i);
    return s % 8;
  }

  function makeAvatar(name, size) {
    if (typeof GB.avatar === 'function') {
      var made = GB.avatar(name, size);
      if (made && made.nodeType === 1) return made;
    }
    var span = document.createElement('span');
    span.className = 'gb-avatar gb-avatar--' + size;
    span.setAttribute('aria-hidden', 'true');
    span.setAttribute('data-av', String(avatarIndex(name)));
    span.textContent = GB.initial(name);
    return span;
  }

  // ---------- dashboard ----------
  // "(2)" after a block title -> count badge; issue blocks get a "すべて見る" link.
  function decorateBlocks(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('#my-page .mypage-box > h3').forEach(function (h3) {
      if (h3.getAttribute('data-gb-done')) return;
      h3.setAttribute('data-gb-done', '1');
      var link = h3.querySelector('a[href]');
      Array.prototype.slice.call(h3.childNodes).forEach(function (n) {
        if (n.nodeType !== 3) return;
        var m = n.nodeValue.match(/^\s*\((\d+)\)\s*$/);
        if (m) {
          var badge = document.createElement('span');
          badge.className = 'gb-count';
          badge.textContent = m[1];
          h3.replaceChild(badge, n);
        } else if (/^\s*$/.test(n.nodeValue)) {
          h3.removeChild(n);
        }
      });
      var box = h3.parentNode;
      var isQuery = box.querySelector('table.list.issues') || box.querySelector('div[id$="-settings"] #list-definition');
      if (isQuery && link && !h3.querySelector('.gb-box-link')) {
        var all = document.createElement('a');
        all.className = 'gb-box-link';
        all.href = link.getAttribute('href');
        var data = GB.pageData();
        all.textContent = (data.text && data.text.see_all) || 'すべて見る';
        h3.appendChild(all);
      }
    });
  }

  // Tracker column -> tracker badge placed in front of the subject (Backlog-like row:
  // badge + subject); the separate tracker column is then hidden by CSS.
  function decorateBlockTables() {
    document.querySelectorAll('#my-page table.list.issues').forEach(function (table) {
      var hasSubject = table.querySelector('td.subject');
      table.querySelectorAll('tr.issue').forEach(function (tr) {
        var td = tr.querySelector('td.tracker');
        if (!td || tr.getAttribute('data-gb-tracker')) return;
        tr.setAttribute('data-gb-tracker', '1');
        var text = td.textContent.trim();
        if (!text) return;
        var m = String(tr.className).match(/(?:^|\s)tracker-(\d+)(?:\s|$)/);
        var pill = document.createElement('span');
        pill.className = 'gb-tracker gb-tracker-' + (m ? m[1] : 'x');
        pill.textContent = text;
        var subject = tr.querySelector('td.subject');
        if (subject) {
          subject.insertBefore(pill, subject.firstChild);
          var a = subject.querySelector('a');
          if (a && !a.getAttribute('title')) a.setAttribute('title', a.textContent.trim());
        } else {
          td.textContent = '';
          td.appendChild(pill);
        }
      });
      if (hasSubject) table.classList.add('gb-inline-tracker');
      // # column: "21" -> "DEMO-21" (same key format as the issue list)
      table.querySelectorAll('tr.issue > td.id > a').forEach(function (a) {
        if (a.getAttribute('data-gb-key')) return;
        var id = (a.textContent.match(/\d+/) || [])[0];
        if (!id) return;
        var tr = a.closest('tr');
        var proj = tr.querySelector('td.project');
        a.setAttribute('data-gb-key', '1');
        a.textContent = GB.ppIssueKey(id, proj ? proj.textContent : '');
      });
      // status cell -> pill (GB.badge from 40-issue-list; idempotent)
      table.querySelectorAll('tr.issue').forEach(function (tr) {
        var st = tr.querySelector('td.status');
        if (!st || st.querySelector('.gb-status')) return;
        if (typeof GB.badge === 'function') GB.badge(st, GB.statusIdOf(tr));
      });
      // subjects without a tracker column still get a full-text tooltip
      table.querySelectorAll('td.subject > a').forEach(function (a) {
        if (!a.getAttribute('title')) a.setAttribute('title', a.textContent.trim());
      });
      wrapSubjects(table);
    });
  }

  // badge + subject inside one 2-line clamp wrapper; the project name is repeated as a muted
  // second line, shown only when the block is too narrow for the プロジェクト column (CSS @container)
  function wrapSubjects(table) {
    table.querySelectorAll('tr.issue > td.subject').forEach(function (td) {
      if (td.querySelector(':scope > .gb-subj')) return;
      var wrap = document.createElement('div');
      wrap.className = 'gb-subj';
      while (td.firstChild) wrap.appendChild(td.firstChild);
      td.appendChild(wrap);
      // meta line: status pill (very narrow blocks only) + project name
      var meta = document.createElement('div');
      meta.className = 'gb-subj__meta';
      var status = td.parentNode.querySelector('td.status');
      var pill = status && (status.querySelector('.gb-status') || null);
      if (pill) {
        var st = pill.cloneNode(true);
        st.removeAttribute('id');
        st.classList.add('gb-subj__status');
        meta.appendChild(st);
      }
      var idLink = td.parentNode.querySelector('td.id > a');
      if (idLink) {
        var key = document.createElement('a');
        key.className = 'gb-subj__key';
        key.textContent = idLink.textContent.trim();
        key.href = idLink.getAttribute('href');
        key.setAttribute('tabindex', '-1');
        key.setAttribute('aria-hidden', 'true');
        meta.appendChild(key);
      }
      var project = td.parentNode.querySelector('td.project');
      var name = project ? project.textContent.replace(/\s+/g, ' ').trim() : '';
      if (name) {
        var p = document.createElement('span');
        p.className = 'gb-subj__project';
        p.textContent = name;
        meta.appendChild(p);
      }
      if (meta.firstChild) td.appendChild(meta);
    });
    // §6.7: the project line is hidden when every listed issue belongs to one project
    var names = {};
    table.querySelectorAll('tr.issue > td.project').forEach(function (td) {
      names[td.textContent.replace(/\s+/g, ' ').trim()] = true;
    });
    table.classList.toggle('gb-one-project', Object.keys(names).length <= 1);
  }

  function redecorateDashboard() {
    decorateBlockForm();
    decorateBlocks(document);
    decorateBlockTables();
  }

  // Redmine 6 remote forms/links (block settings, add/remove block) use rails-ujs,
  // which never fires jQuery's ajaxComplete: watch the dashboard DOM instead.
  function observeDashboard() {
    var content = document.getElementById('content');
    if (!content || !document.getElementById('my-page') || !window.MutationObserver) return;
    if (content.getAttribute('data-gb-observed')) return;
    content.setAttribute('data-gb-observed', '1');
    var queued = false;
    var run = function () {
      queued = false;
      try { redecorateDashboard(); } catch (e) { console.error('[greenboard]', e); }
    };
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      window.setTimeout(run, 0);
    }).observe(content, { childList: true, subtree: true });
    document.addEventListener('ajax:complete', function () { window.setTimeout(run, 0); });
  }

  function decorateBlockForm() {
    var form = document.getElementById('block-form');
    if (!form || form.getAttribute('data-gb-done')) return;
    form.setAttribute('data-gb-done', '1');
    var select = form.querySelector('select');
    var label = form.querySelector('label');
    var data = GB.pageData();
    var text = data.text && data.text.add_block;
    // Drop the stray ":" text node that follows the label.
    Array.prototype.slice.call(form.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && /^\s*:\s*$/.test(n.nodeValue)) form.removeChild(n);
    });
    if (select && text) {
      var first = select.options[0];
      if (first && !first.value) {
        // keep an explicit empty value so core's $('#block-select').val('') still selects it
        first.setAttribute('value', '');
        first.textContent = text;
        if (select.selectedIndex < 0) select.selectedIndex = 0;
      }
      if (label) label.classList.add('gb-visually-hidden');
      select.setAttribute('aria-label', text);
    }
  }

  function watchDrag() {
    if (!window.jQuery) return;
    var $ = window.jQuery;
    $(document).on('sortstart', '#my-page .block-receiver', function () {
      $('#my-page .block-receiver').addClass('gb-dragging');
    });
    $(document).on('sortstop', '#my-page .block-receiver', function () {
      $('#my-page .block-receiver').removeClass('gb-dragging');
    });
  }

  // ---------- project home ----------
  function linkRow(p) {
    if (!p || p.classList.contains('gb-linkrow') || p.classList.contains('gb-box-foot')) return;
    var links = p.querySelectorAll('a');
    if (!links.length) return;
    // Only paragraphs made of links separated by "|".
    var text = p.textContent.replace(/\s+/g, '');
    var linkText = Array.prototype.map.call(links, function (a) { return a.textContent.replace(/\s+/g, ''); }).join('');
    if (text.replace(/\|/g, '') !== linkText) return;
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeType === 3) p.removeChild(n);
    });
    p.classList.add('gb-linkrow');
  }

  // project description card: 3-line clamp + 「もっと見る」 when it is longer than that
  function clampDescription(left) {
    var wiki = left && left.querySelector(':scope > .wiki');
    if (!wiki || wiki.getAttribute('data-gb-clamp') || !wiki.textContent.trim()) return;
    wiki.setAttribute('data-gb-clamp', '1');
    var t = (GB.pageData ? GB.pageData().text : {}) || {};
    if (!t.show_more) return;
    var body = document.createElement('div');
    body.className = 'gb-desc__body';
    body.id = 'gb-project-desc';
    while (wiki.firstChild) body.appendChild(wiki.firstChild);
    wiki.appendChild(body);
    wiki.classList.add('gb-desc', 'is-clamped');
    if (body.scrollHeight <= body.clientHeight + 1) { wiki.classList.remove('is-clamped'); return; }
    var more = document.createElement('button');
    more.type = 'button';
    more.className = 'gb-desc__more';
    more.setAttribute('aria-controls', body.id);
    var label = function () {
      var collapsed = wiki.classList.contains('is-clamped');
      more.textContent = collapsed ? t.show_more : (t.show_less || '');
      more.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    };
    label();
    more.addEventListener('click', function () { wiki.classList.toggle('is-clamped'); label(); });
    wiki.appendChild(more);
  }

  function decorateProjectHome() {
    var content = document.querySelector('.controller-projects.action-show #content');
    if (!content || content.getAttribute('data-gb-home')) return;
    content.setAttribute('data-gb-home', '1');
    var left = content.querySelector('.splitcontentleft');
    var right = content.querySelector('.splitcontentright');

    // Backlog-like: left column = description + 最近の更新; summary cards on the right.
    if (left && right) {
      ['.issues.box', '.spent_time.box'].forEach(function (sel) {
        var box = left.querySelector(':scope > ' + sel);
        if (box) right.appendChild(box);
      });
    }

    content.querySelectorAll('.splitcontent .box > p').forEach(linkRow);

    // 課題トラッキング: same header as the other cards — 「すべて見る」 (all issues) on the right instead
    // of the zoom icon; the link row keeps the views that are not in the header.
    var issues = content.querySelector('.issues.box');
    var issuesH3 = issues && issues.querySelector(':scope > h3');
    var row = issues && issues.querySelector(':scope > p.gb-linkrow');
    var allLink = row && row.querySelector('a[href$="/issues?set_filter=1"]');
    if (issuesH3 && allLink && !issuesH3.querySelector('.gb-box-link')) {
      var zoom = issuesH3.querySelector('a.icon-zoom-in');
      var seeAll = document.createElement('a');
      seeAll.className = 'gb-box-link';
      seeAll.href = allLink.getAttribute('href');
      seeAll.title = allLink.textContent.trim();
      seeAll.textContent = (GB.pageData().text && GB.pageData().text.see_all) || allLink.textContent;
      if (zoom) zoom.parentNode.removeChild(zoom);
      Array.prototype.slice.call(issuesH3.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && !n.nodeValue.replace(/\u00a0/g, ' ').trim()) issuesH3.removeChild(n);
      });
      issuesH3.appendChild(seeAll);
      allLink.parentNode.removeChild(allLink);
    }
    clampDescription(left);

    // 時間管理: "予定工数: 0:00時間" -> label + value (H:MM in one size, unit small)
    content.querySelectorAll('.spent_time.box > ul > li').forEach(function (li) {
      if (li.querySelector('.gb-stat__value')) return;
      var m = li.textContent.trim().match(/^(.+?)[:：]\s*(.+)$/);
      if (!m) return;
      li.textContent = m[1];
      var v = document.createElement('span');
      v.className = 'gb-stat__value';
      var parts = m[2].match(/^([\d:.,]+)\s*(.*)$/);
      v.textContent = parts ? parts[1] : m[2];
      if (parts && parts[2]) {
        var unit = document.createElement('span');
        unit.className = 'gb-unit';
        unit.textContent = parts[2];
        v.appendChild(unit);
      }
      li.appendChild(v);
    });

    // 最新ニュース: the bottom "すべてのニュースを表示" link -> "すべて見る" in the card header
    var news = content.querySelector('.news.box');
    var newsH3 = news && news.querySelector(':scope > h3');
    var newsAll = news && news.querySelector(':scope > p:last-child > a:only-child');
    if (newsH3 && newsAll && !newsH3.querySelector('.gb-box-link') && /\/news\/?$/.test(newsAll.pathname)) {
      var see = document.createElement('a');
      see.className = 'gb-box-link';
      see.href = newsAll.getAttribute('href');
      see.textContent = (GB.pageData().text && GB.pageData().text.see_all) || newsAll.textContent;
      see.title = newsAll.textContent.trim();
      newsH3.appendChild(see);
      newsAll.parentNode.parentNode.removeChild(newsAll.parentNode);
    }

    // メンバー: "管理者: a, b" -> role heading + avatar chips
    var members = content.querySelector('.members.box');
    if (members && !members.querySelector('.gb-members')) {
      var wrap = document.createElement('div');
      wrap.className = 'gb-members';
      var rows = members.querySelectorAll(':scope > p');
      rows.forEach(function (p) {
        var label = p.querySelector('.label');
        var users = p.querySelectorAll('a');
        if (!label || !users.length) return;
        var role = document.createElement('div');
        role.className = 'gb-members__role';
        role.textContent = label.textContent.replace(/[:：]\s*$/, '');
        var ul = document.createElement('ul');
        ul.className = 'gb-members__list';
        users.forEach(function (a) {
          var li = document.createElement('li');
          var chip = document.createElement('a');
          chip.className = 'gb-members__chip';
          chip.href = a.getAttribute('href');
          var name = a.textContent.trim();
          chip.appendChild(makeAvatar(name, 20));
          var n = document.createElement('span');
          n.className = 'gb-members__name';
          n.textContent = name;
          chip.appendChild(n);
          li.appendChild(chip);
          ul.appendChild(li);
        });
        wrap.appendChild(role);
        wrap.appendChild(ul);
        p.parentNode.removeChild(p);
      });
      if (wrap.childNodes.length) members.appendChild(wrap);
    }
  }

  // ---------- round 9 ----------
  // Phones hide the header 「すべて見る」 (the title links to the same list): issue blocks that show fewer
  // rows than their count get a footer 「すべて見る（22件）」, so the rest is one obvious tap away.
  // (最近の更新 renders its own footer link server-side.)
  function addBlockFooters() {
    document.querySelectorAll('#my-page .mypage-box').forEach(function (box) {
      var h3 = box.querySelector(':scope > h3');
      var link = h3 && h3.querySelector('a.gb-box-link');
      var table = box.querySelector('table.list.issues');
      if (!link || !table) return;
      var badge = h3.querySelector('.gb-count');
      var total = badge ? parseInt(badge.textContent, 10) : NaN;
      var shown = table.querySelectorAll('tbody > tr.issue').length;
      var foot = box.querySelector(':scope > .gb-box-foot');
      if (!(total > shown)) {
        if (foot) foot.parentNode.removeChild(foot);
        return;
      }
      if (!foot) {
        foot = document.createElement('p');
        foot.className = 'gb-box-foot';
        foot.appendChild(document.createElement('a'));
        box.appendChild(foot);
      }
      var a = foot.firstChild;
      a.href = link.getAttribute('href');
      var t = GB.pageData().text || {};
      a.textContent = t.see_all_count ? t.see_all_count.replace('%{count}', String(total)) : link.textContent + ' (' + total + ')';
    });
  }

  // project home timeline length:
  //  - stacked (one column, <=1023px): 8 updates, then the footer 「すべて見る」 (CSS hides --extra)
  //  - two columns: as many updates as end level with the summary column on the right (--fit), at least 5;
  //    the rest is behind the header 「すべて見る」. Re-measured on resize.
  var HOME_TIMELINE_STACKED = 8;
  var HOME_TIMELINE_MIN = 5;
  function markTimelineDays(tl, cls) {
    tl.querySelectorAll('.gb-timeline__list').forEach(function (ul) {
      var hidden = !ul.querySelector('.gb-timeline__item:not(.gb-timeline__item--' + cls + ')');
      ul.classList.toggle('gb-timeline__list--' + cls, hidden);
      var h = ul.previousElementSibling;
      if (h && h.classList.contains('gb-timeline__day')) h.classList.toggle('gb-timeline__day--' + cls, hidden);
    });
  }
  function markTimelineExtras() {
    var tl = document.querySelector('.controller-projects.action-show .gb-activity .gb-timeline');
    if (!tl || tl.getAttribute('data-gb-extra')) return;
    tl.setAttribute('data-gb-extra', '1');
    tl.querySelectorAll('.gb-timeline__item').forEach(function (li, i) {
      if (i >= HOME_TIMELINE_STACKED) li.classList.add('gb-timeline__item--extra');
    });
    markTimelineDays(tl, 'extra');
    fitHomeTimeline();
    var timer = 0;
    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(fitHomeTimeline, 120);
    });
    window.addEventListener('load', fitHomeTimeline);
  }
  function fitHomeTimeline() {
    var box = document.querySelector('.controller-projects.action-show .gb-activity');
    var tl = box && box.querySelector('.gb-timeline');
    var left = box && box.closest('.splitcontentleft');
    var right = document.querySelector('.controller-projects.action-show #content .splitcontent > .splitcontentright');
    if (!tl || !left || !right) return;
    var items = tl.querySelectorAll('.gb-timeline__item');
    items.forEach(function (li) { li.classList.remove('gb-timeline__item--fit'); });
    markTimelineDays(tl, 'fit');
    if (window.matchMedia('(max-width: 1023px)').matches) return;
    var bottomOf = function (col) {
      var b = 0;
      Array.prototype.forEach.call(col.children, function (c) {
        if (c.offsetHeight) b = Math.max(b, c.getBoundingClientRect().bottom);
      });
      return b;
    };
    var target = bottomOf(right);
    var prevDiff = bottomOf(left) - target;
    for (var i = items.length - 1; i >= HOME_TIMELINE_MIN && prevDiff > 0; i--) {
      items[i].classList.add('gb-timeline__item--fit');
      markTimelineDays(tl, 'fit');
      var diff = bottomOf(left) - target;
      if (diff <= 0) {
        // keep whichever ending is closer to the right column's
        if (-diff > prevDiff) {
          items[i].classList.remove('gb-timeline__item--fit');
          markTimelineDays(tl, 'fit');
        }
        break;
      }
      prevDiff = diff;
    }
  }

  GB.ready(function () {
    markTimelineExtras();
    decorateBlockForm();
    decorateBlocks(document);
    decorateBlockTables();
    decorateProjectHome();
    watchDrag();
    observeDashboard();
    addBlockFooters();
  });
  GB.onAjax(function () {
    decorateBlocks(document);
    decorateBlockTables();
    addBlockFooters();
  });
})();

// === 75-project-pages.js ===
// 75-project-pages: activity timeline, roadmap / version, calendar, time entries (owner: project-pages)
(function () {
  var GB = window.GB;

  function data() {
    if (typeof GB.pageData === 'function') return GB.pageData();
    return { statuses: [], trackers: [], actions: {}, text: {} };
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function avatarIndex(name) {
    if (typeof GB.avatarIndex === 'function') return GB.avatarIndex(name);
    var s = 0, str = String(name || '');
    for (var i = 0; i < str.length; i++) s += str.charCodeAt(i);
    return s % 8;
  }
  function makeAvatar(name, size) {
    if (typeof GB.avatar === 'function') {
      var made = GB.avatar(name, size);
      if (made && made.nodeType === 1) return made;
    }
    var span = el('span', 'gb-avatar gb-avatar--' + size, GB.initial(name));
    span.setAttribute('aria-hidden', 'true');
    span.setAttribute('data-av', String(avatarIndex(name)));
    return span;
  }
  function trackerBadge(name, id) {
    return el('span', 'gb-tracker gb-tracker-' + (id || 'x'), name);
  }
  function statusPill(name, id) {
    return el('span', 'gb-status gb-status-' + (id || 'x'), name);
  }
  function classNum(node, prefix) {
    var m = node && String(node.className).match(new RegExp('(?:^|\\s)' + prefix + '-(\\d+)(?:\\s|$)'));
    return m ? m[1] : null;
  }

  // issue key "DEMO-21" (GB.ppIssueKey lives in 70-dashboard-project-home.js)
  function issueKey(id, projectName) {
    if (typeof GB.ppIssueKey === 'function') return GB.ppIssueKey(id, projectName);
    return '#' + id;
  }

  // ---------- activity (/activity, /projects/:id/activity): the list itself is C-timeline (15-c-timeline.js) ----------
  // sidebar filter: the first heading repeats the page title; say what the date field is instead
  function decorateActivityFilter() {
    var form = document.querySelector('.controller-activities #activity_scope_form');
    if (!form || form.getAttribute('data-gb-done')) return;
    form.setAttribute('data-gb-done', '1');
    var t = data().text || {};
    var h3 = form.querySelector(':scope > h3');
    var date = form.querySelector('#from');
    if (h3 && date && t.activity_period) {
      var label = document.createElement('label');
      label.className = 'gb-act-filter__label';
      label.htmlFor = 'from';
      label.textContent = t.activity_period;
      h3.parentNode.replaceChild(label, h3);
    }
    var submit = form.querySelector('input[type="submit"]');
    if (submit && submit.parentNode.tagName === 'P') submit.parentNode.classList.add('gb-act-filter__submit');
  }

  // ---------- roadmap / version: related issue rows ----------
  function decorateRelatedIssues(root) {
    var d = data();
    root.querySelectorAll('table.related-issues').forEach(function (table) {
      if (table.getAttribute('data-gb-done')) return;
      table.setAttribute('data-gb-done', '1');
      var rows = table.querySelectorAll('tr.issue');
      rows.forEach(function (tr) {
        var subject = tr.querySelector('td.subject');
        var link = subject && subject.querySelector('a.issue');
        if (link && !subject.querySelector('.gb-tracker')) {
          var m = link.textContent.trim().match(/^(.+?) #(\d+)$/);
          var trackerId = classNum(tr, 'tracker');
          if (m) {
            subject.insertBefore(trackerBadge(m[1], trackerId), subject.firstChild);
            link.textContent = issueKey(m[2]);
            link.classList.add('gb-rel__key');
            // ": 件名" text node -> plain subject span
            var next = link.nextSibling;
            if (next && next.nodeType === 3) {
              var s = el('span', 'gb-rel__subject', next.nodeValue.replace(/^\s*:\s*/, ''));
              subject.replaceChild(s, next);
            }
          }
        }
        var statusId = classNum(tr, 'status');
        var st = byId(d.statuses || [], statusId);
        if (st && !tr.querySelector('td.gb-rel__status')) {
          var td = el('td', 'gb-rel__status');
          td.appendChild(statusPill(st.name, st.id));
          var buttons = tr.querySelector('td.buttons');
          tr.insertBefore(td, buttons || null);
        }
      });
      // Collapse long lists after 10 rows.
      var LIMIT = 10;
      if (rows.length > LIMIT) {
        for (var i = LIMIT; i < rows.length; i++) rows[i].classList.add('gb-rel__extra');
        table.classList.add('is-collapsed');
        var more = el('button', 'gb-rel__more');
        more.type = 'button';
        var label = function () {
          var collapsed = table.classList.contains('is-collapsed');
          more.textContent = collapsed
            ? ((d.text && d.text.show_all) || '') + ' (' + rows.length + ')'
            : ((d.text && d.text.show_less) || '');
          more.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        };
        label();
        more.addEventListener('click', function () {
          table.classList.toggle('is-collapsed');
          label();
        });
        table.parentNode.insertBefore(more, table.nextSibling);
      }
    });
  }

  // progress-info: "5 課題 (1件完了 — 4件未完了)" -> tidy separators
  function decorateVersionOverview(root) {
    root.querySelectorAll('.version-overview p.progress-info').forEach(function (p) {
      if (p.getAttribute('data-gb-done')) return;
      p.setAttribute('data-gb-done', '1');
      Array.prototype.slice.call(p.childNodes).forEach(function (n) {
        if (n.nodeType !== 3) return;
        var t = n.nodeValue.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
        if (/^\s*$/.test(t)) { p.removeChild(n); return; }
        t = t.replace(/\(/g, '\uff08').replace(/\)/g, '\uff09').replace(/\s*\u2014\s*/g, '\u30fb').trim();
        p.replaceChild(el('span', 'gb-sep', t), n);
      });
    });
  }

  // Rows are filtered by the sidebar's tracker checkboxes while the overview counts every issue:
  // say so under the list, with a link that shows all trackers.
  function roadmapAllTrackersUrl() {
    var boxes = document.querySelectorAll('#sidebar input[type="checkbox"][name="tracker_ids[]"]');
    if (!boxes.length) return null;
    var url = new URL(window.location.href);
    url.searchParams.delete('tracker_ids[]');
    boxes.forEach(function (b) { url.searchParams.append('tracker_ids[]', b.value); });
    var form = boxes[0].form;
    if (form) {
      form.querySelectorAll('input[type="checkbox"]:checked:not([name="tracker_ids[]"])').forEach(function (c) {
        if (!url.searchParams.has(c.name)) url.searchParams.append(c.name, c.value);
      });
    }
    return url.pathname + url.search;
  }
  function decorateRoadmapFilterNote(root) {
    var d = data();
    var tpl = d.text && d.text.roadmap_filtered;
    if (!tpl) return;
    var unchecked = document.querySelector('#sidebar input[type="checkbox"][name="tracker_ids[]"]:not(:checked)');
    if (!unchecked) return;
    root.querySelectorAll('.controller-versions .version-overview').forEach(function (ov) {
      var scope = ov.closest('article') || ov.closest('#roadmap');
      if (!scope || scope.getAttribute('data-gb-filter-note')) return;
      scope.setAttribute('data-gb-filter-note', '1');
      var countLink = ov.querySelector('p.progress-info a');
      var total = countLink ? parseInt(countLink.textContent.replace(/[^\d]/g, ''), 10) : NaN;
      var table = scope.querySelector('table.related-issues');
      var shown = table ? table.querySelectorAll('tr.issue').length : 0;
      if (!(total > shown)) return;
      var note = el('p', 'gb-filter-note');
      note.appendChild(document.createTextNode(tpl.replace('%{total}', total).replace('%{shown}', shown) + ' '));
      var href = roadmapAllTrackersUrl();
      if (href && d.text.roadmap_all_trackers) {
        var a = el('a', 'gb-filter-note__link', d.text.roadmap_all_trackers);
        a.href = href;
        note.appendChild(a);
      }
      // read together with the count: right-aligned in the 関連する課題 heading row when there is one
      var caption = table && table.querySelector(':scope > caption');
      if (caption) {
        var span = el('span', 'gb-filter-note gb-filter-note--caption');
        while (note.firstChild) span.appendChild(note.firstChild);
        caption.appendChild(span);
        return;
      }
      var after = table ? (table.closest('form') || table) : ov;
      after.parentNode.insertBefore(note, after.nextSibling);
    });
  }

  // "7:30時間" -> one size for H:MM, unit 時間 in small muted text
  function splitHoursUnit(container) {
    if (!container || container.querySelector('.gb-unit')) return;
    var last = container.lastChild;
    while (last && last.nodeType === 3 && !last.nodeValue.trim()) last = last.previousSibling;
    if (!last || last.nodeType !== 3) return;
    var m = last.nodeValue.match(/^([\s\S]*?)\s*([^\d:.,\s][\s\S]*?)\s*$/);
    if (!m || !m[2]) return;
    last.nodeValue = m[1];
    container.insertBefore(el('span', 'gb-unit', m[2]), last.nextSibling);
  }
  function decorateVersionHours(root) {
    root.querySelectorAll('.controller-versions #version-summary .time-tracking td.total-hours a').forEach(splitHoursUnit);
  }

  // ---------- calendar: month title between prev / next ----------
  function decorateCalendar() {
    var form = document.querySelector('.controller-calendars #content form#query_form');
    var cal = document.querySelector('.controller-calendars #content ul.cal');
    if (!form || !cal || document.querySelector('.gb-cal-nav')) return;
    var pages = form.querySelector('.contextual.pagination');
    var month = form.querySelector('select#month');
    var year = form.querySelector('select#year');
    var yearLabel = form.querySelector('label[for="year"]');
    var nav = el('div', 'gb-cal-nav');
    var title = el('h3', 'gb-cal-nav__title');
    if (month && year) {
      // 「2026年 11月」 (the year options may already read 「2026年」: orderPeriodControls)
      var yearOption = (data().text || {}).year_option;
      var yearText = yearOption ? yearOption.replace('%{year}', year.value)
        : year.options[year.selectedIndex].text + (yearLabel ? yearLabel.textContent.trim() : '');
      title.textContent = yearText + ' ' + month.options[month.selectedIndex].text;
    }
    if (pages) {
      var prev = pages.querySelector('li.previous a');
      var next = pages.querySelector('li.next a');
      if (prev) { prev.classList.add('gb-cal-nav__btn', 'gb-cal-nav__btn--prev'); nav.appendChild(prev); }
      nav.appendChild(title);
      if (next) { next.classList.add('gb-cal-nav__btn', 'gb-cal-nav__btn--next'); nav.appendChild(next); }
      pages.classList.add('gb-cal-nav__src');
    } else {
      nav.appendChild(title);
    }
    var holder = cal.closest('form') || cal;
    holder.parentNode.insertBefore(nav, holder);
    if (!cal.parentNode.classList.contains('gb-cal-scroll')) {
      var scroller = el('div', 'gb-cal-scroll');
      cal.parentNode.insertBefore(scroller, cal);
      scroller.appendChild(cal);
    }

    // Phone list mode (core stacks the days): a full "11/22（日）" label per day.
    var monthNo = month ? parseInt(month.value, 10) : NaN;
    if (monthNo) {
      var seenThisMonth = false;
      cal.querySelectorAll(':scope > li.calbody').forEach(function (li) {
        var num = li.querySelector('p.day-num');
        if (!num || num.querySelector('.gb-cal-date')) return;
        var inMonth = li.classList.contains('this-month');
        if (inMonth) seenThisMonth = true;
        var mo = inMonth ? monthNo : (seenThisMonth ? monthNo % 12 + 1 : (monthNo + 10) % 12 + 1);
        var dayNo = parseInt(num.textContent, 10);
        var abbr = num.querySelector('.abbr-day');
        var wd = abbr ? abbr.textContent.replace(/[()（）\s]/g, '') : '';
        if (!dayNo) return;
        var label = el('span', 'gb-cal-date', mo + '/' + dayNo + (wd ? '\uff08' + wd + '\uff09' : ''));
        label.setAttribute('aria-hidden', 'true');
        num.appendChild(label);
        if (!li.querySelector(':scope > :not(p.day-num)')) li.classList.add('gb-cal-empty');
      });
    }

    // Chips: "バグ #14: 件名" -> "#14 件名" (status colour bar + tooltip carry the rest).
    cal.querySelectorAll('div.issue').forEach(function (chip) {
      var link = chip.querySelector(':scope > a.issue');
      if (!link || chip.getAttribute('data-gb-done')) return;
      chip.setAttribute('data-gb-done', '1');
      var full = link.textContent.trim();
      var m = full.match(/^(.+?) #(\d+)$/);
      var next = link.nextSibling;
      var subject = next && next.nodeType === 3 ? next.nodeValue.replace(/^\s*:\s*/, '').trim() : '';
      if (m) {
        link.textContent = issueKey(m[2]);
        link.setAttribute('aria-label', full + (subject ? ': ' + subject : ''));
      }
      if (next && next.nodeType === 3) {
        chip.replaceChild(el('span', 'gb-cal-chip__subject', subject), next);
      }
    });
    collapseCalendarDays(cal);
  }

  // Busy days: show 3 chips and a 「+n件」 toggle for the rest, so one day cannot stretch the whole week.
  var CAL_MAX_CHIPS = 4;
  var CAL_VISIBLE_CHIPS = 3;
  function collapseCalendarDays(cal) {
    var text = data().text || {};
    cal.querySelectorAll(':scope > li.calbody').forEach(function (li) {
      if (li.querySelector(':scope > .gb-cal-more')) return;
      var chips = li.querySelectorAll(':scope > div.issue, :scope > div.version');
      if (chips.length <= CAL_MAX_CHIPS) return;
      for (var i = CAL_VISIBLE_CHIPS; i < chips.length; i++) chips[i].classList.add('gb-cal-chip--extra');
      var more = (text.cal_more || '+%{count}').replace('%{count}', String(chips.length - CAL_VISIBLE_CHIPS));
      var btn = el('button', 'gb-cal-more', more);
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var open = li.classList.toggle('gb-cal-day--expanded');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? (text.show_less || '-') : more;
      });
      li.appendChild(btn);
    });
  }

  // ---------- milestone (version) form: キャンセル next to 作成 / 保存 ----------
  function decorateVersionForm() {
    var form = document.querySelector('body.controller-versions #content form.new_version, body.controller-versions #content form.edit_version');
    if (!form || form.querySelector('.gb-form-cancel')) return;
    var submit = form.querySelector('input[type=submit]');
    if (!submit) return;
    var action = form.getAttribute('action') || '';
    // new: /projects/:id/versions -> /projects/:id/roadmap ; edit: /versions/:id -> the version page
    var href = /\/projects\/[^/]+\/versions\/?$/.test(action) ? action.replace(/\/versions\/?$/, '/roadmap') : action;
    if (!href) return;
    var text = data().text || {};
    var c = el('a', 'gb-form-cancel', text.cancel || 'Cancel');
    c.href = href;
    submit.parentNode.insertBefore(c, submit.nextSibling);
  }

  // ---------- time entries: total as a stat chip ----------
  function decorateTimeTotals() {
    document.querySelectorAll('.controller-timelog p.query-totals').forEach(function (p) {
      if (p.getAttribute('data-gb-done')) return;
      p.setAttribute('data-gb-done', '1');
      var t = data().text || {};
      p.querySelectorAll(':scope > span').forEach(function (s) {
        s.classList.add('gb-total-chip');
        var label = s.querySelector('span:not(.value)');
        var value = s.querySelector('.value');
        if (!label) return;
        var name = label.textContent.replace(/[:：]\s*$/, '').trim();
        // 時間: 12:15 -> 合計 12:15 時間 (other totals keep their column name)
        if (s.classList.contains('total-for-hours') && t.total && value) {
          label.textContent = t.total;
          if (t.hours_unit && !s.querySelector('.gb-unit')) value.parentNode.insertBefore(el('span', 'gb-unit', t.hours_unit), value.nextSibling);
          s.setAttribute('title', name);
        } else {
          label.textContent = name;
        }
      });
    });
  }

  // list: one-line cells with the full text as a tooltip; small avatar in front of the user
  function decorateTimeList() {
    document.querySelectorAll('.controller-timelog table.list.time-entries').forEach(function (table) {
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        if (tr.getAttribute('data-gb-done')) return;
        tr.setAttribute('data-gb-done', '1');
        ['td.issue', 'td.comments', 'td.project'].forEach(function (sel) {
          var td = tr.querySelector(sel);
          if (td && !td.title && td.textContent.trim()) td.title = td.textContent.replace(/\s+/g, ' ').trim();
        });
        var user = tr.querySelector('td.user');
        var a = user && user.querySelector('a');
        if (a && !user.querySelector('.avatar, .gb-avatar')) user.insertBefore(makeAvatar(a.textContent.trim(), 20), user.firstChild);
        // narrow lists show the avatar only: the name stays in the link (visually hidden) and its title
        if (a && !a.querySelector('.gb-te-user__name')) {
          var name = a.textContent.trim();
          a.title = name;
          a.textContent = '';
          a.appendChild(el('span', 'gb-te-user__name', name));
        }
        decorateTimeIssueCell(tr.querySelector('td.issue'));
        var comments = tr.querySelector('td.comments');
        if (comments && comments.textContent.trim() && !comments.querySelector('.gb-te-comment')) {
          var c = el('span', 'gb-te-comment');
          while (comments.firstChild) c.appendChild(comments.firstChild);
          comments.appendChild(c);
        }
        // the same comment as a second line under 課題, shown when the コメント column gives way
        var issueTd = tr.querySelector('td.issue');
        var note = comments && comments.textContent.replace(/\s+/g, ' ').trim();
        if (issueTd && note && !issueTd.querySelector('.gb-te-note')) {
          var n = el('span', 'gb-te-note', note);
          n.title = note;
          n.setAttribute('aria-hidden', 'true');
          issueTd.appendChild(n);
        }
        // "2026/11/22" -> the year can be dropped on narrow lists
        var day = tr.querySelector('td.spent_on');
        var dm = day && !day.querySelector('.gb-te-year') && day.textContent.trim().match(/^(\d{4}[\/.\-])(.+)$/);
        if (dm) {
          day.textContent = '';
          day.appendChild(el('span', 'gb-te-year', dm[1]));
          day.appendChild(document.createTextNode(dm[2]));
        }
        // phones: the ユーザー column folds into the date cell (avatar before the date)
        var av = user && user.querySelector('.gb-avatar');
        if (day && av && !day.querySelector('.gb-te-day-avatar')) {
          var copy = av.cloneNode(true);
          copy.classList.add('gb-te-day-avatar');
          if (a) copy.title = a.title || a.textContent.trim();
          day.insertBefore(copy, day.firstChild);
        }
      });
    });
  }

  // 課題 cell: "バグ #1: 件名" -> [バグ] #1 件名 inside one clamp wrapper (2 lines)
  function decorateTimeIssueCell(td) {
    if (!td || td.querySelector('.gb-te-issue')) return;
    var wrap = el('span', 'gb-te-issue');
    var link = td.querySelector('a.issue');
    var m = link && link.textContent.trim().match(/^(.+?) #(\d+)$/);
    if (m) {
      var full = td.textContent.replace(/\s+/g, ' ').trim();
      var proj = td.parentNode && td.parentNode.querySelector('td.project');
      link.textContent = issueKey(m[2], proj ? proj.textContent : '');
      link.setAttribute('aria-label', full);
      wrap.appendChild(trackerBadge(m[1], classNum(link, 'tracker')));
      wrap.appendChild(document.createTextNode(' '));
      var next = link.nextSibling;
      wrap.appendChild(link);
      if (next && next.nodeType === 3) {
        wrap.appendChild(document.createTextNode(' '));
        wrap.appendChild(el('span', 'gb-te-subj', next.nodeValue.replace(/^\s*:\s*/, '')));
        next.parentNode.removeChild(next);
      }
    }
    while (td.firstChild) wrap.appendChild(td.firstChild);
    td.appendChild(wrap);
  }

  // new / edit form: DOM (= tab) order follows the visual grid
  //   課題 → 日付 | 時間 → ユーザー → 作業分類 → コメント
  function decorateTimeForm() {
    var box = document.querySelector('.controller-timelog form.new_time_entry > .box.tabular, .controller-timelog form.edit_time_entry > .box.tabular');
    if (!box) return;
    var pOf = function (id) {
      var f = box.querySelector(':scope > p > #' + id + ', :scope > p > label[for="' + id + '"]');
      return f ? f.parentNode : null;
    };
    var comments = pOf('time_entry_comments');
    var user = pOf('time_entry_user_id');
    var activity = pOf('time_entry_activity_id');
    // idempotent: only moves nodes that are not yet in place
    if (comments && activity && activity.nextElementSibling !== comments) box.insertBefore(activity, comments);
    if (user && activity && user.nextElementSibling !== activity) box.insertBefore(user, activity);
    var t = data().text || {};
    // core drops the "h:mm" hint when the form is re-rendered after a validation error
    var hours = box.querySelector('#time_entry_hours');
    if (hours && !hours.getAttribute('placeholder')) hours.setAttribute('placeholder', 'h:mm');
    var issue = box.querySelector('#time_entry_issue_id');
    if (issue && t.issue_search_placeholder && !issue.getAttribute('placeholder')) {
      issue.setAttribute('placeholder', t.issue_search_placeholder);
    }
    var h2 = document.querySelector('.controller-timelog #content > h2');
    if (h2 && !h2.getAttribute('data-gb-done')) {
      h2.setAttribute('data-gb-done', '1');
      var heading = box.closest('form.edit_time_entry') ? t.edit_time_title : t.log_time_title;
      if (heading) {
        h2.textContent = heading;
        if (document.title.indexOf(heading) !== 0) document.title = heading + ' - ' + document.title;
      }
    }
  }

  // report toolbar: drop the ":" text nodes after "詳細" / "追加" labels
  function decorateTimeReport() {
    var sel = document.querySelector('.controller-timelog.action-report #query_form select#columns');
    var p = sel && sel.parentNode;
    if (!p || p.getAttribute('data-gb-done')) return;
    p.setAttribute('data-gb-done', '1');
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && /^\s*:\s*$/.test(n.nodeValue)) p.removeChild(n);
    });
  }

  // ---------- round 4 ----------
  // roadmap / version sidebar: the tracker checkbox group is headed 「ロードマップ」 (= page name);
  // say what the checkboxes do instead
  function decorateRoadmapSidebar() {
    var t = data().text || {};
    if (!t.roadmap_tracker_heading) return;
    var box = document.querySelector('.controller-versions #sidebar input[type="checkbox"][name="tracker_ids[]"]');
    var form = box && box.form;
    if (!form || form.getAttribute('data-gb-done')) return;
    form.setAttribute('data-gb-done', '1');
    form.classList.add('gb-tracker-filter');
    var h3 = form.querySelector('h3');
    if (h3) h3.textContent = t.roadmap_tracker_heading;
  }

  // time entry form re-rendered with errors: focus the first invalid field (not the optional 課題
  // search) and repeat each message right under its field
  function decorateTimeFormErrors() {
    var form = document.querySelector('.controller-timelog form.new_time_entry, .controller-timelog form.edit_time_entry');
    var summary = document.getElementById('errorExplanation');
    if (!form || !summary || form.getAttribute('data-gb-errors')) return;
    form.setAttribute('data-gb-errors', '1');
    var items = Array.prototype.map.call(summary.querySelectorAll('li'), function (li) {
      return li.textContent.replace(/\s+/g, ' ').trim();
    });
    var first = null;
    // core marks invalid fields with label.error (Redmine's own form builder, no field_with_errors)
    form.querySelectorAll('label.error[for]').forEach(function (label) {
      var field = document.getElementById(label.getAttribute('for'));
      if (!field || field.type === 'hidden' || !form.contains(field)) return;
      if (!first) first = field;
      field.setAttribute('aria-invalid', 'true');
      var name = (GB.form ? GB.form.labelText(label) : label.textContent).replace(/[*＊:：]/g, '').replace(/\s+/g, ' ').trim();
      var msgs = name ? items.filter(function (m) { return m.indexOf(name) === 0; }) : [];
      if (!msgs.length) return;
      var next = field.nextElementSibling;
      if (next && next.classList.contains('gb-field-error')) return;
      var err = el('span', 'gb-field-error', msgs.join(' / '));
      err.id = field.id + '_gb_error';
      field.parentNode.insertBefore(err, field.nextSibling);
      var desc = field.getAttribute('aria-describedby');
      field.setAttribute('aria-describedby', (desc ? desc + ' ' : '') + err.id);
    });
    if (first) {
      document.querySelectorAll('.controller-timelog [autofocus]').forEach(function (n) { n.removeAttribute('autofocus'); });
      first.setAttribute('autofocus', 'autofocus');
      window.setTimeout(function () { first.focus(); }, 0);
    }
  }

  // time report: the 合計 column is sticky on the right; show an edge shadow while columns are
  // hidden behind it, and pin the second criteria column (e.g. 課題) next to the first
  function decorateTimeReportTable() {
    var table = document.querySelector('.controller-timelog #time-report');
    if (!table) return;
    if (!table.getAttribute('data-gb-done')) {
      table.setAttribute('data-gb-done', '1');
      var head = table.querySelectorAll('thead tr:first-child > th:not(.period):not(.total)');
      if (head.length >= 2) table.classList.add('gb-report--c2');
      var scroller = table.closest('.autoscroll');
      if (scroller) {
        scroller.classList.add('gb-report-scroll');
        var update = function () {
          var more = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
          scroller.classList.toggle('gb-scroll-more', more);
          scroller.classList.toggle('gb-scrolled', scroller.scrollLeft > 0);
        };
        scroller.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
      }
    }
  }

  // gantt: issues without dates have no bar — their "status 0%" label sits at the far left; mute it
  function decorateGantt() {
    document.querySelectorAll('.controller-gantts #gantt_area .task.label').forEach(function (n) {
      if (n.getAttribute('data-gb-done')) return;
      n.setAttribute('data-gb-done', '1');
      var left = parseFloat(n.style.left);
      if (!isNaN(left) && left <= 8) n.classList.add('gb-task-label--nobar');
    });
    // subject column: "バグ #14" -> "バグ DEMO-14" (same key format everywhere)
    document.querySelectorAll('.controller-gantts .gantt_subjects_column .issue-subject a.issue').forEach(function (a) {
      if (a.getAttribute('data-gb-key')) return;
      a.setAttribute('data-gb-key', '1');
      var m = a.textContent.trim().match(/^(.*?)#(\d+)$/);
      if (m) a.textContent = m[1] + issueKey(m[2]);
    });
    // zoom / month navigation: drop the "|" text between 「« 10月」 and 「12月 »」
    document.querySelectorAll('.controller-gantts #query_form_with_buttons > p.contextual, .controller-gantts #query_form_with_buttons > p.contextual > span').forEach(function (p) {
      Array.prototype.slice.call(p.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && /^[\s|\u00a0]*\|[\s|\u00a0]*$/.test(n.nodeValue)) n.nodeValue = ' ';
      });
    });
    // subject column width and key-only links: C-issue-row (15-c-issue-row.js, runs first)
    trimGantt();
  }

  // Core sizes the chart for 6 extra rows + 150px, leaving a blank band under the last row.
  // Every full-height layer is cut by the same amount from its ORIGINAL height (kept in data-gb-h0, so a
  // second run after the stylesheet / fonts settled gives the same result): the column bodies end on the
  // last row, and the outer boxes (chart area, subject / column containers) end right under the drawing
  // layer — keeping only the room a classic (non-overlay) scrollbar takes. The relation canvas follows.
  function trimGantt() {
    var area = document.getElementById('gantt_area');
    var table = area && area.closest('table.gantt-table');
    if (!table) return;
    var rows = table.querySelectorAll('.gantt_subjects_column .issue-subject, .gantt_subjects_column .project-name, .gantt_subjects_column .version-name');
    if (!rows.length) return;
    var top = area.getBoundingClientRect().top;
    var bottom = 0;
    rows.forEach(function (r) { bottom = Math.max(bottom, r.getBoundingClientRect().bottom - top); });
    var nodes = Array.prototype.slice.call(table.querySelectorAll('[style*="height"]'));
    nodes.forEach(function (n) {
      if (!n.hasAttribute('data-gb-h0')) n.setAttribute('data-gb-h0', String(parseFloat(n.style.height) || 0));
    });
    var areaH0 = parseFloat(area.getAttribute('data-gb-h0'));
    if (!areaH0 || !bottom) return;
    var delta = Math.floor(areaH0 - (bottom + 24));
    if (delta < 40) return;
    table.setAttribute('data-gb-trim', '1');
    var outers = [];
    nodes.forEach(function (n) {
      var h0 = parseFloat(n.getAttribute('data-gb-h0'));
      if (!(h0 > delta + 100)) return;
      if (Math.abs(h0 - areaH0) < 0.5) outers.push(n);
      else n.style.height = (h0 - delta) + 'px';
    });
    var contentB = 0;
    Array.prototype.forEach.call(area.children, function (c) {
      contentB = Math.max(contentB, c.offsetTop + c.offsetHeight);
    });
    var scrollbarH = Math.max(0, area.offsetHeight - area.clientHeight);
    var setOuter = function (h) { outers.forEach(function (n) { n.style.height = h + 'px'; }); };
    var outerH = Math.min(areaH0 - delta, Math.max(contentB, bottom) + scrollbarH);
    setOuter(outerH);
    // never trade the band for an inner vertical scroll
    var over = area.scrollHeight - area.clientHeight;
    if (over > 0) setOuter(Math.min(areaH0 - delta, outerH + over));
    var draw = document.getElementById('gantt_draw_area');
    var paper = window.draw_gantt;
    if (draw && paper && typeof paper.setSize === 'function') paper.setSize(draw.offsetWidth, draw.offsetHeight);
  }
  // the dev / theme stylesheet and the web font can land after ready: measure once more when loaded
  window.addEventListener('load', function () {
    if (document.querySelector('.controller-gantts #gantt_area')) trimGantt();
  });

  // time report: core shows 「設定」 as a separate link while the list keeps it in the … menu —
  // use the same … menu here (core's delegated .drdn-trigger handler opens it)
  function decorateTimeReportActions() {
    var ctx = document.querySelector('.controller-timelog.action-report #content > .contextual');
    if (!ctx || ctx.querySelector('.drdn')) return;
    var settings = ctx.querySelector(':scope > a.icon-settings');
    if (!settings) return;
    var label = (data().text && data().text.actions) || '';
    var drdn = el('span', 'drdn');
    var trigger = el('span', 'drdn-trigger');
    var btn = el('span', 'icon-only icon-actions');
    btn.title = label;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', label);
    var dots = typeof GB.svgIcon === 'function' ? GB.svgIcon(GB.spriteHref(), '3-bullets', 's18 icon-svg') : null;
    if (dots && dots.nodeType === 1) btn.appendChild(dots);
    btn.appendChild(el('span', 'icon-label', label));
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
    trigger.appendChild(btn);
    var content = el('div', 'drdn-content');
    var items = el('div', 'drdn-items');
    items.appendChild(settings);
    content.appendChild(items);
    drdn.appendChild(trigger);
    drdn.appendChild(content);
    ctx.appendChild(drdn);
    // 追加 select: name the empty first option
    var add = document.querySelector('.controller-timelog.action-report #query_form select#criterias');
    var first = add && add.options[0];
    var text = data().text && data().text.report_add;
    if (first && !first.value && text && !first.textContent.trim()) first.textContent = text;
  }

  // R5: the locale override turns label_version into 「マイルストーン」 for milestones, but core also
  // uses it for plugin versions (/admin/plugins) and wiki page versions (annotate): say バージョン there
  function restoreVersionWording() {
    var t = data().text || {};
    if (!t.version_label || !t.milestone_label || t.version_label === t.milestone_label) return;
    var body = document.body.classList;
    if (body.contains('controller-admin') && body.contains('action-plugins')) {
      document.querySelectorAll('#content table.list thead th').forEach(function (th) {
        if (th.textContent.trim() === t.milestone_label) th.textContent = t.version_label;
      });
    }
    if (body.contains('controller-wiki') && body.contains('action-annotate')) {
      var h2 = document.querySelector('#content > h2');
      var last = h2 && h2.lastChild;
      if (last && last.nodeType === 3 && last.nodeValue.indexOf(t.milestone_label) !== -1) {
        last.nodeValue = last.nodeValue.replace(t.milestone_label, t.version_label);
        document.title = document.title.replace(t.milestone_label, t.version_label);
      }
    }
  }

  // ---------- round 6 ----------
  // activity sidebar: the ユーザー select's empty option reads 「すべてのユーザー」 instead of a blank box
  function decorateActivityUserSelect() {
    var text = data().text && data().text.all_users;
    if (!text || !GB.form) return;
    // C-form helper (js/15-c-form.js); a listed exception: not muted, it means "all"
    document.querySelectorAll('.controller-activities #activity_scope_form select').forEach(function (sel) {
      GB.form.labelBlank(sel, text, false);
    });
  }

  // time report toolbar: each label stays with its select (「詳細 [月]」「追加 [項目を追加]」), so a wrap
  // moves the pair, never the label alone
  function pairReportControls() {
    var p = document.querySelector('.controller-timelog.action-report #query_form select#columns');
    p = p && p.parentNode;
    if (!p || p.getAttribute('data-gb-pairs')) return;
    p.setAttribute('data-gb-pairs', '1');
    p.querySelectorAll(':scope > label[for]').forEach(function (label) {
      var field = p.querySelector(':scope > #' + label.htmlFor);
      if (!field) return;
      var pair = el('span', 'gb-report-pair');
      p.insertBefore(pair, label);
      pair.appendChild(label);
      pair.appendChild(field);
    });
  }

  // ---------- round 8 ----------
  // time report: 「バグ #1: 件名」 -> [バグ] DEMO-1 件名 (the same key as the list tab and every other page)
  function decorateReportIssues() {
    document.querySelectorAll('.controller-timelog #time-report td.name > a.issue').forEach(function (link) {
      if (link.getAttribute('data-gb-key')) return;
      var m = link.textContent.trim().match(/^(.+?) #(\d+)$/);
      if (!m) return;
      link.setAttribute('data-gb-key', '1');
      var td = link.parentNode;
      var next = link.nextSibling;
      var subject = next && next.nodeType === 3 ? next.nodeValue.replace(/^\s*:\s*/, '') : '';
      link.setAttribute('title', m[1] + ' ' + issueKey(m[2]) + (subject ? ': ' + subject : ''));
      link.textContent = issueKey(m[2]);
      var wrap = el('span', 'gb-report-issue');
      td.insertBefore(wrap, link);
      wrap.appendChild(trackerBadge(m[1], classNum(link, 'tracker')));
      wrap.appendChild(document.createTextNode(' '));
      wrap.appendChild(link);
      if (next && next.nodeType === 3) {
        wrap.appendChild(document.createTextNode(' '));
        wrap.appendChild(el('span', 'gb-report-subj', subject));
        td.removeChild(next);
      }
    });
  }

  // roadmap / version related issues: every key gets the width of the longest one in its table, so the
  // subjects start on one line too (DEMO-1 / DEMO-12). Measured after the web font has loaded.
  function alignRelatedKeys() {
    document.querySelectorAll('.controller-versions table.related-issues').forEach(function (table) {
      var keys = table.querySelectorAll('a.gb-rel__key');
      if (!keys.length) return;
      table.style.removeProperty('--gb-rel-key-w');
      var max = 0;
      keys.forEach(function (k) { max = Math.max(max, k.getBoundingClientRect().width); });
      if (max) table.style.setProperty('--gb-rel-key-w', Math.ceil(max) + 'px');
    });
  }

  // calendar / gantt period: year first, then month, in Japanese order —
  //   calendar 「[2026年] [11月]」 (the 年 / 月 labels stay for screen readers only),
  //   gantt    「[2026年] [11月] から [6] ヶ月分」
  // Nodes are moved (not restyled with order) so the tab order follows what is seen.
  function orderPeriodControls() {
    var month = document.querySelector('.controller-calendars #query_form select#month, .controller-gantts #query_form select#month');
    var year = month && month.parentNode.querySelector(':scope > select#year');
    var p = month && month.parentNode;
    if (!year || p.getAttribute('data-gb-period')) return;
    p.setAttribute('data-gb-period', '1');
    var t = data().text || {};
    if (t.year_option) {
      Array.prototype.forEach.call(year.options, function (o) {
        if (/^\d{4}$/.test(o.textContent.trim())) o.textContent = t.year_option.replace('%{year}', o.textContent.trim());
      });
    }
    var monthLabel = p.querySelector(':scope > label[for="month"]');
    var yearLabel = p.querySelector(':scope > label[for="year"]');
    var months = p.querySelector(':scope > input#months');
    if (monthLabel && yearLabel) {
      // calendar
      monthLabel.classList.add('gb-period-label');
      yearLabel.classList.add('gb-period-label');
      p.insertBefore(yearLabel, monthLabel);
      p.insertBefore(year, monthLabel);
    } else if (months) {
      // gantt: wrap 「ヶ月分」 so it can follow the months field
      var unit = months.nextSibling;
      while (unit && unit.nodeType === 3 && !unit.nodeValue.trim()) unit = unit.nextSibling;
      var unitSpan = null;
      if (unit && unit.nodeType === 3) {
        unitSpan = el('span', 'gb-period-text', unit.nodeValue.trim());
        p.replaceChild(unitSpan, unit);
      }
      // two unbreakable groups, 「[2026年] [11月] から」 and 「[6] ヶ月分」: a narrow row wraps between
      // them, never before a lone 「ヶ月分」
      var start = el('span', 'gb-period-group');
      var span = el('span', 'gb-period-group');
      p.insertBefore(start, months);
      p.insertBefore(span, months);
      start.appendChild(year);
      start.appendChild(month);
      if (t.period_from) start.appendChild(el('span', 'gb-period-text', t.period_from));
      span.appendChild(months);
      if (unitSpan) span.appendChild(unitSpan);
    }
  }

  // ---------- round 9 ----------
  // time report column headings: 「2026-11-19」 -> 「11/19(木)」, 「2026-11」 -> 「2026年11月」, 「2026」 -> 「2026年」
  // (the site writes dates as 2026/11/19; the full date stays in the title)
  function formatReportPeriods() {
    var table = document.querySelector('.controller-timelog #time-report');
    if (!table || table.getAttribute('data-gb-periods')) return;
    table.setAttribute('data-gb-periods', '1');
    var colSel = document.querySelector('.controller-timelog #query_form select#columns');
    var unit = colSel ? colSel.value : '';
    var lang = document.documentElement.lang || 'ja';
    var wd, ym, yo;
    try {
      wd = new Intl.DateTimeFormat(lang, { weekday: 'short' });
      ym = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' });
      yo = new Intl.DateTimeFormat(lang, { year: 'numeric' });
    } catch (e) {
      return;
    }
    table.querySelectorAll('thead th.period').forEach(function (th) {
      var t = th.textContent.trim();
      var m;
      if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
        var d = new Date(+m[1], +m[2] - 1, +m[3]);
        th.title = m[1] + '/' + m[2] + '/' + m[3];
        th.textContent = (+m[2]) + '/' + (+m[3]);
        th.appendChild(el('span', 'gb-report-wd', '(' + wd.format(d) + ')'));
      } else if (unit === 'month' && (m = t.match(/^(\d{4})-(\d{1,2})$/))) {
        th.textContent = ym.format(new Date(+m[1], +m[2] - 1, 1));
      } else if (unit === 'year' && (m = t.match(/^(\d{4})$/))) {
        th.textContent = yo.format(new Date(+m[1], 0, 1));
      }
    });
  }

  // time report with two criteria (ユーザー → 課題): phones hide the first column and show its value
  // as the group heading in the second one, so the issue column and the pinned 合計 always fit
  function groupReportRows() {
    var table = document.querySelector('.controller-timelog #time-report');
    if (!table || table.getAttribute('data-gb-grp')) return;
    var heads = table.querySelectorAll('thead tr:first-child > th:not(.period):not(.total)');
    if (heads.length !== 2) return;
    table.setAttribute('data-gb-grp', '1');
    table.classList.add('gb-report--grp');
    var h2 = heads[1];
    var hp = el('span', 'gb-report-grp', heads[0].textContent.trim() + ' / ');
    h2.insertBefore(hp, h2.firstChild);
    table.querySelectorAll('tbody tr.subtotal, tbody tr.total, tfoot tr.total').forEach(function (tr) {
      var c1 = tr.children[0];
      var c2 = tr.children[1];
      if (!c1 || !c2 || c2.textContent.trim()) return;
      var span = el('span', 'gb-report-grp');
      Array.prototype.forEach.call(c1.childNodes, function (n) { span.appendChild(n.cloneNode(true)); });
      c2.appendChild(span);
      c2.classList.add('gb-report-grp-cell');
    });
  }

  GB.ready(function () {
    formatReportPeriods();
    decorateActivityUserSelect();
    orderPeriodControls();
    decorateReportIssues();
    restoreVersionWording();
    decorateTimeReportActions();
    decorateRoadmapSidebar();
    decorateTimeFormErrors();
    decorateTimeReportTable();
    decorateGantt();
    decorateTimeForm();
    decorateTimeList();
    decorateRoadmapFilterNote(document);
    decorateVersionHours(document);
    decorateTimeReport();
    pairReportControls();
    decorateActivityFilter();
    decorateRelatedIssues(document);
    alignRelatedKeys();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignRelatedKeys);
    decorateVersionOverview(document);
    decorateCalendar();
    decorateTimeTotals();
    decorateVersionForm();
    groupReportRows();
  });
  GB.onAjax(function () {
    decorateGantt();
    decorateTimeForm();
    decorateTimeList();
    decorateRelatedIssues(document);
    alignRelatedKeys();
    decorateVersionOverview(document);
    decorateTimeTotals();
    decorateReportIssues();
  });
})();

// === 80-avatars.js ===
// 80-avatars: Redmine 6.1 renders square two-letter initials avatars
// (<span role="img" class="avatar avatar-color-N sNN">プ確</span>). Turn every one of them into the
// single-initial round avatar of DESIGN §2.9, coloured by the user's display name like GB.avatar.
// The core element is kept (other features look it up via `.avatar:not(.gb-avatar)`); only its text and
// a data-av attribute change. Idempotent and re-run after AJAX.
(function () {
  var GB = window.GB;

  // Returns { name, visible }: visible = the name is printed next to the avatar.
  function nameFor(av) {
    var t = av.getAttribute('aria-label') || av.getAttribute('title') || av.getAttribute('alt');
    // core labels some avatars with the field name: 「担当者: 花子 鈴木」 -> 「花子 鈴木」
    if (t) return { name: GB.stripFieldLabel(t), visible: false };
    // the user link that follows the avatar (most core views)
    var sib = av.nextElementSibling;
    for (var i = 0; sib && i < 3; i++, sib = sib.nextElementSibling) {
      if (sib.matches('a.user')) return { name: sib.textContent, visible: true };
      var inner = sib.querySelector && sib.querySelector('a.user');
      if (inner) return { name: inner.textContent, visible: true };
    }
    var p = av.parentElement;
    for (var d = 0; p && d < 2; d++, p = p.parentElement) {
      var u = p.querySelector('a.user');
      if (u) return { name: u.textContent, visible: true };
    }
    // profile heading: <h2><span class="avatar">プ確</span> プレビュー 確認用</h2>
    var parent = av.parentElement;
    if (parent && /^H[1-4]$/.test(parent.tagName)) {
      var txt = parent.textContent.replace(av.textContent, '').trim();
      if (txt) return { name: txt, visible: true };
    }
    return { name: '', visible: false };
  }

  function decorate(root) {
    (root || document).querySelectorAll('span[role="img"].avatar:not(.gb-avatar):not([data-gb-init])').forEach(function (av) {
      av.setAttribute('data-gb-init', av.textContent.trim());
      var found = nameFor(av);
      var name = found.name.replace(/\s+/g, ' ').trim();
      if (name) {
        av.setAttribute('data-av', String(GB.avatarIndex(name)));
        av.textContent = GB.initial(name);
      } else {
        av.textContent = GB.initial(av.textContent);
      }
      if (name && found.visible) {
        // the user's name is printed next to the avatar: hide the decorative initial from AT
        av.setAttribute('aria-hidden', 'true');
      } else if (name) {
        // no visible name: keep role=img and give it the plain user name as its label
        av.setAttribute('aria-label', name);
      }
    });
  }

  GB.decorateAvatars = decorate;
  GB.onAjax(function (root) { decorate(root); });
})();

// === 80-pages.js ===
// 80-pages: page-level enhancements owned by global-shell
// (projects board cards, error pages, tables wrapped for horizontal scroll).
(function () {
  var GB = window.GB;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  // ---------- /projects (board view): avatar, identifier, quick links ----------
  var LINKS = [
    { cls: 'issues', label: '課題', icon: 'issue', path: '/issues' },
    { cls: 'issues-panel', label: 'ボード', icon: 'apps', path: '/issues_panel' },
    { cls: 'wiki', label: 'Wiki', icon: 'wiki-page', path: '/wiki' }
  ];
  var MOD_KEY = 'greenboard.projmods.';

  function fillLinks(box, ident, mods) {
    LINKS.forEach(function (l) {
      if (mods.indexOf(l.cls) < 0) return;
      var a = el('a');
      a.href = '/projects/' + encodeURIComponent(ident) + l.path;
      var ic = GB.icon(l.icon, 'icon-svg');
      if (ic) a.appendChild(ic);
      a.appendChild(el('span', '', l.label));
      box.appendChild(a);
    });
  }

  function loadModules(ident, cb) {
    var cached = null;
    try { cached = sessionStorage.getItem(MOD_KEY + ident); } catch (e) { cached = null; }
    if (cached != null) { cb(cached ? cached.split(',') : []); return; }
    if (!window.fetch) return;
    fetch('/projects/' + encodeURIComponent(ident), { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        var mods = [];
        if (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          LINKS.forEach(function (l) { if (doc.querySelector('#main-menu a.' + l.cls)) mods.push(l.cls); });
        }
        try { sessionStorage.setItem(MOD_KEY + ident, mods.join(',')); } catch (e) { /* ignore */ }
        cb(mods);
      })
      .catch(function () { /* leave the card without quick links */ });
  }

  function decorateProjectCards() {
    var cards = document.querySelectorAll('#projects-index ul.projects li.root > div.root:not([data-gb-card])');
    Array.prototype.slice.call(cards, 0, 60).forEach(function (card) {
      card.setAttribute('data-gb-card', '1');
      var a = card.querySelector(':scope > a.project');
      if (!a) return;
      var name = a.textContent.trim();
      var m = (a.getAttribute('href') || '').match(/\/projects\/([^/?#]+)/);
      var ident = m ? decodeURIComponent(m[1]) : '';
      card.insertBefore(GB.projectAvatar(name, 36), card.firstChild);
      if (ident) {
        var idEl = el('span', 'gb-proj-ident', ident);
        a.after(idEl);
        // keep the cards of one row the same shape: an explicit "no description" line instead of a blank band
        if (!card.querySelector('.wiki.description, .description')) {
          card.appendChild(el('p', 'gb-proj-nodesc', '説明はありません'));
        }
        var links = el('div', 'gb-proj-links');
        card.appendChild(links);
        if (!a.classList.contains('archived') && !a.classList.contains('closed')) {
          loadModules(ident, function (mods) { fillLinks(links, ident, mods); });
        }
      }
    });
  }

  // projects list view: small project avatar before each name
  function decorateProjectTable() {
    document.querySelectorAll('table.list.projects td.name a[href^="/projects/"]:not([data-gb-av])').forEach(function (a) {
      a.setAttribute('data-gb-av', '1');
      if (!/^\/projects\/[^/]+$/.test(a.getAttribute('href'))) return;
      var av = GB.projectAvatar(a.textContent.trim(), 20);
      av.classList.add('gb-proj-avatar--20');
      a.parentNode.insertBefore(av, a);
    });
  }


  // ---------- issue keys in core text ("バグ #9 (未対応): …" -> "バグ WEBSITE-9 (未対応): …") ----------
  // Project name -> identifier. The REST API is off on this site (projects.json is empty for the session),
  // so the map is read from the HTML project list once and cached for the session.
  var IDENT_KEY = 'greenboard.projIdents';
  var identMap = null, identWaiters = null;
  function pageIdents() {
    var map = {};
    document.querySelectorAll('a[href^="/projects/"]').forEach(function (a) {
      var m = (a.getAttribute('href') || '').match(/^\/projects\/([^/?#]+)$/);
      var name = a.textContent.replace(/\s+/g, ' ').trim();
      if (m && name && !map[name]) map[name] = decodeURIComponent(m[1]);
    });
    return map;
  }
  function withIdents(cb) {
    if (identMap) { cb(identMap); return; }
    if (identWaiters) { identWaiters.push(cb); return; }
    try {
      var c = JSON.parse(sessionStorage.getItem(IDENT_KEY) || 'null');
      if (c && c.t > Date.now() - 600000) { identMap = c.m; cb(identMap); return; }
    } catch (e) { identMap = null; }
    identWaiters = [cb];
    function done(map) {
      identMap = map;
      try { sessionStorage.setItem(IDENT_KEY, JSON.stringify({ t: Date.now(), m: map })); } catch (e) { /* ignore */ }
      var w = identWaiters; identWaiters = null;
      w.forEach(function (fn) { fn(map); });
    }
    var base = pageIdents();
    if (!window.fetch) { done(base); return; }
    fetch('/projects?display_type=list&per_page=100', { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (html) {
          var doc = new DOMParser().parseFromString(html, 'text/html');
          doc.querySelectorAll('table.list.projects td.name a[href^="/projects/"]').forEach(function (a) {
            var m = (a.getAttribute('href') || '').match(/^\/projects\/([^/?#]+)$/);
            var name = a.textContent.replace(/\s+/g, ' ').trim();
            if (m && name) base[name] = decodeURIComponent(m[1]);
          });
        }
        done(base);
      })
      .catch(function () { done(base); });
  }

  // The "#9" text inside `link` is wrapped in span.gb-key and replaced by the key of `projectName`'s project.
  // While the name is being resolved the key is kept invisible (no "#9" -> "WEBSITE-9" flicker).
  function keyifyLink(link, projectName) {
    if (!link || link.dataset.gbKey) return;
    var m = (link.getAttribute('href') || '').match(/\/issues\/(\d+)(?:[?#]|$)/);
    if (!m) return;
    var id = m[1];
    var walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
    var node = null;
    while (walker.nextNode()) {
      if (walker.currentNode.nodeValue.indexOf('#' + id) >= 0) { node = walker.currentNode; break; }
    }
    if (!node) return;
    link.dataset.gbKey = '1';
    var rest = node.splitText(node.nodeValue.indexOf('#' + id));
    rest.splitText(('#' + id).length);
    var span = el('span', 'gb-key', '#' + id);
    rest.parentNode.replaceChild(span, rest);
    var name = String(projectName || '').replace(/\s+/g, ' ').trim();
    var bodyProj = (String(document.body.className).match(/(?:^|\s)project-([^\s]+)/) || [])[1];
    if (!name) { if (bodyProj) span.textContent = GB.issueKey(bodyProj, id); return; }
    var known = pageIdents()[name];
    if (known) { span.textContent = GB.issueKey(known, id); return; }
    span.classList.add('gb-key--pending');
    var shown = false;
    var show = function (ident) {
      if (shown) return;
      shown = true;
      if (ident) span.textContent = GB.issueKey(ident, id);
      span.classList.remove('gb-key--pending');
    };
    setTimeout(function () { show(null); }, 1500);
    withIdents(function (map) { show(map[name]); });
  }
  GB.keyifyIssueLink = keyifyLink;

  // Issue titles as on /activity: 「バグ #23 (未対応): 件名」 -> [バグ] DEMO-23 件名 [未対応] (phones: [バグ] [未対応] / DEMO-23 件名)
  // (tracker badge + key + subject + status pill, the same GB helpers and classes as the timeline).
  // The prefix is cut from the link's first text node only, so search highlights in the subject stay.
  var ISSUE_PREFIX = /^\s*(.+?) #(\d+)(?: \(([^)]+)\))?: /;
  function gbData() {
    if (typeof GB.pageData === 'function') return GB.pageData() || {};
    var node = document.getElementById('gb-data');
    try { return node ? JSON.parse(node.textContent) : {}; } catch (e) { return {}; }
  }
  function byName(list, name) {
    for (var i = 0; i < (list || []).length; i++) if (list[i].name === name) return list[i];
    return null;
  }
  function badgeIssueLink(link, projectName) {
    if (!link || link.dataset.gbTitle) return;
    var first = link.firstChild;
    var m = first && first.nodeType === 3 ? first.nodeValue.match(ISSUE_PREFIX) : null;
    var d = gbData();
    var tracker = m && byName(d.trackers, m[1]);
    if (!tracker) { keyifyLink(link, projectName); return; }
    link.dataset.gbTitle = '1';
    first.nodeValue = '#' + m[2] + ' ' + first.nodeValue.slice(m[0].length);
    var wrap = el('span', 'gb-issue-title');
    link.parentNode.insertBefore(wrap, link);
    wrap.appendChild(GB.trackerBadge(tracker.name, tracker.id));
    // DOM order = reading order, the same as /activity: badge, link (key + subject), status pill
    // (phones move the pill up beside the badge with flex order; see 95-responsive.css)
    wrap.appendChild(link);
    var st = m[3] && byName(d.statuses, m[3]);
    if (m[3]) wrap.appendChild(GB.statusPill(m[3], st ? st.id : null));
    if (!link.title) link.title = link.textContent.replace(/^#\d+\s*/, '').replace(/\s+/g, ' ').trim();
    keyifyLink(link, projectName);
  }

  // ---------- home (/): Japanese welcome instead of Redmine's English default text; news rows ----------
  var WELCOME_LINKS = [
    { href: '/my/page', icon: 'summary', title: 'ダッシュボード', text: '自分の課題と最近の更新を確認します。', auth: true },
    { href: '/projects', icon: 'projects', title: 'プロジェクト', text: '参加しているプロジェクトを開きます。' },
    { href: '/issues', icon: 'issue', title: '課題', text: 'すべてのプロジェクトの課題を探します。' }
  ];
  function decorateHome() {
    if (!document.body.classList.contains('controller-welcome')) return;
    var wiki = document.querySelector('#content .splitcontentleft > .wiki');
    if (wiki && !wiki.dataset.gbWelcome) {
      wiki.dataset.gbWelcome = '1';
      var txt = wiki.textContent;
      // only Redmine's untouched default ("Welcome to Redmine … Welcome text setting"); a custom text stays
      if (/Welcome to Redmine/.test(txt) && /Welcome text/.test(txt)) {
        var box = el('div', 'gb-welcome');
        box.appendChild(el('p', 'gb-welcome__lead', 'チームのプロジェクトと課題を、ここからまとめて確認できます。'));
        var list = el('ul', 'gb-welcome__links');
        var signedIn = !!GB.currentUser();
        WELCOME_LINKS.forEach(function (l) {
          if (l.auth && !signedIn) return;
          var li = el('li');
          var a = el('a', 'gb-welcome__link');
          a.href = l.href;
          var ic = GB.icon(l.icon, 'gb-welcome__icon');
          if (ic) a.appendChild(ic);
          var body = el('span', 'gb-welcome__body');
          body.appendChild(el('span', 'gb-welcome__title', l.title));
          body.appendChild(el('span', 'gb-welcome__text', l.text));
          a.appendChild(body);
          li.appendChild(a);
          list.appendChild(li);
        });
        box.appendChild(list);
        wiki.replaceWith(box);
      }
    }
    // latest news: project / title + comment count / summary / author as separate, ranked lines
    document.querySelectorAll('#content .splitcontentright .news > p:not([data-gb-news])').forEach(function (p) {
      p.setAttribute('data-gb-news', '1');
      var links = p.querySelectorAll(':scope > a');
      var title = links[1] || links[0];
      if (!title) return;
      var item = el('div', 'gb-home-news');
      if (links[1]) item.appendChild(el('span', 'gb-home-news__project', links[0].textContent.trim()));
      var head = el('div', 'gb-home-news__head');
      title.classList.add('gb-home-news__title');
      head.appendChild(title);
      var comments = p.querySelector(':scope > .comments');
      if (comments) {
        var n = (comments.textContent.match(/\d+/) || [''])[0];
        var badge = el('span', 'gb-home-news__comments');
        var ic = GB.icon('comments', 'gb-home-news__cicon');
        if (ic) badge.appendChild(ic);
        badge.appendChild(document.createTextNode(n));
        badge.title = comments.textContent.replace(/[()（）]/g, '').trim();
        badge.setAttribute('aria-label', badge.title);
        head.appendChild(badge);
      }
      item.appendChild(head);
      var summary = p.querySelector(':scope > .summary');
      if (summary && summary.textContent.trim()) item.appendChild(el('p', 'gb-home-news__summary', summary.textContent.trim()));
      var author = p.querySelector(':scope > .author');
      if (author) {
        author.classList.add('gb-home-news__meta');
        item.appendChild(author);
      }
      p.replaceWith(item);
    });
    var all = document.querySelector('#content .splitcontentright .news > a[href="/news"]');
    if (all) all.classList.add('gb-home-news__all');
  }

  // ---------- error pages: back link reads as a button ----------
  function decorateErrorPage() {
    var p = document.querySelector('#content > p#errorExplanation');
    if (!p || p.dataset.gbErr) return;
    p.dataset.gbErr = '1';
    document.body.classList.add('gb-error-page');
    // "戻る" → a clearer text button (falls back to the core label when history is empty)
    var back = document.querySelector('#content > p#errorExplanation ~ p > a[href^="javascript:history.back"]');
    if (back && history.length > 1) back.textContent = '前のページに戻る';
  }

  // ---------- /users/:id: header with 64px avatar, name and meta list ----------
  function decorateProfile() {
    if (!document.body.classList.contains('controller-users') || !document.body.classList.contains('action-show')) return;
    // a 404/403 under users#show is an error page, not a profile
    if (document.body.classList.contains('gb-error-page') || document.querySelector('#content > p#errorExplanation')) return;
    var content = document.getElementById('content');
    var h2 = content && content.querySelector(':scope > h2');
    if (!h2 || h2.closest('.gb-profile-head')) return;
    var head = el('div', 'gb-profile-head');
    h2.parentNode.insertBefore(head, h2);
    head.appendChild(h2);
    // wrap the name text so it can sit next to the avatar
    var name = el('span', 'gb-profile-head__name');
    Array.prototype.slice.call(h2.childNodes).forEach(function (n) {
      if (n.nodeType === 3 || (n.nodeType === 1 && !n.classList.contains('avatar') && !n.classList.contains('gb-avatar'))) name.appendChild(n);
    });
    name.textContent = name.textContent.trim();
    h2.appendChild(name);
    if (!h2.querySelector('.avatar, .gb-avatar')) h2.insertBefore(GB.avatar(name.textContent, 64), name);
    var meta = content.querySelector('.splitcontentleft > ul:first-child');
    if (meta) head.appendChild(meta);
    var actions = content.querySelector(':scope > .contextual');
    if (actions) head.appendChild(actions);
  }

  // /users/:id activity: the list is C-timeline (15-c-timeline.js rewrites #activity)

  // ---------- /search: labelled "toggle all", readable excerpts ----------
  function decorateSearch() {
    if (!document.body.classList.contains('controller-search')) return;
    var form = document.getElementById('search-form');
    // submit button next to the query field (core puts it below the filter box)
    var input = document.getElementById('search-input');
    var submit = form && form.querySelector(':scope > p > input[type=submit]');
    if (input && submit && !input.closest('.gb-search-bar')) {
      var oldP = submit.parentNode;
      var bar = el('span', 'gb-search-bar');
      input.parentNode.insertBefore(bar, input);
      bar.appendChild(input);
      bar.appendChild(submit);
      if (!oldP.textContent.trim() && !oldP.children.length) oldP.remove();
    }
    // すべての単語 / タイトルのみ wrap together (never one orphan checkbox on its own line)
    var firstP = form && form.querySelector(':scope > .box > p, :scope > p');
    if (firstP && !firstP.querySelector('.gb-search-opts')) {
      var boxes = Array.prototype.filter.call(firstP.children, function (c) {
        return c.tagName === 'LABEL' && c.querySelector('input[type=checkbox]');
      });
      if (boxes.length > 1) {
        var opts = el('span', 'gb-search-opts');
        boxes[0].parentNode.insertBefore(opts, boxes[0]);
        boxes.forEach(function (b) { opts.appendChild(b); });
      }
    }
    // 検索対象: a caption plus a plain "select all / none" text button (not a checked-looking item)
    var toggle = document.querySelector('#search-form fieldset.box > legend a:not([data-gb-all])');
    if (toggle) {
      toggle.setAttribute('data-gb-all', '1');
      toggle.setAttribute('role', 'button');
      toggle.classList.add('gb-toggle-all');
      toggle.classList.remove('icon', 'icon-checked'); // no check mark: it is an action, not a checked item
      toggle.removeAttribute('aria-label');
      var svg = toggle.querySelector('svg');
      if (svg) svg.remove();
      var lbl = toggle.querySelector('.icon-label');
      if (lbl) lbl.textContent = 'すべて選択/解除';
      else toggle.appendChild(el('span', 'icon-label', 'すべて選択/解除'));
      toggle.parentNode.insertBefore(el('span', 'gb-search-types__caption', '検索対象'), toggle);
    }
    // zero hits: an empty state instead of "結果 (0)" + a divider + an orphan "(0-0/0)" counter
    var results = document.getElementById('search-results');
    var content = document.getElementById('content');
    if (results && content && !results.querySelector('dt') && !content.querySelector('.gb-search-empty')) {
      var h3 = content.querySelector(':scope > h3');
      if (h3) h3.hidden = true;
      content.querySelectorAll(':scope > .pagination, :scope > p.pagination, :scope > span.pagination').forEach(function (n) { n.hidden = true; });
      results.hidden = true;
      var q = input ? input.value.trim() : '';
      var empty = el('p', 'nodata gb-search-empty',
        (q ? '「' + q + '」に一致する結果はありません。' : '一致する結果はありません。') + 'キーワードや検索対象を変えてお試しください。');
      results.parentNode.insertBefore(empty, results.nextSibling);
    }
    // timeline rows: the date moves onto the title line (right column); an empty excerpt collapses
    document.querySelectorAll('dl#search-results > dd:not([data-gb-row])').forEach(function (dd) {
      dd.setAttribute('data-gb-row', '1');
      var dt = dd.previousElementSibling;
      var date = dd.querySelector(':scope > span.author');
      if (dt && dt.tagName === 'DT' && date) {
        date.classList.add('gb-search-date');
        dt.appendChild(date);
      }
      var desc = dd.querySelector(':scope > span.description');
      if (!dd.children.length || (desc && !desc.textContent.trim() && dd.children.length === 1)) {
        dd.classList.add('gb-search-dd--empty');
      }
    });
    // issue titles: "バグ #9 (未対応): …" -> project key (WEBSITE-9) like every other page
    document.querySelectorAll('dl#search-results dt.issue > a[href^="/issues/"]').forEach(function (a) {
      var proj = a.parentNode.querySelector(':scope > span.project');
      badgeIssueLink(a, proj ? proj.textContent : '');
    });
    // excerpts are raw Markdown/Textile source: drop the markup characters for display only
    document.querySelectorAll('dl#search-results dd span.description:not([data-gb-plain])').forEach(function (d) {
      d.setAttribute('data-gb-plain', '1');
      var walker = document.createTreeWalker(d, NodeFilter.SHOW_TEXT);
      var nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach(function (n) {
        n.nodeValue = n.nodeValue
          .replace(/\|?(\s*:?-{3,}:?\s*\|)+\s*:?-{0,}:?\s*/g, ' ')   // table separator rows
          .replace(/(^|\s)#{1,6}\s+/g, '$1')                             // headings
          .replace(/(^|\s)(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/g, '$1')  // list markers / task boxes
          .replace(/\s*\|\s*/g, ' ')                                    // table cell pipes
          .replace(/\*\*|__|~~|`{1,3}/g, '')                             // emphasis / code ticks
          .replace(/(^|\s)>\s+/g, '$1')                                  // quotes
          .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')                 // [[Page|label]] wiki links
          .replace(/\[\[|\]\]/g, '')                                       // cut-off wiki link brackets
          .replace(/\{\{[^}]*\}\}/g, '')                                    // macros
          .replace(/(^|\s)(?:-{3,}|\*{3,}|_{3,})(?=\s|$)/g, '$1')          // horizontal rules
          .replace(/(\s*(?:\.\.\.|…)\s*){2,}/g, ' … ')                      // repeated ellipses
          .replace(/^\s*(?:\.\.\.|…)\s*(?=\S)/, '')
          .replace(/\s{2,}/g, ' ');
      });
    });
  }

  // ---------- /my/password: same submit wording as /my/account (保存) and a page name in the tab title ----------
  function decorateMyPassword() {
    var body = document.body;
    if (!body.classList.contains('controller-my') || !body.classList.contains('action-password')) return;
    var h2 = document.querySelector('#content > h2');
    var name = h2 && h2.textContent.trim();
    if (name && document.title.indexOf(name) !== 0) document.title = name + ' - ' + document.title;
    document.querySelectorAll('#content > form input[type=submit]').forEach(function (b) {
      if (b.value === '適用') b.value = '保存';
    });
  }

  GB.ready(function () {
    decorateMyPassword();
    decorateErrorPage(); // first: later decorations skip error pages
    decorateSearch();
    decorateProfile();
    decorateHome();
    decorateProjectCards();
    decorateProjectTable();
  });
  GB.onAjax(function () { decorateProjectCards(); decorateProjectTable(); });
})();

// === 80-shell.js ===
// 80-shell: frame-level fixes owned by global-shell.
// Context menu: core flips the menu upward when it does not fit below the click, which can push its
// top under the fixed top bar, and opens folder submenus upward off-screen. Keep the menu below the
// top bar and open each submenu in the direction that fits the viewport.
(function () {
  function topbarBottom() {
    var bar = document.getElementById('top-menu');
    var r = bar && bar.getBoundingClientRect();
    return (r && r.bottom > 0 ? r.bottom : 0) + 8;
  }

  function clampMenu(menu) {
    if (menu.style.display === 'none' || !menu.firstElementChild) return;
    var r = menu.getBoundingClientRect();
    var minTop = topbarBottom();
    if (r.top < minTop) {
      var want = Math.round(window.scrollY + minTop) + 'px';
      if (menu.style.top !== want) menu.style.top = want;
    }
  }

  function placeSubmenu(li) {
    var sub = li.querySelector(':scope > ul');
    if (!sub) return;
    li.classList.remove('gb-sub-down', 'gb-sub-up', 'gb-sub-left', 'gb-sub-right');
    var row = li.getBoundingClientRect();
    // horizontal: open toward the side that has room (core only flips the whole menu)
    var w = sub.offsetWidth || 200;
    if (row.right - 6 + w > window.innerWidth - 8 && row.left + 6 - w >= 8) li.classList.add('gb-sub-left');
    else if (row.left + 6 - w < 8) li.classList.add('gb-sub-right');
    var h = sub.offsetHeight || sub.scrollHeight;
    var minTop = topbarBottom();
    var maxBottom = window.innerHeight - 8;
    if (row.top - 5 + h <= maxBottom) li.classList.add('gb-sub-down');
    else if (row.bottom + 5 - h >= minTop) li.classList.add('gb-sub-up');
    else li.classList.add('gb-sub-down'); // neither fits: open downward, the list scrolls (max-height)
  }

  function init() {
    var menu = document.getElementById('context-menu');
    if (!menu || menu.dataset.gbCm) return;
    menu.dataset.gbCm = '1';
    new MutationObserver(function () { clampMenu(menu); })
      .observe(menu, { attributes: true, attributeFilter: ['style'] });
    menu.addEventListener('mouseover', function (e) {
      var li = e.target.closest && e.target.closest('li.folder');
      if (li && menu.contains(li) && !li.contains(e.relatedTarget)) placeSubmenu(li);
    });
    menu.addEventListener('focusin', function (e) {
      var li = e.target.closest && e.target.closest('li.folder');
      if (li && menu.contains(li)) placeSubmenu(li);
    });
  }

  window.GB.ready(init);
  window.GB.onAjax(init);
})();

// Dropdowns (.drdn — the 「…」 more-actions menu, project jump, etc.): core opens/closes them on click
// only. Close the open one with Escape, like the context menu and dialogs, return focus to its trigger,
// and keep aria-expanded on the trigger in sync with the open state.
(function () {
  if (document.documentElement.dataset.gbDrdnEsc) return;
  document.documentElement.dataset.gbDrdnEsc = '1';

  function focusTarget(drdn) {
    var trig = drdn.querySelector(':scope > .drdn-trigger');
    if (!trig) return null;
    if (trig.tabIndex >= 0 && trig.hasAttribute('tabindex')) return trig;
    var inner = trig.querySelector('[tabindex]:not([tabindex="-1"]), a[href], button:not([disabled])');
    if (inner) return inner;
    if (!trig.hasAttribute('tabindex')) trig.setAttribute('tabindex', '-1');
    return trig;
  }

  function syncExpanded() {
    document.querySelectorAll('.drdn').forEach(function (drdn) {
      var t = focusTarget(drdn);
      if (t && t.hasAttribute('aria-haspopup')) {
        t.setAttribute('aria-expanded', drdn.classList.contains('expanded') ? 'true' : 'false');
      }
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || e.isComposing || e.defaultPrevented) return;
    var open = document.querySelectorAll('.drdn.expanded');
    if (!open.length) return;
    var active = document.activeElement;
    var refocus = null;
    open.forEach(function (drdn) {
      drdn.classList.remove('expanded');
      if (!active || active === document.body || drdn.contains(active)) refocus = drdn;
    });
    syncExpanded();
    e.preventDefault();
    var t = refocus && focusTarget(refocus);
    if (t) t.focus();
  });

  // core toggles .expanded in its own click handler (which may stop propagation): sync afterwards
  document.addEventListener('click', function () { setTimeout(syncExpanded, 0); }, true);
})();

// === 90-admin-settings.js ===
// 90-admin-settings: Administration pages + project settings (DESIGN.md §3.8).
// Presentation only: no form is changed, submitted or re-created.
(function () {
  var GB = window.GB;
  if (!GB) return;

  // theme.js loads in <head>: read document.body lazily
  function bodyHas(a, b) {
    var cl = document.body && document.body.classList;
    return !!cl && cl.contains(a) && cl.contains(b);
  }
  function isProjectSettings() { return bodyHas('controller-projects', 'action-settings'); }
  function isAdminIndex() { return bodyHas('controller-admin', 'action-index'); }

  // ---- /admin: one-line description under each card label (fallback copy; see report) ----
  var ADMIN_DESC = {
    projects: 'プロジェクトの一覧と管理',
    users: 'ユーザーの追加・ロック・権限',
    groups: 'ユーザーをまとめて管理',
    roles: 'ロールごとの権限を設定',
    trackers: '課題の種類と使用する項目',
    'issue-statuses': '課題のステータスを定義',
    workflows: 'ステータスの遷移と項目の権限',
    'custom-fields': '独自の入力項目を追加',
    enumerations: '優先度・作業分類などの選択肢',
    settings: 'システム全体の設定',
    'ldap-authentication': 'LDAP による認証の設定',
    plugins: 'インストール済みのプラグイン',
    info: 'バージョンと動作環境'
  };

  // the 13 links are grouped into titled sections (a flat 4-column grid left one card alone on the last row)
  var ADMIN_GROUPS = [
    { title: 'プロジェクトと課題', keys: ['projects', 'trackers', 'issue-statuses', 'workflows', 'custom-fields', 'enumerations'] },
    { title: 'ユーザーと権限', keys: ['users', 'groups', 'roles', 'ldap-authentication'] },
    { title: 'システム', keys: ['settings', 'plugins', 'info'] }
  ];
  function adminKey(a) {
    var key = null;
    Object.keys(ADMIN_DESC).some(function (k) {
      if (a.classList.contains(k)) { key = k; return true; }
      return false;
    });
    return key;
  }
  function decorateAdminIndex() {
    if (!isAdminIndex()) return;
    var menu = document.querySelector('#admin-index #admin-menu');
    if (!menu || menu.dataset.gbAdmin) return;
    var list = menu.querySelector('ul');
    if (!list) return;
    menu.dataset.gbAdmin = '1';
    var items = Array.prototype.slice.call(list.children);
    var byKey = {};
    items.forEach(function (li) {
      var a = li.querySelector('a');
      if (!a) return;
      var key = adminKey(a);
      if (key) {
        byKey[key] = li;
        var d = document.createElement('span');
        d.className = 'gb-admin-card__desc';
        d.textContent = ADMIN_DESC[key];
        a.appendChild(d);
      }
    });
    var used = [];
    var wrap = document.createElement('div');
    wrap.className = 'gb-admin-groups';
    ADMIN_GROUPS.forEach(function (g, gi) {
      var section = document.createElement('section');
      section.className = 'gb-admin-group';
      var h = document.createElement('h3');
      h.className = 'gb-admin-group__title';
      h.id = 'gb-admin-group-' + gi;
      h.textContent = g.title;
      section.setAttribute('aria-labelledby', h.id);
      var ul = document.createElement('ul');
      g.keys.forEach(function (k) {
        if (byKey[k]) { ul.appendChild(byKey[k]); used.push(byKey[k]); }
      });
      // links added by plugins (unknown keys) go to the last section
      if (gi === ADMIN_GROUPS.length - 1) {
        items.forEach(function (li) { if (used.indexOf(li) < 0) ul.appendChild(li); });
      }
      if (!ul.children.length) return;
      section.appendChild(h);
      section.appendChild(ul);
      wrap.appendChild(section);
    });
    list.parentNode.insertBefore(wrap, list);
    list.parentNode.removeChild(list);
  }

  // ---- shared avatar markup (DESIGN §2.9): <span class="gb-avatar gb-avatar--20" data-av="N" aria-hidden="true">X</span>
  // Built with DOM APIs (no HTML strings); colour index from GB.avatarIndex when global-shell provides it.
  function avatarIndex(name) {
    if (typeof GB.avatarIndex === 'function') return GB.avatarIndex(name);
    var sum = 0;
    for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return sum % 8;
  }
  function avatarEl(name, size) {
    var el = document.createElement('span');
    el.className = 'gb-avatar gb-avatar--' + size;
    el.setAttribute('data-av', String(avatarIndex(name)));
    el.setAttribute('aria-hidden', 'true');
    el.textContent = GB.initial(name);
    return el;
  }
  function prependAvatar(a, name) {
    if (a.dataset.gbAv) return;
    var prev = a.previousElementSibling;
    a.dataset.gbAv = '1';
    if (prev && prev.classList.contains('gb-avatar')) return;
    a.parentNode.insertBefore(avatarEl(name || a.textContent.trim(), 20), a);
  }
  // display name as core formats it elsewhere (「名 姓」, e.g. プレビュー 確認用) so the avatar matches
  // the header / members / activity avatars of the same user; falls back to the login.
  function displayName(first, last) {
    return [first, last].map(function (s) { return String(s || '').trim(); }).filter(Boolean).join(' ');
  }
  function rowDisplayName(tr) {
    if (!tr) return '';
    var f = tr.querySelector('td.firstname');
    var l = tr.querySelector('td.lastname');
    return displayName(f && f.textContent, l && l.textContent);
  }

  // ---- project settings > members: role text → neutral chips ----
  function chipify(span) {
    if (!span || span.dataset.gbChips) return;
    var text = span.textContent.trim();
    if (!text) return;
    span.dataset.gbChips = '1';
    span.setAttribute('aria-label', text);
    span.classList.add('gb-role-chips');
    span.textContent = '';
    text.split(/\s*,\s*/).forEach(function (name) {
      if (!name) return;
      var chip = document.createElement('span');
      chip.className = 'gb-role-chip';
      chip.setAttribute('aria-hidden', 'true');
      chip.textContent = name;
      span.appendChild(chip);
    });
  }

  function decorateMembers(root) {
    (root || document).querySelectorAll('table.list.members td.roles > span[id$="-roles"]').forEach(function (s) { chipify(s); });
    // the name argument must not receive forEach's index (it printed 1 / 2 / 3 instead of the initial)
    (root || document).querySelectorAll('table.list.members td.name a.user').forEach(function (a) { prependAvatar(a); });
  }

  // ---- project settings > versions: status / sharing → tags ----
  var VERSION_STATUS = { open: 'open', locked: 'locked', closed: 'closed' };
  function decorateVersions(root) {
    (root || document).querySelectorAll('table.list.versions tr.version').forEach(function (tr) {
      var td = tr.querySelector('td.status');
      if (!td || td.dataset.gbTag) return;
      var text = td.textContent.trim();
      if (!text) return;
      td.dataset.gbTag = '1';
      var kind = 'neutral';
      Object.keys(VERSION_STATUS).some(function (k) {
        if (tr.classList.contains(k)) { kind = VERSION_STATUS[k]; return true; }
        return false;
      });
      var tag = document.createElement('span');
      tag.className = 'gb-state-tag gb-state-tag--' + kind;
      tag.textContent = text;
      td.textContent = '';
      td.appendChild(tag);
    });
  }

  // ---- admin users list: 20px avatar before the login (uses the shared avatar helper) ----
  function decorateUsers(root) {
    (root || document).querySelectorAll('body.controller-users.action-index table.list tr.user td.username a, body.controller-users.action-index table.list tr.user td.login a, body.controller-groups table.list td.name a[href*="/users/"]').forEach(function (a) {
      prependAvatar(a, rowDisplayName(a.closest('tr.user')));
    });
  }

  // ---- admin users list: システム管理者 はい/いいえ → ✓ / – (text kept for screen readers) ----
  function decorateBooleanCells(root) {
    var sprite = GB.spriteHref();
    (root || document).querySelectorAll('body.controller-users.action-index table.list tr.user td.admin').forEach(function (td) {
      if (td.dataset.gbBool) return;
      var text = td.textContent.trim();
      if (text !== 'はい' && text !== 'いいえ') return;
      td.dataset.gbBool = '1';
      td.classList.add('tick');
      var sr = document.createElement('span');
      sr.className = 'hidden-for-sighted';
      sr.textContent = text;
      td.textContent = '';
      if (text === 'はい' && sprite) {
        var wrap = document.createElement('span');
        wrap.className = 'icon-only icon-checked';
        wrap.appendChild(GB.svgIcon(sprite, 'checked', 's18 icon-svg'));
        td.appendChild(wrap);
      }
      td.appendChild(sr);
    });
  }

  // ---- matrices: highlight the hovered column (rows are highlighted by CSS) ----
  function bindMatrix(table) {
    if (table.dataset.gbMatrix) return;
    table.dataset.gbMatrix = '1';
    var current = null;
    function clear() {
      if (!current) return;
      table.querySelectorAll('.gb-col-hover').forEach(function (c) { c.classList.remove('gb-col-hover'); });
      current = null;
    }
    table.addEventListener('mouseover', function (e) {
      var cell = e.target.closest('td, th');
      if (!cell || !table.contains(cell)) return;
      var idx = cell.cellIndex;
      if (idx <= 0 || cell.colSpan > 1) { clear(); return; }
      if (current === idx) return;
      clear();
      current = idx;
      Array.prototype.forEach.call(table.rows, function (row) {
        if (row.classList.contains('group')) return;
        var c = row.cells[idx];
        if (c && row.cells.length > 2) c.classList.add('gb-col-hover');
      });
    });
    table.addEventListener('mouseleave', clear);
  }
  function decorateMatrices(root) {
    (root || document).querySelectorAll('table.permissions, table.transitions, table.fields_permissions').forEach(bindMatrix);
  }

  // ---- user edit: the heading avatar uses the same rule as the /users list (display name initial + palette) ----
  function decorateUserHeading() {
    if (!bodyHas('controller-users', 'action-edit') && !bodyHas('controller-users', 'action-update')) return;
    var h2 = document.querySelector('#content > h2');
    var av = h2 && h2.querySelector('span[role="img"].avatar');
    if (!av || av.dataset.gbUserHead) return;
    // the login is the text printed right after the avatar
    var login = '';
    for (var n = av.nextSibling; n; n = n.nextSibling) login += n.textContent || '';
    login = login.trim();
    var fn = document.getElementById('user_firstname');
    var ln = document.getElementById('user_lastname');
    var name = displayName(fn && fn.defaultValue, ln && ln.defaultValue) || login;
    if (!name) return;
    av.dataset.gbUserHead = '1';
    av.setAttribute('data-gb-init', av.getAttribute('data-gb-init') || av.textContent.trim());
    av.setAttribute('data-av', String(avatarIndex(name)));
    av.setAttribute('aria-hidden', 'true');
    av.textContent = GB.initial(name);
  }

  // ---- empty admin lists (/auth_sources …): empty state instead of a header-only table ----
  var EMPTY_COPY = { 'controller-auth_sources': '認証方式はまだ登録されていません' };
  function decorateEmptyLists() {
    var cl = document.body && document.body.classList;
    if (!cl) return;
    Object.keys(EMPTY_COPY).forEach(function (bodyClass) {
      if (!cl.contains(bodyClass) || !cl.contains('action-index')) return;
      var table = document.querySelector('#content > table.list');
      if (!table || table.dataset.gbEmpty || table.querySelector('tbody tr')) return;
      table.dataset.gbEmpty = '1';
      var p = document.createElement('p');
      p.className = 'nodata gb-admin-empty';
      p.textContent = EMPTY_COPY[bodyClass];
      table.parentNode.insertBefore(p, table);
    });
  }

  // ---- new member / membership modal: core two-letter avatars → one initial (§2.9) ----
  // The modal and its search results arrive through rails-ujs (no jQuery ajaxComplete), so a
  // MutationObserver on #ajax-modal re-decorates. The name is the text printed after the avatar.
  function decorateModalAvatars() {
    var modal = document.getElementById('ajax-modal');
    if (!modal) return;
    modal.querySelectorAll('span[role="img"].avatar:not([data-gb-init])').forEach(function (av) {
      var name = '';
      for (var n = av.nextSibling; n; n = n.nextSibling) name += n.textContent || '';
      name = name.replace(/\s+/g, ' ').trim();
      av.setAttribute('data-gb-init', av.textContent.trim());
      if (!name) { av.textContent = GB.initial(av.textContent); return; }
      av.setAttribute('data-av', String(avatarIndex(name)));
      av.setAttribute('aria-hidden', 'true');
      av.textContent = GB.initial(name);
    });
  }
  function observeModal() {
    var modal = document.getElementById('ajax-modal');
    if (!modal || modal.dataset.gbAvObs || !window.MutationObserver) return;
    modal.dataset.gbAvObs = '1';
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; decorateModalAvatars(); });
    }).observe(modal, { childList: true, subtree: true });
  }

  // ---- /issue_statuses: the workflow warning is cut with … on narrow screens; keep the full text as a tooltip ----
  function decorateStatusWarnings() {
    if (!bodyHas('controller-issue_statuses', 'action-index')) return;
    var spans = document.querySelectorAll('#content table.list td > span.icon-warning:not([title])');
    for (var i = 0; i < spans.length; i++) {
      spans[i].setAttribute('title', spans[i].textContent.replace(/\s+/g, ' ').trim());
    }
    // statuses with a description: the warning goes under the description (the 説明 header is above it)
    // and the untitled warning column is hidden. Without descriptions the 説明 column is dropped instead.
    var table = document.querySelector('#content table.list');
    if (!table || table.getAttribute('data-gb-warn-moved') || !table.tHead) return;
    var hasDesc = Array.prototype.some.call(table.querySelectorAll('tbody td.description'), function (td) {
      return td.textContent.trim() !== '';
    });
    if (!hasDesc) return;
    var head = table.tHead.rows[0];
    var descIdx = -1;
    Array.prototype.forEach.call(head.cells, function (th, i) { if (descIdx < 0 && table.tBodies[0].rows[0] && table.tBodies[0].rows[0].cells[i] && table.tBodies[0].rows[0].cells[i].classList.contains('description')) descIdx = i; });
    if (descIdx < 0 || !head.cells[descIdx + 1] || head.cells[descIdx + 1].textContent.trim()) return;
    table.setAttribute('data-gb-warn-moved', '1');
    head.cells[descIdx + 1].classList.add('gb-col-moved');
    Array.prototype.forEach.call(table.tBodies[0].rows, function (tr) {
      var desc = tr.cells[descIdx];
      var warnCell = tr.cells[descIdx + 1];
      if (!desc || !warnCell) return;
      var warn = warnCell.querySelector('span.icon-warning');
      if (warn) desc.appendChild(warn);
      warnCell.classList.add('gb-col-moved');
    });
  }

  // ---- /issue_statuses on phones: the warning column shrinks to its ⚠ icon, so each warning is mirrored
  //      as a short text line under the status name (shown ≤900px only) and the icon column is marked ----
  function mirrorStatusWarnings() {
    if (!bodyHas('controller-issue_statuses', 'action-index')) return;
    var table = document.querySelector('#content table.list');
    if (!table || !table.tBodies[0] || !table.tHead) return;
    var warnIdx = -1;
    Array.prototype.forEach.call(table.tBodies[0].rows, function (tr) {
      var name = tr.querySelector('td.name');
      var warn = tr.querySelector('td span.icon-warning');
      if (!name || !warn) return;
      var cell = warn.closest('td');
      if (cell && !cell.classList.contains('description') && warnIdx < 0) warnIdx = cell.cellIndex;
      if (name.querySelector('.gb-status-warn')) return;
      var note = warn.cloneNode(true);
      note.className = 'gb-status-warn';
      note.removeAttribute('title');
      Array.prototype.forEach.call(note.querySelectorAll('svg'), function (svg) { svg.remove(); });
      Array.prototype.slice.call(note.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && !n.nodeValue.trim()) n.remove();
        else if (n.nodeType === 3) n.nodeValue = n.nodeValue.replace(/^\s+/, ' ').replace(/\s+$/, '');
      });
      name.appendChild(note);
    });
    if (warnIdx < 0) return;
    Array.prototype.forEach.call(table.rows, function (tr) {
      if (tr.cells[warnIdx]) tr.cells[warnIdx].classList.add('gb-col-warn');
    });
  }

  // ---- project settings > マイルストーン: core prints an &nbsp; between the filter form and the table,
  // which renders as an extra ~22px line (gap twice the 16px rhythm). Drop that blank text node only.
  // The same &nbsp; follows the simple filter form on admin lists (/groups …): drop it there too.
  function dropBlankText(container) {
    if (!container) return;
    Array.prototype.slice.call(container.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && /\u00a0/.test(n.textContent) && !n.textContent.replace(/[\s\u00a0]+/g, '')) container.removeChild(n);
    });
  }
  function tidyVersionsGap() {
    var tab = document.getElementById('tab-content-versions');
    if (!tab) return;
    Array.prototype.slice.call(tab.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && !n.textContent.replace(/[\s\u00a0]+/g, '')) tab.removeChild(n);
    });
  }
  function tidyAdminFilterGap() {
    if (!document.getElementById('admin-menu')) return;
    var content = document.getElementById('content');
    if (content && content.querySelector(':scope > form > fieldset')) dropBlankText(content);
  }

  // ---- /settings: the single tab row scrolls sideways on narrow screens; keep the selected tab in view ----
  function revealSelectedSettingsTab() {
    if (!document.body.classList.contains('controller-settings')) return;
    var ul = document.querySelector('#content .tabs ul');
    var sel = ul && ul.querySelector('a.selected');
    if (!sel || ul.scrollWidth <= ul.clientWidth) return;
    var li = sel.parentNode;
    var left = li.offsetLeft - ul.offsetLeft;
    if (left < ul.scrollLeft || left + li.offsetWidth > ul.scrollLeft + ul.clientWidth) {
      ul.scrollLeft = Math.max(0, left - (ul.clientWidth - li.offsetWidth) / 2);
    }
  }
  // fade cue on the side of the /settings tab row that still has tabs (desktop rules in 90-admin-settings.css)
  function syncSettingsTabFade(ul) {
    var max = ul.scrollWidth - ul.clientWidth;
    ul.classList.toggle('gb-tabs-more-left', max > 2 && ul.scrollLeft > 2);
    ul.classList.toggle('gb-tabs-more-right', max > 2 && max - ul.scrollLeft > 2);
  }
  function watchSettingsTabs() {
    if (!document.body.classList.contains('controller-settings')) return;
    var ul = document.querySelector('#content .tabs ul');
    if (!ul) return;
    syncSettingsTabFade(ul);
    if (ul.getAttribute('data-gb-tab-fade')) return;
    ul.setAttribute('data-gb-tab-fade', '1');
    ul.addEventListener('scroll', function () { syncSettingsTabFade(ul); }, { passive: true });
    // core's inline onclick (showTab) on the link runs first and moves .selected; bring it into view afterwards
    ul.addEventListener('click', function (e) {
      if (!e.target.closest('a')) return;
      revealSelectedSettingsTab();
      syncSettingsTabFade(ul);
    });
    window.addEventListener('resize', function () { syncSettingsTabFade(ul); });
    window.addEventListener('load', function () { syncSettingsTabFade(ul); });
  }

  // ---- user / group edit > プロジェクト tab: roles as the same neutral chips as project settings > メンバー ----
  function decorateMembershipRoles(root) {
    (root || document).querySelectorAll('body:has(#admin-menu) table.list.memberships td.roles > span[id$="-roles"]').forEach(function (s) { chipify(s); });
  }

  // ---- boolean columns (✓ / – / checkbox): header and cells share one centred axis ----
  function isBoolCell(td) {
    if (!td || td.tagName !== 'TD') return false;
    // the row-selection column (query lists) is not a data column
    if (td.classList.contains('checkbox') || td.classList.contains('hide')) return false;
    if (td.classList.contains('tick')) return true;
    if (td.textContent.trim()) return false;
    // core prints a bare ✓ icon (span.icon-checked) for true and an empty cell for false (/issue_statuses)
    if (!td.children.length) return true;
    if (td.children.length === 1 && td.children[0].matches('span.icon-checked, span.icon-only.icon-checked')) return true;
    var controls = td.querySelectorAll('input:not([type=hidden]), select, textarea, a, button');
    return controls.length === 1 && controls[0].type === 'checkbox';
  }
  function isPositiveBoolCell(td) {
    return td.classList.contains('tick') || !!td.querySelector('svg, input[type=checkbox]');
  }
  function markBoolColumns(root) {
    var scope = 'body:has(#admin-menu) #content table.list, body.controller-projects.action-settings #content table.list';
    (root || document).querySelectorAll(scope).forEach(function (table) {
      if (table.matches('.permissions, .transitions, .fields_permissions')) return;
      var head = table.tHead && table.tHead.rows[0];
      var body = table.tBodies[0];
      if (!head || !body || !body.rows.length) return;
      Array.prototype.forEach.call(head.cells, function (th, i) {
        if (th.colSpan > 1) return;
        var all = Array.prototype.every.call(body.rows, function (tr) {
          return tr.cells.length !== head.cells.length || isBoolCell(tr.cells[i]);
        });
        // at least one ✓ / checkbox: an all-empty text column is not a boolean column
        var any = Array.prototype.some.call(body.rows, function (tr) {
          return tr.cells.length === head.cells.length && isPositiveBoolCell(tr.cells[i]);
        });
        if (!all || !any) return;
        th.classList.add('gb-col-bool');
        Array.prototype.forEach.call(body.rows, function (tr) {
          if (tr.cells.length === head.cells.length) tr.cells[i].classList.add('gb-col-bool');
        });
      });
    });
  }

  // ---- /enumerations: section title and its 「新しい値」 button on one row ----
  function decorateEnumerationHeads() {
    if (!bodyHas('controller-enumerations', 'action-index')) return;
    document.querySelectorAll('#content > h3').forEach(function (h) {
      var p = h.nextElementSibling;
      if (!p || p.tagName !== 'P' || !p.querySelector(':scope > a.icon-add')) return;
      var head = document.createElement('div');
      head.className = 'gb-section-head';
      h.parentNode.insertBefore(head, h);
      head.appendChild(h);
      head.appendChild(p);
    });
  }

  // ---- project settings > フォーラム: the header names only the first column; label the 説明 column too ----
  function decorateBoardsHeader() {
    var head = document.querySelector('#tab-content-boards .table-list.boards > .table-list-header');
    if (!head || head.dataset.gbHead) return;
    if (!document.querySelector('#tab-content-boards .table-list-cell.description')) return;
    head.dataset.gbHead = '1';
    var first = head.querySelector('.table-list-cell');
    if (first) first.classList.add('name');
    var d = document.createElement('div');
    d.className = 'table-list-cell description';
    d.textContent = '説明';
    head.appendChild(d);
  }

  // ---- role edit: 「すべてにチェックをつける | すべてのチェックを外す」 → one row of buttons (as on /roles/permissions) ----
  function groupRoleCheckAll() {
    var box = document.getElementById('permissions');
    if (!box || box.dataset.gbCheckall) return;
    var links = Array.prototype.filter.call(box.children, function (el) {
      return el.tagName === 'A' && /checkAll\(/.test(el.getAttribute('onclick') || '');
    });
    if (links.length < 2) return;
    box.dataset.gbCheckall = '1';
    var row = document.createElement('p');
    row.className = 'gb-checkall';
    box.insertBefore(row, links[0]);
    var prev = row.previousSibling;
    while (prev && prev.nodeType === 3 && !prev.nodeValue.trim()) prev = prev.previousSibling;
    if (prev && prev.tagName === 'BR') prev.parentNode.removeChild(prev);
    links.forEach(function (a) {
      var sep = a.nextSibling;
      if (sep && sep.nodeType === 3 && sep.nodeValue.trim() === '|') sep.parentNode.removeChild(sep);
      row.appendChild(a);
    });
  }

  // ---- admin / project settings lists: columns that are empty in every row (e.g. 説明) are marked so
  //      phones can drop them and keep the row actions on screen ----
  function markEmptyColumns(root) {
    if (!document.getElementById('admin-menu') && !isProjectSettings()) return;
    var tables = (root || document).querySelectorAll('#content table.list');
    Array.prototype.forEach.call(tables, function (table) {
      var head = table.tHead && table.tHead.rows[0];
      var rows = table.tBodies[0] ? Array.prototype.slice.call(table.tBodies[0].rows) : [];
      if (!head || !rows.length) return;
      var n = head.cells.length;
      // tables that are forms (repository keywords …) keep their blank cells blank
      var editable = !!table.querySelector('tbody select, tbody textarea, tbody input[type=text]');
      for (var i = 0; i < n; i++) {
        var th = head.cells[i];
        if (!th.textContent.trim()) continue; // action / handle columns have no title: keep them
        var empty = rows.every(function (tr) {
          if (tr.cells.length !== n) return false;
          var td = tr.cells[i];
          return !td.textContent.trim() && !td.querySelector('input, select, svg, img, a');
        });
        th.classList.toggle('gb-col-empty', empty);
        rows.forEach(function (tr) {
          var td = tr.cells[i];
          if (!td) return;
          td.classList.toggle('gb-col-empty', empty);
          // a blank text cell in a column that has values elsewhere shows a quiet 「–」 (CSS)
          var blank = !empty && !editable && tr.cells.length === n && !th.classList.contains('gb-col-bool') &&
            !td.classList.contains('buttons') && !td.textContent.trim() && !td.querySelector('input, select, svg, img, a, span.gb-state-tag');
          td.classList.toggle('gb-cell-empty', blank);
        });
      }
    });
  }

  // ---- settings > リポジトリ: each keyword cell carries its column title (shown above the control on
  //      phones, where the table is stacked). Rows added by core's 「＋」 are clones and keep the attribute ----
  function labelCommitKeywords() {
    var table = document.getElementById('commit-keywords');
    if (!table) return;
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr.commit-keywords'), function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        if (heads[i] && !td.hasAttribute('data-gb-label')) td.setAttribute('data-gb-label', heads[i]);
      });
    });
  }

  // ---- project settings tab toolbars: links that may be shown icon-only on phones keep their label as a tooltip ----
  function titleToolbarLinks() {
    if (!isProjectSettings()) return;
    Array.prototype.forEach.call(document.querySelectorAll('#tab-content-versions > .contextual > a.icon'), function (a) {
      var label = a.querySelector('.icon-label');
      if (label && !a.hasAttribute('title')) a.setAttribute('title', label.textContent.trim());
    });
  }

  function decorate(root) {
    decorateAdminIndex();
    revealSelectedSettingsTab();
    watchSettingsTabs();
    decorateUserHeading();
    decorateEmptyLists();
    tidyAdminFilterGap();
    if (isProjectSettings()) {
      decorateMembers(root);
      decorateVersions(root);
      tidyVersionsGap();
    }
    decorateModalAvatars();
    decorateMembershipRoles(root);
    decorateEnumerationHeads();
    if (isProjectSettings()) decorateBoardsHeader();
    decorateUsers(root);
    decorateBooleanCells(root);
    markBoolColumns(root);
    decorateMatrices(root);
    decorateStatusWarnings();
    mirrorStatusWarnings();
    groupRoleCheckAll();
    markEmptyColumns(root);
    labelCommitKeywords();
    titleToolbarLinks();
  }

  GB.ready(function () { decorate(document); observeModal(); });
  GB.onAjax(function () { decorate(document); });
})();

// === 95-responsive.js ===
// 95-responsive: narrow-width behaviour for Redmine's flyout menu (styled as a left drawer in 95-responsive.css).
// Core responsive.js still moves the menus and opens/closes the flyout; this only adds:
//   - accessible name / state on the hamburger (core renders an empty <a href="#">)
//   - close on overlay tap (the overlay is #wrapper::before) and on Esc, focus moves into the drawer and back
//   - Tab wraps inside the drawer while it is open
//   - tables that are wider than their card and not already inside a scroller get .gb-m-wide
//     (CSS turns them into their own horizontal scroller), re-measured on resize and after AJAX updates
//   - core .autoscroll boxes that overflow get edge-fade state classes (any width)
(function () {
  if (!window.GB) return;
  var MQ = window.matchMedia ? window.matchMedia('(max-width: 899px)') : null;
  var RAIL = window.matchMedia ? window.matchMedia('(min-width: 768px) and (max-width: 899px)') : null;
  // wide tables become their own scroller at every width below the full 1280 layout (DESIGN §3.9)
  var WIDE_MQ = window.matchMedia ? window.matchMedia('(max-width: 1279px)') : null;

  function isOpen() { return document.documentElement.classList.contains('flyout-is-active'); }
  function drawer() { return document.querySelector('.js-flyout-menu'); }
  function toggleBtn() { return document.querySelector('#header .js-flyout-menu-toggle-button'); }

  function close() {
    if (!isOpen()) return;
    if (typeof window.closeFlyout === 'function') window.closeFlyout();
    else document.documentElement.classList.remove('flyout-is-active');
  }

  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll('a[href], button:not([disabled]), input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'),
      function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0; }
    );
  }

  function syncState() {
    var btn = toggleBtn();
    var menu = drawer();
    var open = isOpen();
    if (btn) {
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    }
    if (menu) {
      // 768–899 inside a project the closed drawer is the visible icon rail (95-responsive.css)
      var rail = !!(RAIL && RAIL.matches && menu.querySelector('.js-project-menu > ul > li'));
      if (open || rail || !MQ || !MQ.matches) menu.removeAttribute('aria-hidden');
      else menu.setAttribute('aria-hidden', 'true');
    }
  }

  // ---------- wide tables ----------
  var WIDE = 'gb-m-wide';
  function inScroller(el, stop) {
    for (var p = el.parentElement; p && p !== stop; p = p.parentElement) {
      // only a scroller that exists for the table counts (.autoscroll, or a box holding just the table).
      // A clipping card (overflow hidden) would cut the table off, and a scrolling panel with other content
      // (settings tab: action bar, filters, table) would slide everything sideways with no edge fade.
      if (!/auto|scroll/.test(window.getComputedStyle(p).overflowX)) continue;
      if (p.classList.contains('autoscroll') || p.classList.contains('gb-m-scroll') || p.children.length === 1) return true;
    }
    return false;
  }
  function markWideTables() {
    var content = document.getElementById('content');
    if (!content) return;
    var tables = content.querySelectorAll('table');
    var narrow = !!(WIDE_MQ && WIDE_MQ.matches);
    var i, t;
    for (i = 0; i < tables.length; i++) tables[i].classList.remove(WIDE);
    if (!narrow) return;
    var wide = [];
    for (i = 0; i < tables.length; i++) {
      t = tables[i];
      if (!t.offsetParent || t.closest('table table') || inScroller(t, content)) continue;
      var parent = t.parentElement;
      // an inline parent (core wraps some lists in a <form>) has clientWidth 0: only its box edge counts then
      var pw = parent.clientWidth;
      if (t.getBoundingClientRect().right > parent.getBoundingClientRect().right + 1 || (pw > 0 && t.offsetWidth > pw + 1)) wide.push(t);
    }
    for (i = 0; i < wide.length; i++) {
      wide[i].classList.add(WIDE);
      syncWideEnd(wide[i]);
      if (!wide[i].getAttribute('data-gb-m-scroll')) {
        wide[i].setAttribute('data-gb-m-scroll', '1');
        wide[i].addEventListener('scroll', onWideScroll, { passive: true });
      }
    }
  }
  // the right-edge fade disappears once the scroller reaches its end (or when only a few px are hidden)
  function syncWideEnd(t) {
    t.classList.toggle('gb-m-end', t.scrollLeft + t.clientWidth >= t.scrollWidth - 8);
  }
  function onWideScroll(e) { syncWideEnd(e.currentTarget); }

  // ---------- .autoscroll: edge fades while part of the table is out of view (DESIGN §3.9) ----------
  // Core wraps wide lists (users, admin projects, settings tabs …) in .autoscroll, which scrolls sideways
  // at any width. .gb-scroll-x = it overflows; .gb-scroll-start / .gb-scroll-end = scrolled to that edge.
  // A ResizeObserver re-measures when the box or its table changes size (settings tabs shown, AJAX lists).
  var SCROLLER_SEL = '#content .autoscroll';
  var scrollerRO = window.ResizeObserver ? new window.ResizeObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var box = entries[i].target.closest('.autoscroll');
      if (box) syncScroller(box);
    }
  }) : null;
  function syncScroller(el) {
    var max = el.scrollWidth - el.clientWidth;
    var over = max > 1;
    el.classList.toggle('gb-scroll-x', over);
    el.classList.toggle('gb-scroll-start', !over || el.scrollLeft <= 4);
    el.classList.toggle('gb-scroll-end', !over || el.scrollLeft >= max - 4);
  }
  function onScrollerScroll(e) { syncScroller(e.currentTarget); }
  function markScrollers() {
    var list = document.querySelectorAll(SCROLLER_SEL);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!el.getAttribute('data-gb-scroll-x')) {
        el.setAttribute('data-gb-scroll-x', '1');
        el.addEventListener('scroll', onScrollerScroll, { passive: true });
        if (scrollerRO) {
          scrollerRO.observe(el);
          if (el.firstElementChild) scrollerRO.observe(el.firstElementChild);
        }
      }
      syncScroller(el);
    }
  }

  // ---------- issue detail: secondary actions mirrored into the … menu ----------
  // Below 768px CSS hides the text buttons next to 「編集」 and shows these copies in the menu instead
  // (≥ 768px the copies are hidden). Copies keep href / data-* so rails-ujs (remote watch, method) still works;
  // the watcher link is replaced by core after AJAX, so this re-runs and re-tags.
  function mirrorKey(a) {
    var cls = (a.getAttribute('class') || '').split(/\s+/);
    for (var i = 0; i < cls.length; i++) {
      if (/^[\w-]+-\d+-watcher$/.test(cls[i])) return cls[i];
    }
    for (i = 0; i < cls.length; i++) {
      if (/^icon-[\w-]+$/.test(cls[i]) && cls[i] !== 'icon-only') return cls[i];
    }
    return null;
  }
  function mirrorActions() {
    var bars = document.querySelectorAll('.gb-issue-head > .contextual');
    Array.prototype.forEach.call(bars, function (bar) {
      var menu = bar.querySelector(':scope > .drdn .drdn-items');
      if (!menu) return;
      var first = menu.firstElementChild;
      Array.prototype.forEach.call(bar.querySelectorAll(':scope > a'), function (a) {
        if (a.classList.contains('icon-edit')) return;
        var key = mirrorKey(a);
        if (!key) return;
        a.classList.add('gb-m-secondary');
        var copy = menu.querySelector(':scope > a.' + key);
        if (!copy) {
          copy = a.cloneNode(true);
          copy.removeAttribute('id');
          copy.removeAttribute('accesskey');
          copy.classList.remove('gb-m-secondary');
          menu.insertBefore(copy, first);
        }
        copy.classList.add('gb-m-mirror');
      });
    });
  }
  GB.ready(mirrorActions);
  GB.onAjax(mirrorActions);

  // ---------- tab bars scroll sideways on narrow widths: keep the selected tab in view ----------
  function revealSelectedTabs() {
    if (!MQ || !MQ.matches) return;
    Array.prototype.forEach.call(document.querySelectorAll('#content div.tabs:not(.jstTabs) > ul'), function (ul) {
      var sel = ul.querySelector('a.selected');
      if (!sel || ul.scrollWidth <= ul.clientWidth) return;
      var li = sel.closest('li');
      ul.scrollLeft = Math.max(0, ul.scrollLeft + li.getBoundingClientRect().left - ul.getBoundingClientRect().left - 16);
    });
  }
  GB.ready(function () {
    revealSelectedTabs();
    window.addEventListener('load', revealSelectedTabs);
  });

  // ---------- drawer: sprite icons for the 全般 links so they align with the project menu ----------
  var GENERAL_ICONS = { 'home': 'apps', 'my-page': 'summary', 'projects': 'projects', 'administration': 'settings', 'help': 'help' };
  function decorateGeneralMenu() {
    var links = document.querySelectorAll('.flyout-menu .js-general-menu a');
    Array.prototype.forEach.call(links, function (a) {
      if (a.querySelector('svg')) return;
      var id = null;
      Object.keys(GENERAL_ICONS).forEach(function (k) { if (!id && a.classList.contains(k)) id = GENERAL_ICONS[k]; });
      var icon = GB.icon(id || 'arrow-right', 'icon-svg');
      if (icon) a.insertBefore(icon, a.firstChild);
    });
  }
  // ---------- 768–899 icon rail: the hidden label becomes the hover tooltip of each icon ----------
  function railTitles() {
    Array.prototype.forEach.call(document.querySelectorAll('.flyout-menu .js-project-menu > ul > li > a'), function (a) {
      var label = a.querySelector('.gb-label');
      if (label && !a.getAttribute('title')) a.setAttribute('title', label.textContent.trim());
    });
  }
  // ---------- drawer: a section heading whose menu has no links left (profile links live in the top bar) ----------
  function markEmptySections() {
    Array.prototype.forEach.call(document.querySelectorAll('.flyout-menu h3'), function (h) {
      var menu = h.nextElementSibling;
      var isMenu = !!menu && /(^|\s)js-(project|general|profile)-menu(\s|$)/.test(menu.className);
      h.classList.toggle('gb-m-empty-section', isMenu && !menu.querySelector('a'));
    });
  }
  // ---------- drawer: the user avatar matches the one in the top bar (same colour and initial) ----------
  function syncDrawerAvatar() {
    var src = document.querySelector('#top-menu .gb-user__btn .gb-avatar');
    var av = document.querySelector('.flyout-menu .flyout-menu__avatar .avatar');
    if (!src || !av) return;
    var idx = src.getAttribute('data-av');
    if (idx) av.setAttribute('data-av', idx);
    if (av.textContent !== src.textContent) av.textContent = src.textContent;
  }
  // ---------- title row: when the page title would wrap beside the actions, the title gets its own
  // row and the actions move under it, right-aligned (CSS: #content.gb-m-title-stack) ----------
  var STACK = 'gb-m-title-stack';
  function titleLines(h2) {
    var range = document.createRange();
    range.selectNodeContents(h2);
    var rects = range.getClientRects();
    // a line = a band of vertically overlapping boxes, so inline-blocks on the same line (e.g. the
    // avatar chip in 「ユーザー » 太 tanaka」, whose glyph box sits lower than the text) are not counted as a 2nd line
    var lines = [];
    for (var i = 0; i < rects.length; i++) {
      var r = rects[i];
      if (r.width < 1 || r.height < 1) continue;
      var line = null;
      for (var j = 0; j < lines.length; j++) {
        if (r.top < lines[j].bottom - 2 && r.bottom > lines[j].top + 2) { line = lines[j]; break; }
      }
      if (line) {
        line.top = Math.min(line.top, r.top);
        line.bottom = Math.max(line.bottom, r.bottom);
      } else {
        lines.push({ top: r.top, bottom: r.bottom });
      }
    }
    return lines.length;
  }
  function syncTitleRow() {
    var content = document.getElementById('content');
    if (!content) return;
    content.classList.remove(STACK);
    if (!MQ || !MQ.matches) return;
    var bar = content.querySelector(':scope > .contextual:first-of-type');
    var h2 = bar && bar.nextElementSibling;
    if (!h2 || h2.tagName !== 'H2' || !bar.offsetWidth) return;
    if (titleLines(h2) > 1) content.classList.add(STACK);
  }
  // ---------- board swimlanes: the lane title (expander, name, count) in one wrapper, so on phones it can
  // stay pinned at the left while the board scrolls column by column (the title cell spans every column,
  // so without this it scrolled away and columns 2+ showed unlabelled lanes). CSS: .gb-m-lane ----------
  function wrapLaneTitles() {
    var cells = document.querySelectorAll('.controller-issues_panel table.issues-panel tr.group > td');
    Array.prototype.forEach.call(cells, function (td) {
      if (td.querySelector(':scope > .gb-m-lane')) return;
      var wrap = document.createElement('span');
      wrap.className = 'gb-m-lane';
      while (td.firstChild) wrap.appendChild(td.firstChild);
      td.appendChild(wrap);
    });
  }
  GB.ready(wrapLaneTitles);
  GB.onAjax(wrapLaneTitles);

  // ---------- issue detail: narrow issue column (< 640px; the 1273px desktop with the sidebar open is ~710px and keeps its layout)
  // -> the pager moves to header row 1 (CSS) ----------
  var NP_HEAD = 'gb-m-np-head';
  function syncIssuePager() {
    var issue = document.querySelector('body.controller-issues.action-show #content > div.issue');
    if (!issue) return;
    issue.classList.toggle(NP_HEAD, issue.clientWidth > 0 && issue.clientWidth < 640);
  }
  GB.ready(function () {
    syncIssuePager();
    var issue = document.querySelector('body.controller-issues.action-show #content > div.issue');
    if (issue && window.ResizeObserver) new ResizeObserver(syncIssuePager).observe(issue);
  });

  // ---------- issue detail (< 768): the compact comment panel is a bottom sheet (95-responsive.css) — this adds
  // the dimmed backdrop (tap = 閉じる, the text stays in the hidden form as with the button) and locks the
  // page scroll while the sheet is open ----------
  var SHEET_MQ = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var SHEET_OPEN = 'gb-m-sheet-open';
  var sheetBackdrop = null;
  function syncSheet() {
    var update = document.getElementById('update');
    var open = !!(update && SHEET_MQ && SHEET_MQ.matches && update.classList.contains('gb-compact') &&
      window.getComputedStyle(update).display !== 'none');
    document.documentElement.classList.toggle(SHEET_OPEN, open);
    if (open && !sheetBackdrop) {
      sheetBackdrop = document.createElement('div');
      sheetBackdrop.className = 'gb-m-sheet-backdrop';
      sheetBackdrop.setAttribute('aria-hidden', 'true');
      sheetBackdrop.addEventListener('click', function () {
        var u = document.getElementById('update');
        var close = u && u.querySelector('.gb-form-actions a.gb-cancel');
        if (close) close.click();
      });
      document.body.appendChild(sheetBackdrop);
    } else if (!open && sheetBackdrop) {
      sheetBackdrop.remove();
      sheetBackdrop = null;
    }
  }
  GB.ready(function () {
    var update = document.getElementById('update');
    if (!update || !document.body.classList.contains('controller-issues')) return;
    new MutationObserver(syncSheet).observe(update, { attributes: true, attributeFilter: ['style', 'class'] });
    if (SHEET_MQ) {
      if (SHEET_MQ.addEventListener) SHEET_MQ.addEventListener('change', syncSheet);
      else if (SHEET_MQ.addListener) SHEET_MQ.addListener(syncSheet);
    }
    syncSheet();
  });

  var wideTimer = null;
  function scheduleWide() {
    window.clearTimeout(wideTimer);
    wideTimer = window.setTimeout(function () { syncTitleRow(); markWideTables(); markScrollers(); }, 120);
  }
  GB.ready(function () {
    syncTitleRow();
    markWideTables();
    markScrollers();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleWide);
    // settings / admin tabs: a table in a tab that was hidden at load is measured once its tab is shown
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('#content div.tabs a')) scheduleWide();
    });
    window.addEventListener('resize', scheduleWide);
    window.addEventListener('load', scheduleWide);
  });
  GB.onAjax(scheduleWide);

  GB.ready(function () {
    var html = document.documentElement;
    var btn = toggleBtn();
    var menu = drawer();
    if (!btn || !menu || btn.getAttribute('data-gb-burger')) return;
    btn.setAttribute('data-gb-burger', '1');
    btn.setAttribute('role', 'button');
    btn.setAttribute('aria-controls', 'gb-flyout');
    if (!menu.id) menu.id = 'gb-flyout';
    menu.setAttribute('role', 'navigation');
    menu.setAttribute('aria-label', 'メニュー');
    menu.setAttribute('tabindex', '-1');
    syncState();
    decorateGeneralMenu();
    syncDrawerAvatar();
    markEmptySections();
    railTitles();
    window.addEventListener('load', function () { decorateGeneralMenu(); syncDrawerAvatar(); markEmptySections(); railTitles(); syncState(); });
    // the global nav rebuilt by 30-sidebar-nav.js can reach the drawer late (first visit): title its rail icons then
    // (the drawer slot itself may be added late too, so watch the drawer and react to project-menu changes only)
    new MutationObserver(function (list) {
      var hit = list.some(function (m) {
        return m.target === menu || (m.target.classList && m.target.classList.contains('js-project-menu'));
      });
      if (hit) { markEmptySections(); railTitles(); syncState(); }
    }).observe(menu, { childList: true, subtree: true });

    var wasOpen = false;
    new MutationObserver(function () {
      var open = isOpen();
      if (open === wasOpen) return;
      wasOpen = open;
      syncState();
      if (open) {
        decorateGeneralMenu();
        syncDrawerAvatar();
        markEmptySections();
        // focus the drawer itself (not its search field: that would pop up the on-screen keyboard)
        window.setTimeout(function () { menu.focus({ preventScroll: true }); }, 60);
      } else if (menu.contains(document.activeElement)) {
        btn.focus({ preventScroll: true });
      }
    }).observe(html, { attributes: true, attributeFilter: ['class'] });

    // overlay tap: the overlay is #wrapper::before, so the event target is #wrapper itself
    document.getElementById('wrapper').addEventListener('click', function (e) {
      if (isOpen() && e.target === this) { e.preventDefault(); close(); }
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { close(); btn.focus(); return; }
      if (e.key !== 'Tab') return;
      var items = [btn].concat(focusables(menu));
      var i = items.indexOf(document.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); items[items.length - 1].focus(); }
      else if (!e.shiftKey && (i === items.length - 1 || i < 0)) { e.preventDefault(); items[0].focus(); }
    });

    // leaving the narrow layout while open (rotate / resize) must not leave the page locked
    if (MQ) {
      var onChange = function () { if (!MQ.matches) close(); syncState(); };
      [MQ, RAIL].forEach(function (mq) {
        if (!mq) return;
        if (mq.addEventListener) mq.addEventListener('change', onChange);
        else if (mq.addListener) mq.addListener(onChange);
      });
    }
  });
})();
