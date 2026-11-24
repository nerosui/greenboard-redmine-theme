// 15-c-issue-row: issue rows, cards and gantt rows (owner: c-issue-row, DESIGN §6.6–§6.8)
//   - key column header 「#」 -> 「キー」 (table headers and the 「#」 entry of the column pickers), sort link kept
//   - gantt subject column: width and the key-only link text (the tracker name stays in the link title)
// Issue keys themselves come from GB.issueKey (00-core.js); the status-dot select row only needs data-status
// on its <p> (set by the issue form and the board modal), the dot is CSS (15-c-issue-row.css).
(function () {
  var GB = window.GB;
  var KEY_LABEL = 'キー';

  // ---------- I3: 「キー」 header wherever a column lists issue keys ----------
  function relabelKeyHeaders(root) {
    (root || document).querySelectorAll('table.list th.id').forEach(function (th) {
      if (th.getAttribute('data-gb-keyhead')) return;
      th.setAttribute('data-gb-keyhead', '1');
      var a = th.querySelector('a');
      // only the visible text node (also inside the sorted link's .icon-label); the sort link (href, data-*)
      // and its arrow stay as they are
      var walker = document.createTreeWalker(th, NodeFilter.SHOW_TEXT);
      for (var n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.nodeValue.trim() === '#') n.nodeValue = KEY_LABEL;
      }
      if (a && a.title) a.title = a.title.replace('"#"', '"' + KEY_LABEL + '"');
    });
    // column pickers (オプション → 項目, available / selected) and sort selects
    (root || document).querySelectorAll('select option').forEach(function (o) {
      if (o.value === 'id' && o.textContent.trim() === '#') {
        o.textContent = KEY_LABEL;
        if (o.label) o.label = KEY_LABEL;
      }
    });
  }

  // ---------- I6: gantt subject column ----------
  // The column is measured on the gantt table, not the window: max(280px, min(420px, 45% of the table)).
  // At 1273px with the right sidebar open the table is ~710px -> 320px, which shows avatar / icon + key +
  // at least 12 full-width characters of every top-level subject; the chart keeps the remaining 55%+.
  // Phones (<= 480px) keep a narrow column (95-responsive.css sizes it; the subject is in the row title).
  // Every element core sized to the column width moves by the same delta (as core's own column resize does);
  // bars are untouched. Re-measured when the table width changes, never on core's own drag-resize.
  var GANTT_MIN = 280;
  var GANTT_MAX = 420;
  var GANTT_SHARE = 0.45;
  var GANTT_PHONE = 160;

  function ganttTarget(tableW) {
    if (window.matchMedia('(max-width: 480px)').matches) return GANTT_PHONE;
    return Math.max(GANTT_MIN, Math.min(GANTT_MAX, Math.floor(tableW * GANTT_SHARE)));
  }

  function sizeGanttSubjects(table, td) {
    var current = parseFloat(td.style.width);
    var tableW = table.offsetWidth;
    if (!current || !tableW) return;
    var target = ganttTarget(tableW);
    var delta = target - current;
    table.setAttribute('data-gb-subjects-w', String(Math.round(tableW)));
    var nodes = [td].concat(Array.prototype.slice.call(td.querySelectorAll(
      '.gantt_subjects_container, .gantt_subjects_container > .gantt_hdr')));
    nodes.forEach(function (n) {
      var w = parseFloat(n.style.width);
      if (w) n.style.width = Math.max(0, w + delta) + 'px';
    });
    // rows: the column's rendered width minus their indent — core's own formula in resizableSubjectColumn
    td.style.minWidth = target + 'px';
    var colW = td.getBoundingClientRect().width;
    td.querySelectorAll('.project-name, .issue-subject, .version-name').forEach(function (n) {
      var left = parseFloat(n.style.left) || 0;
      n.style.width = Math.max(0, colW - left) + 'px';
    });
  }

  // 「バグ #14」 -> 「#14」 / 「DEMO-14」: the tracker name only lives in the link title (§6.7: the gantt row is
  // one line, the subject gets the width); the full subject is appended to the title too
  function keyOnlyGanttLinks(td) {
    td.querySelectorAll('.issue-subject a.issue').forEach(function (a) {
      if (a.getAttribute('data-gb-keyonly')) return;
      a.setAttribute('data-gb-keyonly', '1');
      var m = a.textContent.trim().match(/^(.+?) (\S+-\d+|#\d+)$/);
      if (m) {
        var num = m[2].match(/^#(\d+)$/);
        var proj = document.body.className.match(/(?:^|\s)project-([^\s]+)/);
        a.textContent = m[2];
        a.title = m[1] + ' ' + (num && proj ? GB.issueKey(proj[1], num[1]) : m[2]);
      }
      var row = a.closest('.issue-subject');
      var subj = row && row.getAttribute('title');
      if (subj && a.title.indexOf(subj) < 0) a.title = a.title + ': ' + subj;
    });
  }

  function decorateGantt() {
    var td = document.querySelector('.controller-gantts table.gantt-table td.gantt_subjects_column');
    var table = td && td.closest('table.gantt-table');
    if (!table) return;
    keyOnlyGanttLinks(td);
    if (td.getAttribute('data-gb-wide')) return;
    td.setAttribute('data-gb-wide', '1');
    var timer = 0;
    var recheck = function () {
      if (timer) return;
      timer = setTimeout(function () {
        timer = 0;
        var cell = table.querySelector('td.gantt_subjects_column');
        if (!cell) return;
        var last = parseFloat(table.getAttribute('data-gb-subjects-w')) || 0;
        if (Math.abs(table.offsetWidth - last) > 1) sizeGanttSubjects(table, cell);
      }, 50);
    };
    // the stylesheet (and the sidebars) can settle after ready: measure again once loaded
    if (typeof ResizeObserver === 'function') new ResizeObserver(recheck).observe(table);
    window.addEventListener('resize', recheck);
    window.addEventListener('load', recheck);
    setTimeout(recheck, 400);
    sizeGanttSubjects(table, td);
  }

  // ---------- L6: dashboard 担当 / ウォッチ tables — tracker badge under the key ----------
  // 70-dashboard-project-home.js puts the badge in front of the subject; a copy goes under the key, and CSS
  // shows one of the two (the key copy whenever the キー column is visible), so the subject gets the cell.
  function trackerUnderKey() {
    document.querySelectorAll('#my-page .mypage-box table.list tr.issue').forEach(function (tr) {
      var idCell = tr.querySelector(':scope > td.id');
      var pill = tr.querySelector(':scope > td.subject > .gb-subj > .gb-tracker');
      if (!idCell || !pill || idCell.querySelector(':scope > .gb-tracker--key')) return;
      var copy = pill.cloneNode(true);
      copy.removeAttribute('id');
      copy.classList.add('gb-tracker--key');
      idCell.appendChild(copy);
    });
  }
  // runs after the page decorators of the same ready / ajax pass (they create the badge)
  function laterTrackerUnderKey() { setTimeout(trackerUnderKey, 0); }

  GB.ready(function () {
    relabelKeyHeaders(document);
    decorateGantt();
    laterTrackerUnderKey();
  });
  GB.onAjax(function () {
    relabelKeyHeaders(document);
    decorateGantt();
    laterTrackerUnderKey();
  });
})();
