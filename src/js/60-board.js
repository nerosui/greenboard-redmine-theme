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
