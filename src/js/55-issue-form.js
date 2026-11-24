// 55-issue-form
// Issue new / copy / edit / inline edit / compact comment panel / bulk edit.
// Everything here only decorates or moves Redmine's own elements (never re-creates
// form controls) and is idempotent: GB.onAjax re-runs it after every AJAX re-render
// of #all_attributes (tracker / status / project change) and of the bulk form.
(function () {
  var GB = window.GB;
  var DONE_STATUS_NAME = '処理済み';
  var IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
  var fileSeq = 0;
  var NOTES_PLACEHOLDER = 'コメント（@ でメンバーに通知）';

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function each(list, fn) { Array.prototype.forEach.call(list, fn); }
  function bodyIs(cls) { return document.body.classList.contains(cls); }
  // the board's quick-create dialog (#new-issue-card-modal) reuses form#issue-form; board owns it
  function forms() {
    return Array.prototype.filter.call(document.querySelectorAll('form#issue-form, form#bulk_edit_form'), function (f) {
      return !f.closest('#new-issue-card-modal');
    });
  }

  // ---------------------------------------------------------------- header row
  // Visual + tab order: (プロジェクト) → トラッカー → プライベート → 題名 …
  function arrangeHeader(form) {
    var all = form.querySelector('#all_attributes');
    if (!all) return;
    var tracker = all.querySelector(':scope > p > #issue_tracker_id');
    var trackerP = tracker && tracker.parentNode;
    var priv = all.querySelector(':scope > #issue_is_private_wrap');
    if (priv && trackerP && trackerP.nextElementSibling !== priv) all.insertBefore(priv, trackerP.nextSibling);
    if (trackerP) trackerP.setAttribute('data-tracker', tracker.value);
  }

  // ------------------------------------------------------------ field helpers
  function setStatusData(status) {
    if (status && status.parentNode) status.parentNode.setAttribute('data-status', status.value || '');
  }

  function decorateFields(form) {
    var subject = form.querySelector('#issue_subject');
    if (subject && !subject.hasAttribute('placeholder')) subject.setAttribute('placeholder', '題名を入力');
    var parent = form.querySelector('#issue_parent_issue_id');
    if (parent && !parent.hasAttribute('placeholder')) parent.setAttribute('placeholder', '課題番号または題名で検索');
    var notes = form.querySelector('#issue_notes, #bulk_edit_form #notes');
    if (notes && !notes.hasAttribute('placeholder')) notes.setAttribute('placeholder', NOTES_PLACEHOLDER);

    // 時間を記録: its 「コメント」 field sat right above the 「コメント」 section heading; call it 作業メモ
    // here only (field_comments is shared with every time-entry screen, so no locale change)
    var teComments = form.querySelector('#log_time #time_entry_comments');
    if (teComments && !teComments.hasAttribute('placeholder')) teComments.setAttribute('placeholder', '作業内容のメモ');
    var teLabel = form.querySelector('#log_time label[for=time_entry_comments]');
    if (teLabel && !teLabel.hasAttribute('data-gb-relabel')) {
      teLabel.setAttribute('data-gb-relabel', '1');
      each(teLabel.childNodes, function (n) {
        if (n.nodeType === 3 && /コメント/.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace('コメント', '作業メモ');
      });
    }

    // プライベートコメント: drop the whitespace between checkbox and label so the gap is the label's
    // 8px margin alone (bulk edit wraps both in one flex label with the same 8px gap)
    var priv = form.querySelector('#add_notes > #issue_private_notes');
    var gap = priv && priv.nextSibling;
    if (gap && gap.nodeType === 3 && !/\S/.test(gap.nodeValue)) gap.parentNode.removeChild(gap);

    each(form.querySelectorAll('.attributes a.icon-add, #attributes a.icon-add'), function (a) {
      if (a.hasAttribute('aria-label')) return;
      var href = a.getAttribute('href') || '';
      var label = /issue_categories/.test(href) ? 'カテゴリを追加'
        : /versions/.test(href) ? 'マイルストーンを追加'
          : (a.getAttribute('title') || '追加');
      a.setAttribute('aria-label', label);
      a.setAttribute('title', label);
    });

    if (form.id !== 'issue-form') return;
    var status = form.querySelector('#issue_status_id');
    if (status) {
      setStatusData(status);
      var sp = status.parentNode;
      if (!sp.querySelector('.gb-quick')) {
        var done = Array.prototype.find.call(status.options, function (o) {
          return o.textContent.trim() === DONE_STATUS_NAME;
        });
        if (done && !done.selected) {
          var a = el('a', 'gb-quick', DONE_STATUS_NAME + 'に設定');
          a.href = '#';
          a.addEventListener('click', function (e) {
            e.preventDefault();
            status.value = done.value;
            status.dispatchEvent(new Event('change', { bubbles: true }));
          });
          sp.appendChild(a);
        }
      }
    }
  }

  // 「私が担当」 (DESIGN §3.2.6) on every form that has core's assign-to-me link, including the
  // board's quick-create dialog, and hidden while the issue is already assigned to me
  function decorateAssignToMe(root) {
    each(root.querySelectorAll('a.assign-to-me-link'), function (me) {
      if (!me.dataset.gbLabel) {
        me.dataset.gbLabel = '1';
        me.textContent = '私が担当';
      }
      var select = me.parentNode && me.parentNode.querySelector('select');
      if (select) syncAssignToMe(me, select);
    });
  }
  function syncAssignToMe(me, select) {
    var mine = select.value !== '' && select.value === me.getAttribute('data-id');
    me.classList.toggle('hidden', mine);
    me.hidden = mine;
    // core's click handler hides it with jQuery .hide(); bring it back when someone else is picked
    if (!mine && me.style.display === 'none') me.style.removeProperty('display');
  }

  // edit forms save, they do not "send" (§3.2.4); the compact panel switches it to 登録.
  // Bulk edit is an edit too: same 「保存」 so the primary label is the same on every edit screen.
  function labelEditSubmit(form) {
    var isEdit = form.id === 'bulk_edit_form' || (form.id === 'issue-form' && form.classList.contains('edit_issue'));
    if (!isEdit) return;
    var submit = form.querySelector('input[type=submit][name=commit]');
    if (!submit || submit.dataset.gbLabel === '保存') return;
    submit.dataset.gbLabel = '保存';
    if (form.closest('#update.gb-compact')) return;
    submit.value = '保存';
    submit.setAttribute('data-disable-with', '保存');
  }

  // 説明 on edit: core hides the editor behind a pencil link. Make it a real button
  // and show a short read-only preview of the current text above it.
  function decorateDescription(form) {
    var wrap = form.querySelector('#issue_description_and_toolbar');
    var link = wrap && wrap.parentNode.querySelector(':scope > a.icon-edit');
    if (!link || link.dataset.gbDesc) return;
    link.dataset.gbDesc = '1';
    link.classList.add('gb-desc-edit');
    var label = link.querySelector('.icon-label');
    if (label) label.textContent = '説明を編集';
    var ta = wrap.querySelector('textarea');
    link.addEventListener('click', function () {
      var peekEl = link.parentNode.querySelector('.gb-desc-peek');
      if (peekEl) peekEl.remove();
      if (ta) setTimeout(function () { ta.focus(); }, 0);
    });
    if (!ta || !ta.value.trim() || wrap.style.display !== 'none') return;
    var peek = el('div', 'gb-desc-peek');
    peek.appendChild(el('span', 'gb-desc-peek__text', ta.value.trim()));
    peek.setAttribute('aria-hidden', 'true');
    peek.title = 'クリックして説明を編集';
    peek.addEventListener('click', function () { link.click(); });
    link.parentNode.insertBefore(peek, link);
    renderPeek(form, peek);
  }

  // Show the rendered description (same HTML as the issue page) instead of raw markup:
  // inline edit copies it from the page; the full edit page reads it from the issue page.
  function usePeekHtml(peek, wiki) {
    if (!wiki || !peek.isConnected) return;
    var box = el('div', 'wiki gb-desc-peek__wiki');
    each(wiki.childNodes, function (n) { box.appendChild(document.importNode(n, true)); });
    // no interactive content inside the (aria-hidden) peek
    each(box.querySelectorAll('a, input, button, [tabindex]'), function (n) { n.setAttribute('tabindex', '-1'); });
    var text = peek.querySelector('.gb-desc-peek__text');
    if (text) text.replaceWith(box);
  }
  function renderPeek(form, peek) {
    var onPage = document.querySelector('#content div.issue div.description div.wiki');
    if (onPage && form.closest('#update')) { usePeekHtml(peek, onPage); return; }
    var url = form.getAttribute('action');
    if (!url || !/^\/issues\/\d+$/.test(url) || !window.fetch || !window.DOMParser) return;
    fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        usePeekHtml(peek, doc.querySelector('#content div.issue div.description div.wiki'));
      })
      .catch(function () { /* keep the plain-text peek */ });
  }

  // 時間を記録: collapsed unless something is filled in (or has an error)
  function decorateLogTime(form) {
    var fs = form.querySelector('fieldset#log_time');
    var legend = fs && fs.querySelector(':scope > legend');
    if (!legend || fs.dataset.gbFold) return;
    fs.dataset.gbFold = '1';
    var filled = Array.prototype.some.call(fs.querySelectorAll('input[type=text], textarea'), function (i) {
      return i.value.trim() !== '';
    }) || !!fs.querySelector('label.error');
    fs.classList.add('gb-collapsible');
    legend.tabIndex = 0;
    legend.setAttribute('role', 'button');
    function set(open) {
      fs.classList.toggle('gb-collapsed', !open);
      legend.setAttribute('aria-expanded', String(open));
    }
    set(filled);
    legend.addEventListener('click', function () {
      var open = fs.classList.contains('gb-collapsed');
      set(open);
      if (open) {
        var first = fs.querySelector('input[type=text]');
        if (first) first.focus();
      }
    });
    legend.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); legend.click(); }
    });
  }

  // ------------------------------------------------------------- dropzone
  // Keeps core's <input type=file> (focusable, visually hidden) and labels it.
  // Core replaces the input with a clone after each pick (same id), so the label keeps working.
  function decorateDropzones(root) {
    each(root.querySelectorAll('#issue-form span.add_attachment'), function (zone) {
      if (zone.dataset.gbDrop || zone.closest('#new-issue-card-modal')) return;
      var input = zone.querySelector('input.file_selector');
      if (!input) return;
      zone.dataset.gbDrop = '1';
      zone.classList.add('gb-drop');
      if (!input.id) input.id = 'gb-file-' + (++fileSeq);
      var limit = null;
      each(Array.prototype.slice.call(zone.childNodes), function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) {
          limit = el('span', 'gb-drop__limit', n.textContent.trim());
          zone.replaceChild(limit, n);
        }
      });
      var icon = el('span', 'gb-drop__icon');
      icon.setAttribute('aria-hidden', 'true');
      var sprite = GB.spriteHref();
      if (sprite) icon.appendChild(GB.svgIcon(sprite, 'attachment', 'icon-svg'));
      var text = el('span', 'gb-drop__text');
      text.appendChild(el('span', 'gb-drop__full', 'ファイルをドラッグ＆ドロップ、または'));
      text.appendChild(el('span', 'gb-drop__compact', 'またはドラッグ＆ドロップ'));
      var btn = el('label', 'gb-drop__btn');
      btn.htmlFor = input.id;
      btn.appendChild(el('span', 'gb-drop__full', 'ファイルを選択'));
      btn.appendChild(el('span', 'gb-drop__compact', 'ファイルを添付'));
      [icon, text, btn].forEach(function (n) { zone.insertBefore(n, limit); });
      zone.addEventListener('click', function (e) {
        if (e.target.closest('label, input, a')) return;
        var current = zone.querySelector('input.file_selector');
        if (current) current.click();
      });
    });
  }

  // (editor toolbar: tab order, narrow row, 「›」 cover, auto-height → js/15-c-editor.js)

  // core's ＋ (new category / version) links also carry tabindex="200"; positive values jump
  // the sequence, so they fall back to document order
  function dropPositiveTabindex(form) {
    each(form.querySelectorAll('[tabindex]'), function (n) {
      if (parseInt(n.getAttribute('tabindex'), 10) > 0) n.removeAttribute('tabindex');
    });
  }

  // 予定工数 / 作業時間: the 「時間」 unit becomes a span that CSS places inside the input's
  // right edge, so the input is as wide as every other field in its column (bulk has no unit: add one)
  function decorateHours(form) {
    each(form.querySelectorAll('#issue_estimated_hours, #time_entry_hours'), function (input) {
      var p = input.parentNode;
      if (!p || p.querySelector(':scope > .gb-hours-suffix')) return;
      var text = '時間';
      var n = input.nextSibling;
      while (n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
      if (n && n.nodeType === 3) {
        text = n.textContent.trim();
        p.removeChild(n);
      }
      var suffix = el('span', 'gb-hours-suffix', text);
      suffix.setAttribute('aria-hidden', 'true');
      p.insertBefore(suffix, input.nextSibling);
    });
  }

  // empty native date inputs show 「年/月/日」 as muted placeholder text, like every other placeholder
  function syncEmptyDate(input) {
    if (input && input.type === 'date') input.classList.toggle('gb-empty', !input.value);
  }

  // (the blank select option 「未設定」 is C-form: js/15-c-form.js)
  function decorateEmptyDates(form) {
    if (form.id !== 'issue-form' && !form.closest('#ajax-modal')) return;
    each(form.querySelectorAll('input[type=date]'), syncEmptyDate);
  }

  // ------------------------------------------------------------- watchers
  function avatarFor(name, size) {
    if (typeof GB.avatar === 'function') {
      var av = GB.avatar(name, size);
      if (av && av.nodeType === 1) return av;
    }
    var sum = 0;
    for (var i = 0; i < name.length; i++) sum += name.charCodeAt(i);
    var s = el('span', 'gb-f-avatar gb-f-avatar--' + size, GB.initial(name));
    s.setAttribute('data-av', String(sum % 8));
    s.setAttribute('aria-hidden', 'true');
    return s;
  }

  function decorateWatchers(form) {
    each(form.querySelectorAll('#watchers_inputs label.floating'), function (label) {
      var input = label.querySelector('input');
      if (!input || label.querySelector('.gb-avatar, .gb-f-avatar')) return;
      var av = avatarFor(label.textContent.trim(), 20);
      label.insertBefore(av, input.nextSibling);
    });
    var grid = form.querySelector('#watchers_inputs');
    if (grid && !grid.dataset.gbCols) {
      grid.dataset.gbCols = '1';
      if (watchersRO) watchersRO.observe(grid);
    }
    if (grid) balanceWatchers(grid);
  }

  // Watcher columns: as many as fit the longest name without truncation, then evened out so no
  // row holds a lone name (4 users in 3 columns → 2 × 2, never 3 + 1)
  var WATCHER_GAP = 24;
  var watchersRO = window.ResizeObserver ? new ResizeObserver(function (entries) {
    entries.forEach(function (e) { balanceWatchers(e.target); });
  }) : null;
  function balanceWatchers(grid) {
    var labels = grid.querySelectorAll('label.floating');
    var w = grid.clientWidth;
    if (!labels.length || !w) return;
    var need = 0;
    each(labels, function (l) {
      var sum = 0;
      each(l.children, function (c) { sum += c.getBoundingClientRect().width; });
      var text = 0;
      each(l.childNodes, function (n) {
        if (n.nodeType !== 3 || !n.textContent.trim()) return;
        var r = document.createRange();
        r.selectNodeContents(n);
        text += r.getBoundingClientRect().width;
      });
      need = Math.max(need, Math.ceil(sum + text + 8 * l.children.length + 2));
    });
    var fit = Math.max(1, Math.floor((w + WATCHER_GAP) / (Math.max(need, 120) + WATCHER_GAP)));
    var rows = Math.ceil(labels.length / fit);
    var cols = Math.ceil(labels.length / rows);
    if (grid.style.getPropertyValue('--gb-w-cols') !== String(cols)) grid.style.setProperty('--gb-w-cols', String(cols));
  }

  // watcher search modal: single-initial avatars, one-line names, 560px dialog (§2.16)
  function decorateWatcherModal() {
    var list = document.getElementById('users_for_watcher');
    if (!list) return;
    // 「ユーザーの検索:」 → no trailing colon, like every other label in the theme
    var searchLabel = document.querySelector('#new-watcher-form label[for=user_search]');
    if (searchLabel && /[:：]\s*$/.test(searchLabel.textContent)) {
      searchLabel.textContent = searchLabel.textContent.replace(/\s*[:：]\s*$/, '');
    }
    var search = document.getElementById('user_search');
    if (search && !search.hasAttribute('placeholder')) search.setAttribute('placeholder', '名前で絞り込み');
    each(list.querySelectorAll('label'), function (label) {
      if (label.querySelector('.gb-avatar, .gb-f-avatar')) return;
      var input = label.querySelector('input');
      if (!input) return;
      var name = '';
      each(Array.prototype.slice.call(label.childNodes), function (n) {
        if (n.nodeType === 3 && n.textContent.trim()) { name += n.textContent; label.removeChild(n); }
      });
      name = name.replace(/\s+/g, ' ').trim();
      if (!name) return;
      var nameEl = el('span', 'gb-w-name', name);
      label.title = name;
      label.appendChild(avatarFor(name, 20));
      label.appendChild(nameEl);
    });
    var modal = list.closest('#ajax-modal');
    var $ = window.jQuery;
    if (!modal || modal.dataset.gbWide === '1' || !$ || !$.fn.dialog) return;
    var $m = $(modal);
    if (!$m.hasClass('ui-dialog-content')) return;
    modal.dataset.gbWide = '1';
    $m.dialog('option', 'width', Math.min(560, window.innerWidth - 32));
    $m.dialog('option', 'position', { my: 'center', at: 'center', of: window });
    $m.one('dialogclose', function () { delete modal.dataset.gbWide; });
  }

  // ------------------------------------------------------------- action bar
  function kbdHint(label) {
    var s = el('span', 'gb-kbd-hint');
    s.appendChild(el('kbd', null, IS_MAC ? '⌘' : 'Ctrl'));
    s.appendChild(document.createTextNode(' + '));
    s.appendChild(el('kbd', null, 'Enter'));
    s.appendChild(document.createTextNode(' で' + (label || '送信')));
    return s;
  }

  function cancelHref(form) {
    if (form.id === 'bulk_edit_form') {
      try {
        var r = document.referrer ? new URL(document.referrer) : null;
        if (r && r.origin === location.origin && !/\/bulk_/.test(r.pathname)) return r.pathname + r.search;
      } catch (e) { /* ignore malformed referrer */ }
      var m = location.pathname.match(/^\/projects\/[^/]+/);
      return (m ? m[0] : '') + '/issues';
    }
    return form.getAttribute('action') || '/issues';
  }

  function buildActionBar(form) {
    if (form.querySelector('.gb-form-actions')) return;
    var first = form.querySelector('input[type=submit][name=commit]');
    if (!first) return;
    var bar;
    if (form.id === 'bulk_edit_form') {
      bar = first.parentNode;
      if (bar.tagName !== 'P') return;
      bar.classList.add('gb-form-actions');
    } else {
      bar = el('div', 'gb-form-actions');
      form.insertBefore(bar, first);
      each(form.querySelectorAll(':scope > input[type=submit]'), function (s) { bar.appendChild(s); });
    }
    var cancel = form.querySelector(':scope > a[href]');
    if (!cancel) {
      cancel = el('a', null, 'キャンセル');
      cancel.href = cancelHref(form);
    }
    cancel.classList.add('gb-cancel');
    bar.appendChild(cancel);
    bar.appendChild(kbdHint(first.value));
  }

  // ------------------------------------------------------------- validation
  // core's ja format is "%{attribute} %{message}" → 「題名 を入力してください」; drop the stray space
  function tidyMessage(t) {
    return t.replace(/^(\S+) (?=[をはがにのと])/, '$1');
  }

  function markInvalid(field, label, msg) {
    var p = label.closest('p');
    field.setAttribute('aria-invalid', 'true');
    if (p) p.classList.add('gb-invalid');
    var id = 'gb-err-' + field.id;
    if (document.getElementById(id)) return;
    var m = el('span', 'gb-field-error', msg);
    m.id = id;
    var anchor = field.closest('#issue_description_and_toolbar') || field;
    anchor.parentNode.insertBefore(m, anchor.nextSibling);
    var d = field.getAttribute('aria-describedby');
    field.setAttribute('aria-describedby', (d ? d + ' ' : '') + id);
  }

  function mapErrors(form) {
    var box = document.getElementById('errorExplanation');
    if (!box || box.dataset.gbErr) return;
    box.dataset.gbErr = '1';
    var msgs = Array.prototype.map.call(box.querySelectorAll('li'), function (li) {
      var t = tidyMessage(li.textContent.trim());
      if (li.children.length === 0 && li.textContent !== t) li.textContent = t;
      return t;
    });
    var labels = form.querySelectorAll('label.error[for]');
    if (!labels.length) labels = form.querySelectorAll('.tabular p > label[for]:first-child');
    each(labels, function (label) {
      var name = label.textContent.replace(/\*/g, '').trim();
      var field = document.getElementById(label.htmlFor);
      if (!name || !field) return;
      var msg = msgs.find(function (t) { return t.indexOf(name) === 0; });
      if (msg) markInvalid(field, label, msg);
    });
    box.setAttribute('tabindex', '-1');
    box.focus({ preventScroll: true });
    box.scrollIntoView({ block: 'center' });
  }

  function clearInvalid(e) {
    var f = e.target;
    if (!f || !f.getAttribute || f.getAttribute('aria-invalid') !== 'true') return;
    f.removeAttribute('aria-invalid');
    var id = 'gb-err-' + f.id;
    var m = document.getElementById(id);
    if (m) m.remove();
    var d = (f.getAttribute('aria-describedby') || '').split(' ').filter(function (x) { return x && x !== id; });
    if (d.length) f.setAttribute('aria-describedby', d.join(' ')); else f.removeAttribute('aria-describedby');
    var p = f.closest('p');
    if (p) {
      p.classList.remove('gb-invalid');
      var l = p.querySelector('label.error');
      if (l) l.classList.remove('error');
    }
  }

  // ------------------------------------------------------------- issue keys (DEMO-3)
  // same format as the issue page (GB.il from 40-issue-list); "#3" when unknown
  function issueKey(id) {
    var m = document.body.className.match(/(?:^|\s)project-([^\s]+)/);
    return GB.issueKey(m ? m[1] : null, id);
  }

  // ------------------------------------------------------------- page title (edit)
  function decorateTitle() {
    var h2 = document.querySelector('#content > h2');
    var form = document.querySelector('#content > form#issue-form.edit_issue');
    if (!h2 || !form || h2.dataset.gbTitle) return;
    var m = h2.textContent.trim().match(/^(.*\S)\s+#(\d+)$/);
    if (!m) return;
    h2.dataset.gbTitle = '1';
    var tracker = form.querySelector('#issue_tracker_id');
    h2.textContent = '';
    h2.classList.add('gb-form-title', 'gb-form-title--edit');
    // one line: 課題の編集 + tracker + key; the subject lives only in the 題名 field below
    h2.appendChild(el('span', 'gb-form-heading', '課題の編集'));
    if (document.title.indexOf('課題の編集') !== 0) document.title = '課題の編集 - ' + document.title;
    if (tracker) h2.setAttribute('data-tracker', tracker.value);
    h2.appendChild(el('span', 'gb-form-tracker', m[1]));
    var key = el('span', 'gb-form-key', issueKey(m[2]));
    key.title = '#' + m[2];
    h2.appendChild(key);
  }

  // ------------------------------------------------------------- copy (/issues/3/copy)
  // title says what is copied (「DEMO-3 をコピー」 eyebrow, like the edit page) and the copy
  // checkboxes (関連 / 添付 / 子課題) get a section label instead of floating under the card
  function decorateCopy() {
    var form = document.querySelector('#content > form#issue-form.new_issue');
    var from = form && form.querySelector('input[name=copy_from]');
    var h2 = document.querySelector('#content > h2');
    if (!from || !h2 || h2.dataset.gbTitle) return;
    h2.dataset.gbTitle = '1';
    var title = h2.textContent.trim();
    h2.textContent = '';
    h2.classList.add('gb-form-title');
    h2.appendChild(el('span', 'gb-form-eyebrow', issueKey(from.value) + ' をコピー'));
    h2.appendChild(el('span', 'gb-form-main', title));
    var first = form.querySelector(':scope > .box > p:has(> input[type=checkbox])');
    var prev = first && first.previousElementSibling;
    if (first && !(prev && prev.classList.contains('gb-copy-title'))) {
      first.parentNode.insertBefore(el('div', 'gb-copy-title', 'コピーのオプション'), first);
    }
  }

  // ------------------------------------------------------------- bulk edit
  function decorateBulkTitle() {
    var h2 = document.querySelector('#content > h2');
    if (!h2 || !document.getElementById('bulk_edit_form')) return;
    var t = h2.textContent.trim();
    if (t && document.title.indexOf(t) !== 0) document.title = t + ' - ' + document.title;
  }

  function decorateBulkSelection() {
    var list = document.getElementById('bulk-selection');
    if (!list || list.dataset.gb) return;
    list.dataset.gb = '1';
    var items = list.querySelectorAll(':scope > li');
    var keyed = [];
    each(items, function (li) {
      var a = li.querySelector(':scope > a.issue');
      if (!a) return;
      var m = a.textContent.trim().match(/^(.*\S)\s+(#\d+)$/);
      var tm = a.className.match(/(?:^|\s)tracker-(\d+)/);
      if (m) {
        var badge = el('span', 'gb-bulk-tracker', m[1]);
        if (tm) badge.setAttribute('data-tracker', tm[1]);
        li.insertBefore(badge, a);
        a.textContent = m[2];
        a.title = m[2];
        keyed.push({ el: a, id: m[2].slice(1) });
      }
      var rest = '';
      var n = a.nextSibling;
      while (n) {
        var next = n.nextSibling;
        if (n.nodeType === 3) { rest += n.textContent; li.removeChild(n); }
        n = next;
      }
      rest = rest.replace(/^\s*:\s*/, '').trim();
      if (rest) li.insertBefore(el('span', 'gb-bulk-subject', rest), a.nextSibling);
    });
    if (keyed.length && GB.il && GB.il.applyKeys) GB.il.applyKeys(keyed, GB.il.bodyProject());
    if (items.length > 5) {
      for (var i = 5; i < items.length; i++) items[i].classList.add('gb-more-hidden');
      var moreLi = el('li', 'gb-bulk-more-row');
      var more = el('button', 'gb-bulk-more', 'ほか ' + (items.length - 5) + ' 件を表示');
      more.type = 'button';
      more.addEventListener('click', function () {
        each(list.querySelectorAll('.gb-more-hidden'), function (li) { li.classList.remove('gb-more-hidden'); });
        moreLi.remove();
      });
      moreLi.appendChild(more);
      list.appendChild(moreLi);
    }
  }

  function markUnchanged(select) {
    if (select.closest('#bulk_edit_form')) select.classList.toggle('gb-unchanged', select.value === '');
  }

  // ------------------------------------------------------------- compact comment panel
  function currentUserName() {
    var me = document.querySelector('#update a.assign-to-me-link[data-id]');
    if (me) {
      // skip the "<< 自分 >>" pseudo option that shares the same value
      var opt = Array.prototype.find.call(
        document.querySelectorAll('#issue_assigned_to_id option[value="' + me.getAttribute('data-id') + '"]'),
        function (o) { return !/^\s*<</.test(o.textContent); });
      if (opt) return opt.textContent.trim();
    }
    var login = document.querySelector('#loggedas a');
    return login ? login.textContent.trim() : '';
  }

  function updateVisible(update) {
    return update && update.style.display !== 'none' && getComputedStyle(update).display !== 'none';
  }

  // Compact panel tab order follows what is shown: コメント → ステータス → 担当者 → … → 登録.
  // The notes fieldset (same node, nothing re-created) goes before the attributes while
  // compact and back to its original place (marked by a comment node) for the full edit.
  var notesHome = null;
  function placeNotes(form, compact) {
    var notes = form.querySelector('fieldset#add_notes');
    var attrs = form.querySelector('.box > fieldset:has(> #all_attributes)');
    if (!notes || !attrs) return;
    if (compact) {
      if (!notesHome) {
        notesHome = document.createComment('gb-notes-home');
        notes.parentNode.insertBefore(notesHome, notes);
      }
      if (attrs.previousElementSibling !== notes) attrs.parentNode.insertBefore(notes, attrs);
    } else if (notesHome && notesHome.parentNode) {
      notesHome.parentNode.insertBefore(notes, notesHome);
    }
  }

  function setCompact(on) {
    var update = document.getElementById('update');
    var form = update && update.querySelector('#issue-form');
    if (!form) return;
    update.classList.toggle('gb-compact', on);
    placeNotes(form, on);
    var submit = form.querySelector('input[type=submit][name=commit]');
    if (submit) {
      if (!submit.dataset.gbLabel) submit.dataset.gbLabel = submit.value;
      submit.value = on ? '登録' : submit.dataset.gbLabel;
      submit.setAttribute('data-disable-with', submit.value);
    }
    var bar = form.querySelector('.gb-form-actions');
    if (bar) {
      var cancel = bar.querySelector('a.gb-cancel');
      var editAll = bar.querySelector('.gb-edit-all');
      var hint = bar.querySelector('.gb-kbd-hint');
      if (cancel) cancel.textContent = on ? '閉じる' : 'キャンセル';
      var order = on ? [editAll, hint, cancel, submit] : [submit, cancel, hint, editAll];
      order.forEach(function (n) { if (n) bar.appendChild(n); });
    }
    var notes = document.getElementById('issue_notes');
    if (notes) {
      notes.setAttribute('placeholder', NOTES_PLACEHOLDER);
    }
    decorateFields(form);
  }

  function closePanel() {
    var update = document.getElementById('update');
    var cancel = update && update.querySelector('.gb-form-actions a.gb-cancel');
    if (cancel) cancel.click();
    else if (update) update.style.display = 'none';
  }

  function buildCommentCta() {
    if (!bodyIs('controller-issues') || !bodyIs('action-show')) return;
    var update = document.getElementById('update');
    var form = update && update.querySelector('#issue-form');
    if (!form || typeof window.showAndScrollTo !== 'function') return;
    if (document.querySelector('.gb-comment-cta')) return;
    var anchor = document.getElementById('history') || document.querySelector('#content div.issue');
    if (!anchor) return;

    // the row itself is the shared C-comment component (js/15-c-comment.js); the panel logic stays here
    var cta = GB.commentCta('コメントを追加…', function () {
      setCompact(true);
      window.showAndScrollTo('update', 'issue_notes');
    }, currentUserName());
    anchor.parentNode.insertBefore(cta, anchor.nextSibling);
    // the panel opens right where the entry box is
    cta.parentNode.insertBefore(update, cta.nextSibling);

    var h3 = update.querySelector(':scope > h3');
    if (h3 && !h3.dataset.gbTitle) {
      h3.dataset.gbTitle = '1';
      h3.textContent = '課題の編集';
    }

    buildActionBar(form);
    var bar = form.querySelector('.gb-form-actions');
    if (bar && !bar.querySelector('.gb-edit-all')) {
      var all = el('a', 'gb-edit-all', 'すべての項目を編集');
      all.href = '#';
      all.addEventListener('click', function (e) {
        e.preventDefault();
        setCompact(false);
        update.scrollIntoView({ block: 'start', behavior: 'smooth' });
        var subject = document.getElementById('issue_subject');
        if (subject) subject.focus({ preventScroll: true });
      });
      bar.appendChild(all);
    }

    // CTA is visible exactly when the panel is hidden; a hidden panel resets to compact
    function sync() {
      var open = updateVisible(update);
      cta.hidden = open;
      if (!open && !update.classList.contains('gb-compact')) setCompact(true);
    }
    new MutationObserver(function () {
      var wasOpen = cta.hidden;
      sync();
      if (wasOpen && !cta.hidden) GB.commentCta.focus(cta);
    }).observe(update, { attributes: true, attributeFilter: ['style'] });
    setCompact(true);
    sync();

    // one column when the panel (not just the viewport) is too narrow for editor + 280px fields
    var stackMq = window.matchMedia('(max-width: 1000px)');
    function syncStack() {
      var w = update.clientWidth;
      if (!w) return;
      update.classList.toggle('gb-stack', stackMq.matches || w < 680);
    }
    if (window.ResizeObserver) new ResizeObserver(syncStack).observe(update);
    stackMq.addEventListener('change', syncStack);
    syncStack();

    // Esc closes an empty panel; otherwise it only leaves the field (no data loss)
    update.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || e.isComposing || !update.classList.contains('gb-compact')) return;
      var menu = document.querySelector('.tribute-container');
      if (menu && menu.offsetParent !== null) return;
      var notes = document.getElementById('issue_notes');
      var pending = update.querySelector('.attachments_fields > span');
      if (notes && !notes.value.trim() && !pending) {
        e.preventDefault();
        closePanel();
      } else {
        // keep the text and stay inside the panel: next Enter closes, Tab goes to 登録
        e.preventDefault();
        var close = update.querySelector('.gb-form-actions a.gb-cancel');
        if (close && document.activeElement !== close) close.focus();
      }
    });
  }

  // 「編集」 links (top and bottom action bars, cloned or not) open the full form
  function onEditLinkClick(e) {
    var a = e.target.closest && e.target.closest('a[onclick*="showAndScrollTo"]');
    if (!a || !/["']update["']/.test(a.getAttribute('onclick') || '')) return;
    if (!a.classList.contains('icon-edit')) return;
    setCompact(false);
    // core focuses コメント (§3.2.5) and animates to #update.offset().top (100ms), which ends
    // under the sticky issue strip; re-align with scroll-margin-top and keep focus on コメント
    setTimeout(function () {
      var update = document.getElementById('update');
      if (!updateVisible(update)) return;
      var notes = document.getElementById('issue_notes');
      if (notes && document.activeElement !== notes) notes.focus({ preventScroll: true });
      update.scrollIntoView({ block: 'start' });
    }, 180);
  }

  // ------------------------------------------------------------- keyboard
  function onKeydown(e) {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    var t = e.target;
    var form = t.closest && t.closest('form#issue-form, form#bulk_edit_form');
    if (!form || form.closest('#new-issue-card-modal')) return;
    if (e.ctrlKey || e.metaKey) {
      // textareas are handled by core (application.js)
      if (t.tagName === 'TEXTAREA' || t.type === 'file') return;
      var btn = form.querySelector('input[type=submit][name=commit]');
      if (!btn || btn.disabled) return;
      e.preventDefault();
      if (typeof form.requestSubmit === 'function') form.requestSubmit(btn); else btn.click();
      return;
    }
    // Enter in 題名 must not create the issue by accident
    if (t.id === 'issue_subject' && form.classList.contains('new_issue')) e.preventDefault();
  }

  function onChange(e) {
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.id === 'issue_status_id' && t.closest('#issue-form')) setStatusData(t);
    if (t.tagName === 'SELECT') markUnchanged(t);
    if (t.type === 'date') syncEmptyDate(t);
    if (t.id === 'issue_assigned_to_id') {
      var me = t.parentNode.querySelector('a.assign-to-me-link');
      if (me) syncAssignToMe(me, t);
    }
  }

  // ------------------------------------------------------------- wiring
  function decorateAll() {
    each(forms(), function (form) {
      arrangeHeader(form);
      decorateFields(form);
      decorateDescription(form);
      decorateLogTime(form);
      decorateWatchers(form);
      dropPositiveTabindex(form);
      labelEditSubmit(form);
      decorateHours(form);
      decorateEmptyDates(form);
      buildActionBar(form);
      each(form.querySelectorAll('select'), markUnchanged);
    });
    each(document.querySelectorAll('#ajax-modal form'), decorateEmptyDates);
    decorateDropzones(document);
    decorateAssignToMe(document);
    decorateWatcherModal();
  }

  // in-flight spinner only on the button that was pressed (core disables every submit of the
  // form via data-disable-with; the others just look disabled)
  function onSubmit(e) {
    var form = e.target;
    if (!form.matches || !form.matches('form#issue-form, form#bulk_edit_form')) return;
    var by = e.submitter && e.submitter.form === form ? e.submitter
      : form.querySelector('input[type=submit][name=commit]');
    each(form.querySelectorAll('.gb-submitting'), function (b) { b.classList.remove('gb-submitting'); });
    if (by) by.classList.add('gb-submitting');
  }

  GB.ready(function () {
    document.addEventListener('submit', onSubmit, true);
    document.addEventListener('keydown', onKeydown);
    document.addEventListener('change', onChange);
    document.addEventListener('input', clearInvalid);
    document.addEventListener('change', clearInvalid);
    document.addEventListener('click', onEditLinkClick, true);

    decorateAll();
    buildCommentCta();
    decorateTitle();
    decorateCopy();
    decorateBulkTitle();
    decorateBulkSelection();
    each(forms(), mapErrors);

    // new issue: start typing the subject right away
    if (bodyIs('controller-issues') && bodyIs('action-new') && !document.getElementById('errorExplanation')) {
      var subject = document.querySelector('form.new_issue #issue_subject');
      if (subject && !subject.value) subject.focus({ preventScroll: true });
    }
  });
  // Bulk edit: core's defaultFocus() puts the caret in the first text field (親課題, halfway down
  // the form) and scrolls there; the page should open at its title and the selected issues
  function undoBulkAutofocus() {
    if (location.hash) return;
    var parent = document.querySelector('#bulk_edit_form #issue_parent_issue_id');
    if (!parent || document.activeElement !== parent) return;
    parent.blur();
    window.scrollTo(0, 0);
  }

  GB.ready(function () {
    if (!document.getElementById('bulk_edit_form')) return;
    setTimeout(undoBulkAutofocus, 0);
    if (window.jQuery) window.jQuery(function () { setTimeout(undoBulkAutofocus, 0); });
  });

  GB.onAjax(function () {
    decorateAll();
    decorateBulkSelection();
  });
})();
