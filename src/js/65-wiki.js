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
