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
