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
