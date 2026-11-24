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
