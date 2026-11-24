// 90-admin-settings: Administration pages + project settings (DESIGN.md §3.8).
// Presentation only: no form is changed, submitted or re-created.
(function () {
  var GB = window.GB;
  if (!GB) return;

  // theme.js loads in <head>: read document.body lazily
  function bodyHas(a, b) {
    var cl = document.body && document.body.classList;
    return !!cl && cl.contains(a) && cl.contains(b);
  }
  function isProjectSettings() { return bodyHas('controller-projects', 'action-settings'); }
  function isAdminIndex() { return bodyHas('controller-admin', 'action-index'); }

  // ---- /admin: one-line description under each card label (fallback copy; see report) ----
  var ADMIN_DESC = {
    projects: 'プロジェクトの一覧と管理',
    users: 'ユーザーの追加・ロック・権限',
    groups: 'ユーザーをまとめて管理',
    roles: 'ロールごとの権限を設定',
    trackers: '課題の種類と使用する項目',
    'issue-statuses': '課題のステータスを定義',
    workflows: 'ステータスの遷移と項目の権限',
    'custom-fields': '独自の入力項目を追加',
    enumerations: '優先度・作業分類などの選択肢',
    settings: 'システム全体の設定',
    'ldap-authentication': 'LDAP による認証の設定',
    plugins: 'インストール済みのプラグイン',
    info: 'バージョンと動作環境'
  };

  // the 13 links are grouped into titled sections (a flat 4-column grid left one card alone on the last row)
  var ADMIN_GROUPS = [
    { title: 'プロジェクトと課題', keys: ['projects', 'trackers', 'issue-statuses', 'workflows', 'custom-fields', 'enumerations'] },
    { title: 'ユーザーと権限', keys: ['users', 'groups', 'roles', 'ldap-authentication'] },
    { title: 'システム', keys: ['settings', 'plugins', 'info'] }
  ];
  function adminKey(a) {
    var key = null;
    Object.keys(ADMIN_DESC).some(function (k) {
      if (a.classList.contains(k)) { key = k; return true; }
      return false;
    });
    return key;
  }
  function decorateAdminIndex() {
    if (!isAdminIndex()) return;
    var menu = document.querySelector('#admin-index #admin-menu');
    if (!menu || menu.dataset.gbAdmin) return;
    var list = menu.querySelector('ul');
    if (!list) return;
    menu.dataset.gbAdmin = '1';
    var items = Array.prototype.slice.call(list.children);
    var byKey = {};
    items.forEach(function (li) {
      var a = li.querySelector('a');
      if (!a) return;
      var key = adminKey(a);
      if (key) {
        byKey[key] = li;
        var d = document.createElement('span');
        d.className = 'gb-admin-card__desc';
        d.textContent = ADMIN_DESC[key];
        a.appendChild(d);
      }
    });
    var used = [];
    var wrap = document.createElement('div');
    wrap.className = 'gb-admin-groups';
    ADMIN_GROUPS.forEach(function (g, gi) {
      var section = document.createElement('section');
      section.className = 'gb-admin-group';
      var h = document.createElement('h3');
      h.className = 'gb-admin-group__title';
      h.id = 'gb-admin-group-' + gi;
      h.textContent = g.title;
      section.setAttribute('aria-labelledby', h.id);
      var ul = document.createElement('ul');
      g.keys.forEach(function (k) {
        if (byKey[k]) { ul.appendChild(byKey[k]); used.push(byKey[k]); }
      });
      // links added by plugins (unknown keys) go to the last section
      if (gi === ADMIN_GROUPS.length - 1) {
        items.forEach(function (li) { if (used.indexOf(li) < 0) ul.appendChild(li); });
      }
      if (!ul.children.length) return;
      section.appendChild(h);
      section.appendChild(ul);
      wrap.appendChild(section);
    });
    list.parentNode.insertBefore(wrap, list);
    list.parentNode.removeChild(list);
  }

  // ---- shared avatar markup (DESIGN §2.9): <span class="gb-avatar gb-avatar--20" data-av="N" aria-hidden="true">X</span>
  // Built with DOM APIs (no HTML strings); colour index from GB.avatarIndex when global-shell provides it.
  function avatarIndex(name) {
    if (typeof GB.avatarIndex === 'function') return GB.avatarIndex(name);
    var sum = 0;
    for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    return sum % 8;
  }
  function avatarEl(name, size) {
    var el = document.createElement('span');
    el.className = 'gb-avatar gb-avatar--' + size;
    el.setAttribute('data-av', String(avatarIndex(name)));
    el.setAttribute('aria-hidden', 'true');
    el.textContent = GB.initial(name);
    return el;
  }
  function prependAvatar(a, name) {
    if (a.dataset.gbAv) return;
    var prev = a.previousElementSibling;
    a.dataset.gbAv = '1';
    if (prev && prev.classList.contains('gb-avatar')) return;
    a.parentNode.insertBefore(avatarEl(name || a.textContent.trim(), 20), a);
  }
  // display name as core formats it elsewhere (「名 姓」, e.g. プレビュー 確認用) so the avatar matches
  // the header / members / activity avatars of the same user; falls back to the login.
  function displayName(first, last) {
    return [first, last].map(function (s) { return String(s || '').trim(); }).filter(Boolean).join(' ');
  }
  function rowDisplayName(tr) {
    if (!tr) return '';
    var f = tr.querySelector('td.firstname');
    var l = tr.querySelector('td.lastname');
    return displayName(f && f.textContent, l && l.textContent);
  }

  // ---- project settings > members: role text → neutral chips ----
  function chipify(span) {
    if (!span || span.dataset.gbChips) return;
    var text = span.textContent.trim();
    if (!text) return;
    span.dataset.gbChips = '1';
    span.setAttribute('aria-label', text);
    span.classList.add('gb-role-chips');
    span.textContent = '';
    text.split(/\s*,\s*/).forEach(function (name) {
      if (!name) return;
      var chip = document.createElement('span');
      chip.className = 'gb-role-chip';
      chip.setAttribute('aria-hidden', 'true');
      chip.textContent = name;
      span.appendChild(chip);
    });
  }

  function decorateMembers(root) {
    (root || document).querySelectorAll('table.list.members td.roles > span[id$="-roles"]').forEach(function (s) { chipify(s); });
    // the name argument must not receive forEach's index (it printed 1 / 2 / 3 instead of the initial)
    (root || document).querySelectorAll('table.list.members td.name a.user').forEach(function (a) { prependAvatar(a); });
  }

  // ---- project settings > versions: status / sharing → tags ----
  var VERSION_STATUS = { open: 'open', locked: 'locked', closed: 'closed' };
  function decorateVersions(root) {
    (root || document).querySelectorAll('table.list.versions tr.version').forEach(function (tr) {
      var td = tr.querySelector('td.status');
      if (!td || td.dataset.gbTag) return;
      var text = td.textContent.trim();
      if (!text) return;
      td.dataset.gbTag = '1';
      var kind = 'neutral';
      Object.keys(VERSION_STATUS).some(function (k) {
        if (tr.classList.contains(k)) { kind = VERSION_STATUS[k]; return true; }
        return false;
      });
      var tag = document.createElement('span');
      tag.className = 'gb-state-tag gb-state-tag--' + kind;
      tag.textContent = text;
      td.textContent = '';
      td.appendChild(tag);
    });
  }

  // ---- admin users list: 20px avatar before the login (uses the shared avatar helper) ----
  function decorateUsers(root) {
    (root || document).querySelectorAll('body.controller-users.action-index table.list tr.user td.username a, body.controller-users.action-index table.list tr.user td.login a, body.controller-groups table.list td.name a[href*="/users/"]').forEach(function (a) {
      prependAvatar(a, rowDisplayName(a.closest('tr.user')));
    });
  }

  // ---- admin users list: システム管理者 はい/いいえ → ✓ / – (text kept for screen readers) ----
  function decorateBooleanCells(root) {
    var sprite = GB.spriteHref();
    (root || document).querySelectorAll('body.controller-users.action-index table.list tr.user td.admin').forEach(function (td) {
      if (td.dataset.gbBool) return;
      var text = td.textContent.trim();
      if (text !== 'はい' && text !== 'いいえ') return;
      td.dataset.gbBool = '1';
      td.classList.add('tick');
      var sr = document.createElement('span');
      sr.className = 'hidden-for-sighted';
      sr.textContent = text;
      td.textContent = '';
      if (text === 'はい' && sprite) {
        var wrap = document.createElement('span');
        wrap.className = 'icon-only icon-checked';
        wrap.appendChild(GB.svgIcon(sprite, 'checked', 's18 icon-svg'));
        td.appendChild(wrap);
      }
      td.appendChild(sr);
    });
  }

  // ---- matrices: highlight the hovered column (rows are highlighted by CSS) ----
  function bindMatrix(table) {
    if (table.dataset.gbMatrix) return;
    table.dataset.gbMatrix = '1';
    var current = null;
    function clear() {
      if (!current) return;
      table.querySelectorAll('.gb-col-hover').forEach(function (c) { c.classList.remove('gb-col-hover'); });
      current = null;
    }
    table.addEventListener('mouseover', function (e) {
      var cell = e.target.closest('td, th');
      if (!cell || !table.contains(cell)) return;
      var idx = cell.cellIndex;
      if (idx <= 0 || cell.colSpan > 1) { clear(); return; }
      if (current === idx) return;
      clear();
      current = idx;
      Array.prototype.forEach.call(table.rows, function (row) {
        if (row.classList.contains('group')) return;
        var c = row.cells[idx];
        if (c && row.cells.length > 2) c.classList.add('gb-col-hover');
      });
    });
    table.addEventListener('mouseleave', clear);
  }
  function decorateMatrices(root) {
    (root || document).querySelectorAll('table.permissions, table.transitions, table.fields_permissions').forEach(bindMatrix);
  }

  // ---- user edit: the heading avatar uses the same rule as the /users list (display name initial + palette) ----
  function decorateUserHeading() {
    if (!bodyHas('controller-users', 'action-edit') && !bodyHas('controller-users', 'action-update')) return;
    var h2 = document.querySelector('#content > h2');
    var av = h2 && h2.querySelector('span[role="img"].avatar');
    if (!av || av.dataset.gbUserHead) return;
    // the login is the text printed right after the avatar
    var login = '';
    for (var n = av.nextSibling; n; n = n.nextSibling) login += n.textContent || '';
    login = login.trim();
    var fn = document.getElementById('user_firstname');
    var ln = document.getElementById('user_lastname');
    var name = displayName(fn && fn.defaultValue, ln && ln.defaultValue) || login;
    if (!name) return;
    av.dataset.gbUserHead = '1';
    av.setAttribute('data-gb-init', av.getAttribute('data-gb-init') || av.textContent.trim());
    av.setAttribute('data-av', String(avatarIndex(name)));
    av.setAttribute('aria-hidden', 'true');
    av.textContent = GB.initial(name);
  }

  // ---- empty admin lists (/auth_sources …): empty state instead of a header-only table ----
  var EMPTY_COPY = { 'controller-auth_sources': '認証方式はまだ登録されていません' };
  function decorateEmptyLists() {
    var cl = document.body && document.body.classList;
    if (!cl) return;
    Object.keys(EMPTY_COPY).forEach(function (bodyClass) {
      if (!cl.contains(bodyClass) || !cl.contains('action-index')) return;
      var table = document.querySelector('#content > table.list');
      if (!table || table.dataset.gbEmpty || table.querySelector('tbody tr')) return;
      table.dataset.gbEmpty = '1';
      var p = document.createElement('p');
      p.className = 'nodata gb-admin-empty';
      p.textContent = EMPTY_COPY[bodyClass];
      table.parentNode.insertBefore(p, table);
    });
  }

  // ---- new member / membership modal: core two-letter avatars → one initial (§2.9) ----
  // The modal and its search results arrive through rails-ujs (no jQuery ajaxComplete), so a
  // MutationObserver on #ajax-modal re-decorates. The name is the text printed after the avatar.
  function decorateModalAvatars() {
    var modal = document.getElementById('ajax-modal');
    if (!modal) return;
    modal.querySelectorAll('span[role="img"].avatar:not([data-gb-init])').forEach(function (av) {
      var name = '';
      for (var n = av.nextSibling; n; n = n.nextSibling) name += n.textContent || '';
      name = name.replace(/\s+/g, ' ').trim();
      av.setAttribute('data-gb-init', av.textContent.trim());
      if (!name) { av.textContent = GB.initial(av.textContent); return; }
      av.setAttribute('data-av', String(avatarIndex(name)));
      av.setAttribute('aria-hidden', 'true');
      av.textContent = GB.initial(name);
    });
  }
  function observeModal() {
    var modal = document.getElementById('ajax-modal');
    if (!modal || modal.dataset.gbAvObs || !window.MutationObserver) return;
    modal.dataset.gbAvObs = '1';
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(function () { queued = false; decorateModalAvatars(); });
    }).observe(modal, { childList: true, subtree: true });
  }

  // ---- /issue_statuses: the workflow warning is cut with … on narrow screens; keep the full text as a tooltip ----
  function decorateStatusWarnings() {
    if (!bodyHas('controller-issue_statuses', 'action-index')) return;
    var spans = document.querySelectorAll('#content table.list td > span.icon-warning:not([title])');
    for (var i = 0; i < spans.length; i++) {
      spans[i].setAttribute('title', spans[i].textContent.replace(/\s+/g, ' ').trim());
    }
    // statuses with a description: the warning goes under the description (the 説明 header is above it)
    // and the untitled warning column is hidden. Without descriptions the 説明 column is dropped instead.
    var table = document.querySelector('#content table.list');
    if (!table || table.getAttribute('data-gb-warn-moved') || !table.tHead) return;
    var hasDesc = Array.prototype.some.call(table.querySelectorAll('tbody td.description'), function (td) {
      return td.textContent.trim() !== '';
    });
    if (!hasDesc) return;
    var head = table.tHead.rows[0];
    var descIdx = -1;
    Array.prototype.forEach.call(head.cells, function (th, i) { if (descIdx < 0 && table.tBodies[0].rows[0] && table.tBodies[0].rows[0].cells[i] && table.tBodies[0].rows[0].cells[i].classList.contains('description')) descIdx = i; });
    if (descIdx < 0 || !head.cells[descIdx + 1] || head.cells[descIdx + 1].textContent.trim()) return;
    table.setAttribute('data-gb-warn-moved', '1');
    head.cells[descIdx + 1].classList.add('gb-col-moved');
    Array.prototype.forEach.call(table.tBodies[0].rows, function (tr) {
      var desc = tr.cells[descIdx];
      var warnCell = tr.cells[descIdx + 1];
      if (!desc || !warnCell) return;
      var warn = warnCell.querySelector('span.icon-warning');
      if (warn) desc.appendChild(warn);
      warnCell.classList.add('gb-col-moved');
    });
  }

  // ---- /issue_statuses on phones: the warning column shrinks to its ⚠ icon, so each warning is mirrored
  //      as a short text line under the status name (shown ≤900px only) and the icon column is marked ----
  function mirrorStatusWarnings() {
    if (!bodyHas('controller-issue_statuses', 'action-index')) return;
    var table = document.querySelector('#content table.list');
    if (!table || !table.tBodies[0] || !table.tHead) return;
    var warnIdx = -1;
    Array.prototype.forEach.call(table.tBodies[0].rows, function (tr) {
      var name = tr.querySelector('td.name');
      var warn = tr.querySelector('td span.icon-warning');
      if (!name || !warn) return;
      var cell = warn.closest('td');
      if (cell && !cell.classList.contains('description') && warnIdx < 0) warnIdx = cell.cellIndex;
      if (name.querySelector('.gb-status-warn')) return;
      var note = warn.cloneNode(true);
      note.className = 'gb-status-warn';
      note.removeAttribute('title');
      Array.prototype.forEach.call(note.querySelectorAll('svg'), function (svg) { svg.remove(); });
      Array.prototype.slice.call(note.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && !n.nodeValue.trim()) n.remove();
        else if (n.nodeType === 3) n.nodeValue = n.nodeValue.replace(/^\s+/, ' ').replace(/\s+$/, '');
      });
      name.appendChild(note);
    });
    if (warnIdx < 0) return;
    Array.prototype.forEach.call(table.rows, function (tr) {
      if (tr.cells[warnIdx]) tr.cells[warnIdx].classList.add('gb-col-warn');
    });
  }

  // ---- project settings > マイルストーン: core prints an &nbsp; between the filter form and the table,
  // which renders as an extra ~22px line (gap twice the 16px rhythm). Drop that blank text node only.
  // The same &nbsp; follows the simple filter form on admin lists (/groups …): drop it there too.
  function dropBlankText(container) {
    if (!container) return;
    Array.prototype.slice.call(container.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && /\u00a0/.test(n.textContent) && !n.textContent.replace(/[\s\u00a0]+/g, '')) container.removeChild(n);
    });
  }
  function tidyVersionsGap() {
    var tab = document.getElementById('tab-content-versions');
    if (!tab) return;
    Array.prototype.slice.call(tab.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && !n.textContent.replace(/[\s\u00a0]+/g, '')) tab.removeChild(n);
    });
  }
  function tidyAdminFilterGap() {
    if (!document.getElementById('admin-menu')) return;
    var content = document.getElementById('content');
    if (content && content.querySelector(':scope > form > fieldset')) dropBlankText(content);
  }

  // ---- /settings: the single tab row scrolls sideways on narrow screens; keep the selected tab in view ----
  function revealSelectedSettingsTab() {
    if (!document.body.classList.contains('controller-settings')) return;
    var ul = document.querySelector('#content .tabs ul');
    var sel = ul && ul.querySelector('a.selected');
    if (!sel || ul.scrollWidth <= ul.clientWidth) return;
    var li = sel.parentNode;
    var left = li.offsetLeft - ul.offsetLeft;
    if (left < ul.scrollLeft || left + li.offsetWidth > ul.scrollLeft + ul.clientWidth) {
      ul.scrollLeft = Math.max(0, left - (ul.clientWidth - li.offsetWidth) / 2);
    }
  }
  // fade cue on the side of the /settings tab row that still has tabs (desktop rules in 90-admin-settings.css)
  function syncSettingsTabFade(ul) {
    var max = ul.scrollWidth - ul.clientWidth;
    ul.classList.toggle('gb-tabs-more-left', max > 2 && ul.scrollLeft > 2);
    ul.classList.toggle('gb-tabs-more-right', max > 2 && max - ul.scrollLeft > 2);
  }
  function watchSettingsTabs() {
    if (!document.body.classList.contains('controller-settings')) return;
    var ul = document.querySelector('#content .tabs ul');
    if (!ul) return;
    syncSettingsTabFade(ul);
    if (ul.getAttribute('data-gb-tab-fade')) return;
    ul.setAttribute('data-gb-tab-fade', '1');
    ul.addEventListener('scroll', function () { syncSettingsTabFade(ul); }, { passive: true });
    // core's inline onclick (showTab) on the link runs first and moves .selected; bring it into view afterwards
    ul.addEventListener('click', function (e) {
      if (!e.target.closest('a')) return;
      revealSelectedSettingsTab();
      syncSettingsTabFade(ul);
    });
    window.addEventListener('resize', function () { syncSettingsTabFade(ul); });
    window.addEventListener('load', function () { syncSettingsTabFade(ul); });
  }

  // ---- user / group edit > プロジェクト tab: roles as the same neutral chips as project settings > メンバー ----
  function decorateMembershipRoles(root) {
    (root || document).querySelectorAll('body:has(#admin-menu) table.list.memberships td.roles > span[id$="-roles"]').forEach(function (s) { chipify(s); });
  }

  // ---- boolean columns (✓ / – / checkbox): header and cells share one centred axis ----
  function isBoolCell(td) {
    if (!td || td.tagName !== 'TD') return false;
    // the row-selection column (query lists) is not a data column
    if (td.classList.contains('checkbox') || td.classList.contains('hide')) return false;
    if (td.classList.contains('tick')) return true;
    if (td.textContent.trim()) return false;
    // core prints a bare ✓ icon (span.icon-checked) for true and an empty cell for false (/issue_statuses)
    if (!td.children.length) return true;
    if (td.children.length === 1 && td.children[0].matches('span.icon-checked, span.icon-only.icon-checked')) return true;
    var controls = td.querySelectorAll('input:not([type=hidden]), select, textarea, a, button');
    return controls.length === 1 && controls[0].type === 'checkbox';
  }
  function isPositiveBoolCell(td) {
    return td.classList.contains('tick') || !!td.querySelector('svg, input[type=checkbox]');
  }
  function markBoolColumns(root) {
    var scope = 'body:has(#admin-menu) #content table.list, body.controller-projects.action-settings #content table.list';
    (root || document).querySelectorAll(scope).forEach(function (table) {
      if (table.matches('.permissions, .transitions, .fields_permissions')) return;
      var head = table.tHead && table.tHead.rows[0];
      var body = table.tBodies[0];
      if (!head || !body || !body.rows.length) return;
      Array.prototype.forEach.call(head.cells, function (th, i) {
        if (th.colSpan > 1) return;
        var all = Array.prototype.every.call(body.rows, function (tr) {
          return tr.cells.length !== head.cells.length || isBoolCell(tr.cells[i]);
        });
        // at least one ✓ / checkbox: an all-empty text column is not a boolean column
        var any = Array.prototype.some.call(body.rows, function (tr) {
          return tr.cells.length === head.cells.length && isPositiveBoolCell(tr.cells[i]);
        });
        if (!all || !any) return;
        th.classList.add('gb-col-bool');
        Array.prototype.forEach.call(body.rows, function (tr) {
          if (tr.cells.length === head.cells.length) tr.cells[i].classList.add('gb-col-bool');
        });
      });
    });
  }

  // ---- /enumerations: section title and its 「新しい値」 button on one row ----
  function decorateEnumerationHeads() {
    if (!bodyHas('controller-enumerations', 'action-index')) return;
    document.querySelectorAll('#content > h3').forEach(function (h) {
      var p = h.nextElementSibling;
      if (!p || p.tagName !== 'P' || !p.querySelector(':scope > a.icon-add')) return;
      var head = document.createElement('div');
      head.className = 'gb-section-head';
      h.parentNode.insertBefore(head, h);
      head.appendChild(h);
      head.appendChild(p);
    });
  }

  // ---- project settings > フォーラム: the header names only the first column; label the 説明 column too ----
  function decorateBoardsHeader() {
    var head = document.querySelector('#tab-content-boards .table-list.boards > .table-list-header');
    if (!head || head.dataset.gbHead) return;
    if (!document.querySelector('#tab-content-boards .table-list-cell.description')) return;
    head.dataset.gbHead = '1';
    var first = head.querySelector('.table-list-cell');
    if (first) first.classList.add('name');
    var d = document.createElement('div');
    d.className = 'table-list-cell description';
    d.textContent = '説明';
    head.appendChild(d);
  }

  // ---- role edit: 「すべてにチェックをつける | すべてのチェックを外す」 → one row of buttons (as on /roles/permissions) ----
  function groupRoleCheckAll() {
    var box = document.getElementById('permissions');
    if (!box || box.dataset.gbCheckall) return;
    var links = Array.prototype.filter.call(box.children, function (el) {
      return el.tagName === 'A' && /checkAll\(/.test(el.getAttribute('onclick') || '');
    });
    if (links.length < 2) return;
    box.dataset.gbCheckall = '1';
    var row = document.createElement('p');
    row.className = 'gb-checkall';
    box.insertBefore(row, links[0]);
    var prev = row.previousSibling;
    while (prev && prev.nodeType === 3 && !prev.nodeValue.trim()) prev = prev.previousSibling;
    if (prev && prev.tagName === 'BR') prev.parentNode.removeChild(prev);
    links.forEach(function (a) {
      var sep = a.nextSibling;
      if (sep && sep.nodeType === 3 && sep.nodeValue.trim() === '|') sep.parentNode.removeChild(sep);
      row.appendChild(a);
    });
  }

  // ---- admin / project settings lists: columns that are empty in every row (e.g. 説明) are marked so
  //      phones can drop them and keep the row actions on screen ----
  function markEmptyColumns(root) {
    if (!document.getElementById('admin-menu') && !isProjectSettings()) return;
    var tables = (root || document).querySelectorAll('#content table.list');
    Array.prototype.forEach.call(tables, function (table) {
      var head = table.tHead && table.tHead.rows[0];
      var rows = table.tBodies[0] ? Array.prototype.slice.call(table.tBodies[0].rows) : [];
      if (!head || !rows.length) return;
      var n = head.cells.length;
      // tables that are forms (repository keywords …) keep their blank cells blank
      var editable = !!table.querySelector('tbody select, tbody textarea, tbody input[type=text]');
      for (var i = 0; i < n; i++) {
        var th = head.cells[i];
        if (!th.textContent.trim()) continue; // action / handle columns have no title: keep them
        var empty = rows.every(function (tr) {
          if (tr.cells.length !== n) return false;
          var td = tr.cells[i];
          return !td.textContent.trim() && !td.querySelector('input, select, svg, img, a');
        });
        th.classList.toggle('gb-col-empty', empty);
        rows.forEach(function (tr) {
          var td = tr.cells[i];
          if (!td) return;
          td.classList.toggle('gb-col-empty', empty);
          // a blank text cell in a column that has values elsewhere shows a quiet 「–」 (CSS)
          var blank = !empty && !editable && tr.cells.length === n && !th.classList.contains('gb-col-bool') &&
            !td.classList.contains('buttons') && !td.textContent.trim() && !td.querySelector('input, select, svg, img, a, span.gb-state-tag');
          td.classList.toggle('gb-cell-empty', blank);
        });
      }
    });
  }

  // ---- settings > リポジトリ: each keyword cell carries its column title (shown above the control on
  //      phones, where the table is stacked). Rows added by core's 「＋」 are clones and keep the attribute ----
  function labelCommitKeywords() {
    var table = document.getElementById('commit-keywords');
    if (!table) return;
    var heads = Array.prototype.map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr.commit-keywords'), function (tr) {
      Array.prototype.forEach.call(tr.children, function (td, i) {
        if (heads[i] && !td.hasAttribute('data-gb-label')) td.setAttribute('data-gb-label', heads[i]);
      });
    });
  }

  // ---- project settings tab toolbars: links that may be shown icon-only on phones keep their label as a tooltip ----
  function titleToolbarLinks() {
    if (!isProjectSettings()) return;
    Array.prototype.forEach.call(document.querySelectorAll('#tab-content-versions > .contextual > a.icon'), function (a) {
      var label = a.querySelector('.icon-label');
      if (label && !a.hasAttribute('title')) a.setAttribute('title', label.textContent.trim());
    });
  }

  function decorate(root) {
    decorateAdminIndex();
    revealSelectedSettingsTab();
    watchSettingsTabs();
    decorateUserHeading();
    decorateEmptyLists();
    tidyAdminFilterGap();
    if (isProjectSettings()) {
      decorateMembers(root);
      decorateVersions(root);
      tidyVersionsGap();
    }
    decorateModalAvatars();
    decorateMembershipRoles(root);
    decorateEnumerationHeads();
    if (isProjectSettings()) decorateBoardsHeader();
    decorateUsers(root);
    decorateBooleanCells(root);
    markBoolColumns(root);
    decorateMatrices(root);
    decorateStatusWarnings();
    mirrorStatusWarnings();
    groupRoleCheckAll();
    markEmptyColumns(root);
    labelCommitKeywords();
    titleToolbarLinks();
  }

  GB.ready(function () { decorate(document); observeModal(); });
  GB.onAjax(function () { decorate(document); });
})();
