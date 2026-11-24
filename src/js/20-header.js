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
