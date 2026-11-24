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
