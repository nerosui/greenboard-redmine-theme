// 40-issue-list: issue list decorations (key, tracker badge, status pill, priority, avatars)
// and small shared helpers reused by 50-issue-detail (exposed as GB.il).
(function () {
  var GB = window.GB;

  // Issue list: the right sidebar (custom queries) starts collapsed on screens < 1440px so the
  // table gets the full width (DESIGN §3.3). Applied once per browser, before core reads its
  // per-page state; afterwards the user's own toggle (stored by core) is respected.
  (function defaultCollapseListSidebar() {
    if (!/^\/(?:projects\/[^\/]+\/)?issues\/?$/.test(location.pathname)) return;
    if (window.innerWidth >= 1440) return;
    try {
      if (localStorage.getItem('gb-issues-sidebar-default')) return;
      localStorage.setItem('gb-issues-sidebar-default', '1');
      localStorage.setItem('redmine-sidebar-state-action-index-controller-issues', 'hidden');
    } catch (e) { /* storage unavailable: core default applies */ }
  })();

  // ---------- shared helpers ----------
  function avatarIndex(name) {
    if (typeof GB.avatarIndex === 'function') return GB.avatarIndex(name);
    var s = String(name || '').trim(), sum = 0;
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return sum % 8;
  }

  // Round single-initial avatar (DESIGN §2.9): same markup as GB.avatar in the spec,
  // built with DOM methods (names are never parsed as HTML).
  function avatar(name, size) {
    name = String(name || '').trim();
    var span = document.createElement('span');
    span.className = 'gb-avatar gb-avatar--' + size;
    span.setAttribute('aria-hidden', 'true');
    if (name) {
      span.setAttribute('data-av', String(avatarIndex(name)));
      span.textContent = GB.initial(name);
    } else {
      span.setAttribute('data-av', 'none');
      span.textContent = '?';
    }
    return span;
  }

  function trackerIdOf(el) {
    var m = el && el.className && String(el.className).match(/(?:^|\s)tracker-(\d+)(?:\s|$)/);
    return m ? m[1] : null;
  }

  function trackerPill(text, trackerId) {
    var pill = document.createElement('span');
    pill.className = 'gb-tracker gb-tracker-' + (trackerId || 'x');
    pill.textContent = text;
    return pill;
  }

  function priorityLevel(el) {
    var c = el && el.className ? String(el.className) : '';
    if (/(?:^|\s)priority-(?:high\d*|highest)(?:\s|$)/.test(c)) return 'high';
    if (/(?:^|\s)priority-(?:low\d*|lowest)(?:\s|$)/.test(c)) return 'low';
    return 'normal';
  }

  function decoratePriority(td, level) {
    if (!td || td.querySelector('.gb-prio')) return;
    var text = td.textContent.trim();
    if (!text) return;
    var span = document.createElement('span');
    span.className = 'gb-prio gb-prio--' + level;
    var arrow = document.createElement('span');
    arrow.className = 'gb-prio__arrow';
    arrow.setAttribute('aria-hidden', 'true');
    // one sprite arrow in a fixed 14px box, rotated per level, so the gap to the text is the same for ↑ → ↓
    var icon = GB.icon('arrow-narrow-right', 'gb-prio__icon');
    if (icon) arrow.appendChild(icon);
    else arrow.textContent = level === 'high' ? '↑' : (level === 'low' ? '↓' : '→');
    span.appendChild(arrow);
    span.appendChild(document.createTextNode(text));
    td.textContent = '';
    td.appendChild(span);
  }

  // status pill <span class="gb-status gb-status-N"> (kept as GB.badge for other modules)
  function badge(target, statusId) {
    if (!target || target.querySelector('.gb-status')) return;
    var text = target.textContent.trim();
    if (!text) return;
    var span = document.createElement('span');
    span.className = 'gb-status' + (statusId ? ' gb-status-' + statusId : '');
    span.textContent = text;
    target.textContent = '';
    target.appendChild(span);
  }

  // prepend a round avatar to each user link inside el (idempotent)
  function avatarizeUsers(el, size) {
    if (!el) return;
    el.querySelectorAll('a.user').forEach(function (a) {
      if (a.dataset.gbAv) return;
      a.dataset.gbAv = '1';
      var wrap = document.createElement('span');
      wrap.className = 'gb-user-chip';
      a.parentNode.insertBefore(wrap, a);
      wrap.appendChild(avatar(a.textContent, size));
      wrap.appendChild(a);
    });
  }

  // ---------- issue keys (DEMO-3) ----------
  function bodyProject() {
    var m = document.body.className.match(/(?:^|\s)project-([^\s]+)/);
    return m ? m[1] : null;
  }
  function keyOf(identifier, id) {
    return GB.issueKey(identifier, id);
  }

  // Resolve issue id -> project identifier for issues outside the current project context.
  // Uses the JSON API with the session; failures simply keep the "#id" fallback.
  var projectMap = null, projectMapPromise = null;
  function loadProjects() {
    if (projectMap) return Promise.resolve(projectMap);
    if (projectMapPromise) return projectMapPromise;
    try {
      var cached = JSON.parse(sessionStorage.getItem('gb-project-ids') || 'null');
      if (cached && cached.t > Date.now() - 600000) { projectMap = cached.m; return Promise.resolve(projectMap); }
    } catch (e) { projectMap = null; }
    var map = {};
    function page(offset) {
      return fetch('/projects.json?limit=100&offset=' + offset, { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('projects ' + r.status); return r.json(); })
        .then(function (j) {
          (j.projects || []).forEach(function (p) { map[p.id] = p.identifier; });
          var next = offset + (j.limit || 100);
          if (next < (j.total_count || 0) && offset < 400) return page(next);
          return map;
        });
    }
    projectMapPromise = page(0).then(function (m) {
      projectMap = m;
      try { sessionStorage.setItem('gb-project-ids', JSON.stringify({ t: Date.now(), m: m })); } catch (e) { projectMap = m; }
      return m;
    });
    return projectMapPromise;
  }
  var issueProject = {};
  function resolveIssueProjects(ids) {
    var missing = ids.filter(function (id) { return !(id in issueProject); });
    if (!missing.length) return Promise.resolve(issueProject);
    return Promise.all([
      loadProjects(),
      fetch('/issues.json?status_id=*&limit=100&issue_id=' + missing.slice(0, 100).join(','), { credentials: 'same-origin' })
        .then(function (r) { if (!r.ok) throw new Error('issues ' + r.status); return r.json(); })
    ]).then(function (res) {
      var pm = res[0];
      (res[1].issues || []).forEach(function (i) {
        if (i.project && pm[i.project.id]) issueProject[i.id] = pm[i.project.id];
      });
      return issueProject;
    });
  }
  // links: [{el, id}] ; set text now (best guess) and correct after lookup
  function applyKeys(items, guess) {
    if (!items.length) return;
    items.forEach(function (it) { it.el.textContent = keyOf(guess, it.id); });
    resolveIssueProjects(items.map(function (it) { return it.id; })).then(function (map) {
      items.forEach(function (it) {
        if (map[it.id]) it.el.textContent = keyOf(map[it.id], it.id);
      });
    }).catch(function () { /* keep best guess */ });
  }

  // Shared key formatter for every page that labels an issue (board cards, dashboard, timelines):
  //   GB.il.issueKey(3)            -> "DEMO-3" inside project demo, "#3" outside any project
  //   GB.il.issueKey(3, 'website') -> "WEBSITE-3"
  // Cross-project lists: GB.il.applyKeys([{el, id}], guess) resolves each issue's project asynchronously.
  function issueKey(id, identifier) {
    return keyOf(identifier === undefined ? bodyProject() : identifier, id);
  }

  GB.il = {
    issueKey: issueKey,
    avatar: avatar,
    avatarIndex: avatarIndex,
    avatarizeUsers: avatarizeUsers,
    trackerIdOf: trackerIdOf,
    trackerPill: trackerPill,
    priorityLevel: priorityLevel,
    decoratePriority: decoratePriority,
    bodyProject: bodyProject,
    keyOf: keyOf,
    applyKeys: applyKeys
  };
  GB.badge = badge;

  // ---------- issue list table ----------
  var USER_COLS = ['assigned_to', 'author', 'last_updated_by', 'watcher_users'];

  function decorateListRows(root) {
    var isList = document.body.classList.contains('controller-issues') &&
      document.body.classList.contains('action-index');
    var proj = bodyProject();
    var keyItems = [];
    root.querySelectorAll('table.list.issues tr.issue').forEach(function (tr) {
      badge(tr.querySelector('td.status'), GB.statusIdOf(tr));
      if (!isList || tr.dataset.gbRow) return;
      tr.dataset.gbRow = '1';
      var idLink = tr.querySelector('td.id a');
      var id = tr.id && tr.id.replace(/^issue-/, '');
      if (idLink && id) {
        idLink.classList.add('gb-issue-key');
        idLink.setAttribute('title', '#' + id);
        var projLink = tr.querySelector('td.project a[href^="/projects/"]');
        var rowProj = projLink ? decodeURIComponent(projLink.getAttribute('href').split('/')[2] || '') : null;
        if (rowProj) idLink.textContent = keyOf(rowProj, id);
        else keyItems.push({ el: idLink, id: id });
      }
      var tracker = tr.querySelector('td.tracker');
      if (tracker && !tracker.querySelector('.gb-tracker')) {
        var t = tracker.textContent.trim();
        if (t) { tracker.textContent = ''; tracker.appendChild(trackerPill(t, trackerIdOf(tr))); }
      }
      decoratePriority(tr.querySelector('td.priority'), priorityLevel(tr));
      // timestamps: date only in the cell, full value on hover
      ['updated_on', 'created_on', 'closed_on'].forEach(function (c) {
        var td = tr.querySelector('td.' + c);
        var v = td && td.textContent.trim();
        var dm = v && v.match(/^(\d{4}[\/-]\d{2}[\/-]\d{2})\s+\d{1,2}:\d{2}$/);
        if (dm && !td.title) { td.title = v; td.textContent = dm[1]; }
      });
      USER_COLS.forEach(function (c) { avatarizeUsers(tr.querySelector('td.' + c), 20); });
      // truncated cells keep their full text on hover
      var pj = tr.querySelector('td.project');
      if (pj && !pj.title) pj.title = pj.textContent.trim();
      // cross-project lists: the project name sits as a small line above the subject (the column itself is
      // hidden on desktop so 題名 keeps >= 320px); the key prefix and this line identify the project
      var subj = tr.querySelector('td.subject');
      if (pj && subj && pj.textContent.trim() && !subj.querySelector('.gb-subj-proj')) {
        var lbl = document.createElement('span');
        lbl.className = 'gb-subj-proj';
        lbl.textContent = pj.textContent.trim();
        subj.insertBefore(lbl, subj.firstChild);
      }
      tr.querySelectorAll('td.assigned_to a.user, td.author a.user, td.last_updated_by a.user').forEach(function (u) {
        if (!u.title) u.title = u.textContent.trim();
      });
    });
    if (keyItems.length) {
      // Inside a project without subprojects every row belongs to that project: no lookup needed.
      // (Redmine offers the subproject_id filter only when the project has subprojects.)
      var hasSub = !!document.querySelector('#add_filter_select option[value="subproject_id"]');
      if (proj && !hasSub) keyItems.forEach(function (it) { it.el.textContent = keyOf(proj, it.id); });
      else applyKeys(keyItems, proj);
    }

    // 進捗率: core leaves p.percent empty in list cells -> 「40%」 next to the bar
    root.querySelectorAll('table.list.issues td.done_ratio').forEach(fillPercent);

    if (!isList) return;
    // group rows (e.g. group_by=assigned_to): avatar before a user name;
    // the blank group 「(空)」 reads 「担当者なし」/「未設定」 like the rest of the UI
    var groupBy = document.getElementById('group_by');
    var gb = groupBy ? groupBy.value : '';
    root.querySelectorAll('table.list.issues tr.group').forEach(function (tr) {
      if (tr.dataset.gbGroup) return;
      tr.dataset.gbGroup = '1';
      avatarizeUsers(tr, 20);
      var name = tr.querySelector('span.name');
      if (name && !name.children.length && /^\(\s*空\s*\)$|^\[?なし\]?$/.test(name.textContent.trim())) {
        name.classList.add('gb-group-blank');
        name.textContent = /^(assigned_to|author)$/.test(gb) ? '担当者なし' : '未設定';
        if (gb === 'author') name.textContent = '作成者なし';
      }
    });
  }

  function fillPercent(td) {
    var p = td.querySelector('p.percent');
    var bar = td.querySelector('table.progress');
    if (!p || !bar || p.textContent.trim()) return;
    var m = String(bar.className).match(/progress-(\d+)/);
    if (m) p.textContent = m[1] + '%';
  }

  // ---------- issues report: one card per report, zero cells muted ----------
  function decorateReport() {
    if (!document.body.classList.contains('controller-reports')) return;
    document.querySelectorAll('#content table.issue-report').forEach(function (table) {
      if (table.dataset.gbReport) return;
      table.dataset.gbReport = '1';
      var card = document.createElement('section');
      card.className = 'gb-report-card';
      var h3 = table.previousElementSibling;
      table.parentNode.insertBefore(card, h3 && h3.tagName === 'H3' ? h3 : table);
      if (h3 && h3.tagName === 'H3') card.appendChild(h3);
      card.appendChild(table);
      var br = card.nextElementSibling;
      if (br && br.tagName === 'BR') br.remove();
      // one term on every issue page: the version report is 「マイルストーン」 like the attributes / columns
      if (h3 && h3.tagName === 'H3' && h3.firstChild && h3.firstChild.nodeType === 3) {
        h3.firstChild.textContent = h3.firstChild.textContent.replace('バージョン', 'マイルストーン');
      }
      // 「[なし]」 rows read like the list's blank group headers (担当者なし / 作成者なし / 未設定)
      var kind = (h3 && h3.querySelector('a[href*="/issues/report/"]') || { getAttribute: function () { return ''; } })
        .getAttribute('href').split('/').pop();
      relabelBlankRows(table, kind);
      table.querySelectorAll('tbody td:not(.name), tfoot td').forEach(function (td) {
        if (td.children.length === 0 && /^[-–]?$|^0$/.test(td.textContent.trim())) {
          td.classList.add('gb-zero');
          td.textContent = '–';
        }
      });
      // spare height of the taller neighbour card goes into this empty row, so 「合計」 sits on the card's bottom edge
      var body = table.tBodies[0];
      var cols = table.tHead && table.tHead.rows[0] ? table.tHead.rows[0].cells.length : 1;
      if (body && !body.querySelector('tr.gb-report-fill')) {
        var fill = document.createElement('tr');
        fill.className = 'gb-report-fill';
        fill.setAttribute('aria-hidden', 'true');
        var ftd = document.createElement('td');
        ftd.colSpan = cols;
        fill.appendChild(ftd);
        body.appendChild(fill);
      }
    });
  }

  function blankLabel(kind) {
    if (kind === 'assigned_to') return '担当者なし';
    if (kind === 'author') return '作成者なし';
    return '未設定';
  }
  function relabelBlankRows(root, kind) {
    root.querySelectorAll('td.name a, td.name').forEach(function (el) {
      if (el.children.length || el.dataset.gbBlank || !/^\[\s*なし\s*\]$/.test(el.textContent.trim())) return;
      el.dataset.gbBlank = '1';
      el.classList.add('gb-group-blank');
      el.textContent = blankLabel(kind);
    });
  }
  // report details page (/issues/report/version …): same heading term and blank labels
  function decorateReportDetails() {
    if (!document.body.classList.contains('controller-reports')) return;
    var m = location.pathname.match(/\/issues\/report\/([a-z_]+)$/);
    if (!m) return;
    document.querySelectorAll('#content > h3, #content > h2').forEach(function (h) {
      var t = h.lastChild;
      if (t && t.nodeType === 3 && /バージョン/.test(t.textContent)) t.textContent = t.textContent.replace('バージョン', 'マイルストーン');
    });
    document.querySelectorAll('#content table.issue-report, #content table.issue-report-detailed').forEach(function (t) {
      relabelBlankRows(t, m[1]);
      t.querySelectorAll('tbody td:not(.name), tfoot td').forEach(function (td) {
        if (td.children.length === 0 && /^[-–]?$|^0$/.test(td.textContent.trim())) {
          td.classList.add('gb-zero');
          td.textContent = '–';
        }
      });
    });
    joinReportHeading();
    wrapDetailedTable();
    hideBackLink();
    decorateReportCharts(m[1]);
  }

  // the detailed table scrolls sideways inside a bordered box (border and corners always visible), with the name
  // column pinned and a fade on the right edge while more columns are hidden
  function wrapDetailedTable() {
    var table = document.querySelector('#content > table.issue-report-detailed');
    if (!table || table.dataset.gbWrapped) return;
    table.dataset.gbWrapped = '1';
    var box = document.createElement('div');
    box.className = 'gb-report-scrollbox';
    var scroller = document.createElement('div');
    scroller.className = 'gb-report-scroll';
    table.parentNode.insertBefore(box, table);
    box.appendChild(scroller);
    scroller.appendChild(table);
    var sync = function () {
      var more = scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 1;
      box.classList.toggle('gb-has-more', more);
    };
    scroller.addEventListener('scroll', sync, { passive: true });
    if (window.ResizeObserver) {
      // the box and the table: the table's width changes when the theme CSS arrives after this script
      var ro = new window.ResizeObserver(sync);
      ro.observe(scroller);
      ro.observe(table);
    } else {
      window.addEventListener('resize', sync);
    }
    sync();
  }

  // the breadcrumb 「レポート」 already leads back: core's bottom 「戻る」 link stays for screen readers only
  function hideBackLink() {
    var content = document.getElementById('content');
    if (!content) return;
    Array.prototype.forEach.call(content.children, function (el) {
      if (el.tagName !== 'A' || el.dataset.gbBack || !/\/issues\/report$/.test(el.getAttribute('href') || '')) return;
      el.dataset.gbBack = '1';
      el.classList.add('gb-sr-only');
      var prev = el.previousElementSibling;
      if (prev && prev.tagName === 'BR') prev.classList.add('gb-report-br');
    });
  }

  // 「レポート »」 + a separate h3 「マイルストーン」 → one breadcrumb heading 「レポート › マイルストーン」
  // (the h3 stays for screen readers, visually hidden; the copy in the h2 is aria-hidden so it is not read twice)
  function joinReportHeading() {
    var h2 = document.querySelector('#content > h2');
    var h3 = h2 && h2.nextElementSibling;
    if (!h2 || h2.dataset.gbCrumb || !h3 || h3.tagName !== 'H3' || !h2.querySelector('a')) return;
    h2.dataset.gbCrumb = '1';
    h2.classList.add('gb-crumb');
    Array.prototype.slice.call(h2.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && /^[\s»]*$/.test(n.textContent)) h2.removeChild(n);
    });
    var sep = document.createElement('span');
    sep.className = 'gb-crumb__sep';
    sep.setAttribute('aria-hidden', 'true');
    var icon = GB.icon('angle-right', 'icon-svg');
    if (icon) sep.appendChild(icon); else sep.textContent = '›';
    var cur = document.createElement('span');
    cur.className = 'gb-crumb__current';
    cur.setAttribute('aria-hidden', 'true');
    cur.textContent = h3.textContent.trim();
    h2.appendChild(sep);
    h2.appendChild(cur);
    h3.classList.add('gb-sr-only');
  }

  // core's Chart.js bar charts: same terms as the table (マイルストーン / 未設定 …), theme colours (status series use
  // the status-pill colours, other series the category palette), full content width, legend below, and one
  // y-axis width for both charts so their plot areas line up
  var reportChartMq = window.matchMedia ? window.matchMedia('(max-width: 767px)') : null;
  var CHART_PALETTE = ['--gb-primary', '--gb-av-1', '--gb-av-2', '--gb-av-3', '--gb-av-4', '--gb-av-5', '--gb-av-6', '--gb-av-7'];
  function cssVar(name, fallback) {
    var v = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }
  function alpha(hex, a) {
    var m = /^#([0-9a-f]{6})$/i.exec(hex);
    if (!m) return hex;
    var n = parseInt(m[1], 16);
    return 'rgba(' + (n >> 16 & 255) + ', ' + (n >> 8 & 255) + ', ' + (n & 255) + ', ' + a + ')';
  }
  // status name → id, read from the detailed table (its header cells line up with status_id links in the rows)
  function reportStatusIds() {
    var map = {};
    var table = document.querySelector('#content table.issue-report-detailed');
    if (!table || !table.tHead) return map;
    var heads = table.tHead.rows[0].cells;
    Array.prototype.forEach.call(table.tBodies[0] ? table.tBodies[0].rows : [], function (tr) {
      Array.prototype.forEach.call(tr.cells, function (td, i) {
        var a = td.querySelector('a[href*="status_id="]');
        var m = a && /[?&]status_id=(\d+)(?:&|$)/.exec(a.getAttribute('href'));
        if (m && heads[i]) map[heads[i].textContent.trim()] = m[1];
      });
    });
    return map;
  }
  function niceMax(total, maxTicks) {
    var steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
    for (var i = 0; i < steps.length; i++) {
      if (Math.ceil(total / steps[i]) <= maxTicks) return { max: Math.max(steps[i], Math.ceil(total / steps[i]) * steps[i]), step: steps[i] };
    }
    return { max: total, step: undefined };
  }
  function axisOf(chart, axis) {
    var scales = chart.config.options.scales || {};
    var key = Object.keys(scales).filter(function (k) { return (scales[k].axis || k.charAt(0)) === axis; })[0];
    return key ? { key: key, opts: scales[key] } : null;
  }
  function tuneReportChart(chart, kind, statusIds) {
    var blank = blankLabel(kind);
    var isBlank = function (t) { return typeof t === 'string' && /^\[\s*なし\s*\]$/.test(t.trim()); };
    var font = cssVar('--gb-font', 'sans-serif');
    var text2 = cssVar('--gb-text-2', '#55625e');
    var grid = cssVar('--gb-border', '#e0e5e3');
    var o = chart.config.options;
    o.plugins = o.plugins || {};
    var title = o.plugins.title;
    if (title) {
      if (typeof title.text === 'string') title.text = title.text.replace('バージョン', 'マイルストーン').replace(/\s+別/, '別');
      title.color = cssVar('--gb-text', '#2f3a37');
      title.font = { family: font, size: 14, weight: '600' };
      title.padding = { top: 4, bottom: 12 };
    }
    if (chart.data.labels) chart.data.labels = chart.data.labels.map(function (l) { return isBlank(l) ? blank : l; });
    var cat = 0;
    chart.data.datasets.forEach(function (d, i) {
      if (isBlank(d.label)) d.label = blank;
      var sid = statusIds[String(d.label).trim()];
      var hex = cssVar(sid ? '--gb-st-' + sid : CHART_PALETTE[cat++ % CHART_PALETTE.length], '#3fae8a');
      d.backgroundColor = alpha(hex, 0.85);
      d.hoverBackgroundColor = hex;
      d.borderColor = 'transparent';
      d.borderWidth = 0;
      d.borderRadius = 3;
      d.borderSkipped = false;
      d.maxBarThickness = 28;
      // core hides closed statuses (完了) at first, though the table counts them: show every series
      d.hidden = false;
      chart.setDatasetVisibility(i, true);
    });
    // value axis ends at the largest stacked total (not at the next 「nice」 tick far beyond it)
    var totals = [];
    chart.data.datasets.forEach(function (d) {
      (d.data || []).forEach(function (v, j) { totals[j] = (totals[j] || 0) + (Number(v) || 0); });
    });
    // at most 12 ticks on desktop, 6 on phones (so 「10」「11」 never touch)
    var phone = !!(reportChartMq && reportChartMq.matches);
    var nm = niceMax(Math.max.apply(null, totals.concat([1])), phone ? 6 : 12);
    var tickStyle = { color: text2, font: { family: font, size: 12 } };
    var x = axisOf(chart, 'x');
    if (x) {
      x.opts.min = 0;
      x.opts.max = nm.max;
      x.opts.suggestedMax = nm.max;
      x.opts.ticks = Object.assign(x.opts.ticks || {}, tickStyle, { precision: 0, stepSize: nm.step, autoSkip: true, minRotation: 0, maxRotation: 0 });
      x.opts.grid = Object.assign(x.opts.grid || {}, { color: grid, borderColor: grid, tickLength: 4 });
    }
    var y = axisOf(chart, 'y');
    if (y) {
      y.opts.ticks = Object.assign(y.opts.ticks || {}, tickStyle, { padding: 8 });
      y.opts.grid = Object.assign(y.opts.grid || {}, { display: false, drawBorder: true, borderColor: grid });
    }
    var legend = o.plugins.legend = o.plugins.legend || {};
    legend.position = 'bottom';
    legend.align = 'center';
    legend.labels = Object.assign(legend.labels || {}, {
      color: text2, font: { family: font, size: 12 }, boxWidth: 12, boxHeight: 12, padding: 16,
      usePointStyle: true, pointStyle: 'rectRounded'
    });
    o.maintainAspectRatio = false;
    o.animation = false;
  }
  // both charts get the y-axis width of the widest one (at least 96px), so their plot areas start and end together
  function alignReportAxes(charts) {
    var w = 96;
    charts.forEach(function (c) {
      var y = axisOf(c, 'y');
      if (y && c.scales[y.key]) w = Math.max(w, Math.ceil(c.scales[y.key].width));
    });
    charts.forEach(function (c) {
      var y = axisOf(c, 'y');
      if (!y) return;
      y.opts.afterFit = function (scale) { scale.width = w; };
      // the first update re-resolves the changed options; the bars are only laid out on the new axis by a second one
      c.update('none');
      c.update('none');
    });
  }
  function decorateReportCharts(kind) {
    var tries = 0;
    var statusIds = reportStatusIds();
    var run = function () {
      if (!window.Chart || typeof window.Chart.getChart !== 'function') return false;
      var canvases = document.querySelectorAll('#content .issue-report-graph canvas');
      var charts = [];
      canvases.forEach(function (cv) {
        var chart = window.Chart.getChart(cv);
        if (chart) charts.push(chart);
      });
      if (!canvases.length || charts.length !== canvases.length) return false;
      charts.forEach(function (c) {
        var y = axisOf(c, 'y');
        if (y) delete y.opts.afterFit; // measure the natural label width again (e.g. after a resize)
        tuneReportChart(c, kind, statusIds);
        c.resize();
        c.update('none');
      });
      alignReportAxes(charts);
      return true;
    };
    // core builds the charts in its own jQuery ready handler: wait for them (a few frames at most)
    var poll = function () {
      if (run() || tries++ > 40) return;
      window.setTimeout(poll, 50);
    };
    poll();
    if (reportChartMq && !reportChartMq.gbBound) {
      reportChartMq.gbBound = true;
      if (reportChartMq.addEventListener) reportChartMq.addEventListener('change', run);
      else if (reportChartMq.addListener) reportChartMq.addListener(run);
    }
  }

  // ---------- query options: column move buttons as one icon set ----------
  // core mixes sprite arrows (→ ←) with text glyphs (⇈ ↑ ↓ ⇊) of different sizes; the four get the same sprite
  // arrow as → ← (rotated in CSS), so all six are one 16px icon set
  var MOVE = [
    { re: /moveOptionTop/, icon: 'arrow-narrow-right', cls: 'gb-mv--top', label: '先頭へ移動' },
    { re: /moveOptionUp/, icon: 'arrow-narrow-right', cls: 'gb-mv--up', label: '上へ移動' },
    { re: /moveOptionDown/, icon: 'arrow-narrow-right', cls: 'gb-mv--down', label: '下へ移動' },
    { re: /moveOptionBottom/, icon: 'arrow-narrow-right', cls: 'gb-mv--bottom', label: '末尾へ移動' }
  ];
  function decorateMoveButtons(root) {
    root.querySelectorAll('#list-definition .buttons button, .query-columns ~ .buttons button').forEach(function (b) {
      if (b.dataset.gbMv) return;
      var on = b.getAttribute('onclick') || '';
      if (b.classList.contains('move-right') || b.classList.contains('move-left')) {
        b.dataset.gbMv = '1';
        b.classList.add('gb-mv');
        var l = b.classList.contains('move-right') ? '表示する列に追加' : '表示する列から外す';
        if (!b.title) b.title = l;
        if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', l);
        return;
      }
      MOVE.forEach(function (d) {
        if (!d.re.test(on) || b.dataset.gbMv) return;
        var icon = GB.icon(d.icon, 'gb-mv__icon');
        if (!icon) return;
        b.dataset.gbMv = '1';
        b.classList.add('gb-mv', d.cls);
        b.title = d.label;
        b.setAttribute('aria-label', d.label);
        b.textContent = '';
        b.appendChild(icon);
        if (d.cls === 'gb-mv--top' || d.cls === 'gb-mv--bottom') {
          var bar = document.createElement('span');
          bar.className = 'gb-mv__bar';
          bar.setAttribute('aria-hidden', 'true');
          b.appendChild(bar);
        }
      });
    });
  }

  // ---------- horizontal overflow state of the list scroller ----------
  // .gb-hscroll while the table is wider than its scroller (pinned "…" column gets an edge),
  // .gb-hscroll-end once scrolled to the right end (edge shadow dropped).
  function updateScrollState(box) {
    var over = box.scrollWidth > box.clientWidth + 1;
    box.classList.toggle('gb-hscroll', over);
    box.classList.toggle('gb-hscroll-end', over && box.scrollLeft + box.clientWidth >= box.scrollWidth - 1);
  }
  function watchListScroll(root) {
    if (!document.body.classList.contains('controller-issues') || !document.body.classList.contains('action-index')) return;
    root.querySelectorAll('.autoscroll').forEach(function (box) {
      if (!box.querySelector(':scope > table.list.issues')) return;
      if (!box.dataset.gbScroll) {
        box.dataset.gbScroll = '1';
        box.addEventListener('scroll', function () { updateScrollState(box); }, { passive: true });
        // box resizes (window, sidebar toggle) and table resizes (columns decorated, fonts loaded)
        if (window.ResizeObserver) {
          var ro = new ResizeObserver(function () { updateScrollState(box); });
          ro.observe(box);
          ro.observe(box.querySelector(':scope > table.list.issues'));
        }
      }
      updateScrollState(box);
    });
  }

  // row 「…」 / right-click menu open: the trigger's 「操作」 tooltip must not sit on top of the menu
  function watchContextMenu() {
    if (!document.body.classList.contains('controller-issues')) return;
    var menu = document.getElementById('context-menu');
    if (!menu || menu.dataset.gbWatch || !window.MutationObserver) return;
    menu.dataset.gbWatch = '1';
    var sync = function () {
      var open = window.getComputedStyle(menu).display !== 'none' && menu.children.length > 0;
      document.body.classList.toggle('gb-cm-open', open);
    };
    new window.MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
    sync();
  }

  GB.ready(decorateReport);
  GB.ready(decorateReportDetails);
  GB.ready(function () {
    watchContextMenu();
    // core adds #context-menu after its own ready handler: attach on the first interaction that can open it
    ['mousedown', 'contextmenu', 'keydown'].forEach(function (type) {
      document.addEventListener(type, watchContextMenu, true);
    });
  });
  GB.ready(function () { decorateMoveButtons(document); });
  GB.onAjax(function (root) {
    decorateListRows(root);
    watchListScroll(document);
  });
})();
