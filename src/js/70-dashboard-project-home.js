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
