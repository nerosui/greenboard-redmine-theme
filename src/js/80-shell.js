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
