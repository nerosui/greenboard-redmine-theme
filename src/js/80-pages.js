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
