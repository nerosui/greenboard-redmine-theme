// 75-project-pages: activity timeline, roadmap / version, calendar, time entries (owner: project-pages)
(function () {
  var GB = window.GB;

  function data() {
    if (typeof GB.pageData === 'function') return GB.pageData();
    return { statuses: [], trackers: [], actions: {}, text: {} };
  }
  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (String(list[i].id) === String(id)) return list[i];
    return null;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
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
    var span = el('span', 'gb-avatar gb-avatar--' + size, GB.initial(name));
    span.setAttribute('aria-hidden', 'true');
    span.setAttribute('data-av', String(avatarIndex(name)));
    return span;
  }
  function trackerBadge(name, id) {
    return el('span', 'gb-tracker gb-tracker-' + (id || 'x'), name);
  }
  function statusPill(name, id) {
    return el('span', 'gb-status gb-status-' + (id || 'x'), name);
  }
  function classNum(node, prefix) {
    var m = node && String(node.className).match(new RegExp('(?:^|\\s)' + prefix + '-(\\d+)(?:\\s|$)'));
    return m ? m[1] : null;
  }

  // issue key "DEMO-21" (GB.ppIssueKey lives in 70-dashboard-project-home.js)
  function issueKey(id, projectName) {
    if (typeof GB.ppIssueKey === 'function') return GB.ppIssueKey(id, projectName);
    return '#' + id;
  }

  // ---------- activity (/activity, /projects/:id/activity): the list itself is C-timeline (15-c-timeline.js) ----------
  // sidebar filter: the first heading repeats the page title; say what the date field is instead
  function decorateActivityFilter() {
    var form = document.querySelector('.controller-activities #activity_scope_form');
    if (!form || form.getAttribute('data-gb-done')) return;
    form.setAttribute('data-gb-done', '1');
    var t = data().text || {};
    var h3 = form.querySelector(':scope > h3');
    var date = form.querySelector('#from');
    if (h3 && date && t.activity_period) {
      var label = document.createElement('label');
      label.className = 'gb-act-filter__label';
      label.htmlFor = 'from';
      label.textContent = t.activity_period;
      h3.parentNode.replaceChild(label, h3);
    }
    var submit = form.querySelector('input[type="submit"]');
    if (submit && submit.parentNode.tagName === 'P') submit.parentNode.classList.add('gb-act-filter__submit');
  }

  // ---------- roadmap / version: related issue rows ----------
  function decorateRelatedIssues(root) {
    var d = data();
    root.querySelectorAll('table.related-issues').forEach(function (table) {
      if (table.getAttribute('data-gb-done')) return;
      table.setAttribute('data-gb-done', '1');
      var rows = table.querySelectorAll('tr.issue');
      rows.forEach(function (tr) {
        var subject = tr.querySelector('td.subject');
        var link = subject && subject.querySelector('a.issue');
        if (link && !subject.querySelector('.gb-tracker')) {
          var m = link.textContent.trim().match(/^(.+?) #(\d+)$/);
          var trackerId = classNum(tr, 'tracker');
          if (m) {
            subject.insertBefore(trackerBadge(m[1], trackerId), subject.firstChild);
            link.textContent = issueKey(m[2]);
            link.classList.add('gb-rel__key');
            // ": 件名" text node -> plain subject span
            var next = link.nextSibling;
            if (next && next.nodeType === 3) {
              var s = el('span', 'gb-rel__subject', next.nodeValue.replace(/^\s*:\s*/, ''));
              subject.replaceChild(s, next);
            }
          }
        }
        var statusId = classNum(tr, 'status');
        var st = byId(d.statuses || [], statusId);
        if (st && !tr.querySelector('td.gb-rel__status')) {
          var td = el('td', 'gb-rel__status');
          td.appendChild(statusPill(st.name, st.id));
          var buttons = tr.querySelector('td.buttons');
          tr.insertBefore(td, buttons || null);
        }
      });
      // Collapse long lists after 10 rows.
      var LIMIT = 10;
      if (rows.length > LIMIT) {
        for (var i = LIMIT; i < rows.length; i++) rows[i].classList.add('gb-rel__extra');
        table.classList.add('is-collapsed');
        var more = el('button', 'gb-rel__more');
        more.type = 'button';
        var label = function () {
          var collapsed = table.classList.contains('is-collapsed');
          more.textContent = collapsed
            ? ((d.text && d.text.show_all) || '') + ' (' + rows.length + ')'
            : ((d.text && d.text.show_less) || '');
          more.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        };
        label();
        more.addEventListener('click', function () {
          table.classList.toggle('is-collapsed');
          label();
        });
        table.parentNode.insertBefore(more, table.nextSibling);
      }
    });
  }

  // progress-info: "5 課題 (1件完了 — 4件未完了)" -> tidy separators
  function decorateVersionOverview(root) {
    root.querySelectorAll('.version-overview p.progress-info').forEach(function (p) {
      if (p.getAttribute('data-gb-done')) return;
      p.setAttribute('data-gb-done', '1');
      Array.prototype.slice.call(p.childNodes).forEach(function (n) {
        if (n.nodeType !== 3) return;
        var t = n.nodeValue.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
        if (/^\s*$/.test(t)) { p.removeChild(n); return; }
        t = t.replace(/\(/g, '\uff08').replace(/\)/g, '\uff09').replace(/\s*\u2014\s*/g, '\u30fb').trim();
        p.replaceChild(el('span', 'gb-sep', t), n);
      });
    });
  }

  // Rows are filtered by the sidebar's tracker checkboxes while the overview counts every issue:
  // say so under the list, with a link that shows all trackers.
  function roadmapAllTrackersUrl() {
    var boxes = document.querySelectorAll('#sidebar input[type="checkbox"][name="tracker_ids[]"]');
    if (!boxes.length) return null;
    var url = new URL(window.location.href);
    url.searchParams.delete('tracker_ids[]');
    boxes.forEach(function (b) { url.searchParams.append('tracker_ids[]', b.value); });
    var form = boxes[0].form;
    if (form) {
      form.querySelectorAll('input[type="checkbox"]:checked:not([name="tracker_ids[]"])').forEach(function (c) {
        if (!url.searchParams.has(c.name)) url.searchParams.append(c.name, c.value);
      });
    }
    return url.pathname + url.search;
  }
  function decorateRoadmapFilterNote(root) {
    var d = data();
    var tpl = d.text && d.text.roadmap_filtered;
    if (!tpl) return;
    var unchecked = document.querySelector('#sidebar input[type="checkbox"][name="tracker_ids[]"]:not(:checked)');
    if (!unchecked) return;
    root.querySelectorAll('.controller-versions .version-overview').forEach(function (ov) {
      var scope = ov.closest('article') || ov.closest('#roadmap');
      if (!scope || scope.getAttribute('data-gb-filter-note')) return;
      scope.setAttribute('data-gb-filter-note', '1');
      var countLink = ov.querySelector('p.progress-info a');
      var total = countLink ? parseInt(countLink.textContent.replace(/[^\d]/g, ''), 10) : NaN;
      var table = scope.querySelector('table.related-issues');
      var shown = table ? table.querySelectorAll('tr.issue').length : 0;
      if (!(total > shown)) return;
      var note = el('p', 'gb-filter-note');
      note.appendChild(document.createTextNode(tpl.replace('%{total}', total).replace('%{shown}', shown) + ' '));
      var href = roadmapAllTrackersUrl();
      if (href && d.text.roadmap_all_trackers) {
        var a = el('a', 'gb-filter-note__link', d.text.roadmap_all_trackers);
        a.href = href;
        note.appendChild(a);
      }
      // read together with the count: right-aligned in the 関連する課題 heading row when there is one
      var caption = table && table.querySelector(':scope > caption');
      if (caption) {
        var span = el('span', 'gb-filter-note gb-filter-note--caption');
        while (note.firstChild) span.appendChild(note.firstChild);
        caption.appendChild(span);
        return;
      }
      var after = table ? (table.closest('form') || table) : ov;
      after.parentNode.insertBefore(note, after.nextSibling);
    });
  }

  // "7:30時間" -> one size for H:MM, unit 時間 in small muted text
  function splitHoursUnit(container) {
    if (!container || container.querySelector('.gb-unit')) return;
    var last = container.lastChild;
    while (last && last.nodeType === 3 && !last.nodeValue.trim()) last = last.previousSibling;
    if (!last || last.nodeType !== 3) return;
    var m = last.nodeValue.match(/^([\s\S]*?)\s*([^\d:.,\s][\s\S]*?)\s*$/);
    if (!m || !m[2]) return;
    last.nodeValue = m[1];
    container.insertBefore(el('span', 'gb-unit', m[2]), last.nextSibling);
  }
  function decorateVersionHours(root) {
    root.querySelectorAll('.controller-versions #version-summary .time-tracking td.total-hours a').forEach(splitHoursUnit);
  }

  // ---------- calendar: month title between prev / next ----------
  function decorateCalendar() {
    var form = document.querySelector('.controller-calendars #content form#query_form');
    var cal = document.querySelector('.controller-calendars #content ul.cal');
    if (!form || !cal || document.querySelector('.gb-cal-nav')) return;
    var pages = form.querySelector('.contextual.pagination');
    var month = form.querySelector('select#month');
    var year = form.querySelector('select#year');
    var yearLabel = form.querySelector('label[for="year"]');
    var nav = el('div', 'gb-cal-nav');
    var title = el('h3', 'gb-cal-nav__title');
    if (month && year) {
      // 「2026年 11月」 (the year options may already read 「2026年」: orderPeriodControls)
      var yearOption = (data().text || {}).year_option;
      var yearText = yearOption ? yearOption.replace('%{year}', year.value)
        : year.options[year.selectedIndex].text + (yearLabel ? yearLabel.textContent.trim() : '');
      title.textContent = yearText + ' ' + month.options[month.selectedIndex].text;
    }
    if (pages) {
      var prev = pages.querySelector('li.previous a');
      var next = pages.querySelector('li.next a');
      if (prev) { prev.classList.add('gb-cal-nav__btn', 'gb-cal-nav__btn--prev'); nav.appendChild(prev); }
      nav.appendChild(title);
      if (next) { next.classList.add('gb-cal-nav__btn', 'gb-cal-nav__btn--next'); nav.appendChild(next); }
      pages.classList.add('gb-cal-nav__src');
    } else {
      nav.appendChild(title);
    }
    var holder = cal.closest('form') || cal;
    holder.parentNode.insertBefore(nav, holder);
    if (!cal.parentNode.classList.contains('gb-cal-scroll')) {
      var scroller = el('div', 'gb-cal-scroll');
      cal.parentNode.insertBefore(scroller, cal);
      scroller.appendChild(cal);
    }

    // Phone list mode (core stacks the days): a full "11/22（日）" label per day.
    var monthNo = month ? parseInt(month.value, 10) : NaN;
    if (monthNo) {
      var seenThisMonth = false;
      cal.querySelectorAll(':scope > li.calbody').forEach(function (li) {
        var num = li.querySelector('p.day-num');
        if (!num || num.querySelector('.gb-cal-date')) return;
        var inMonth = li.classList.contains('this-month');
        if (inMonth) seenThisMonth = true;
        var mo = inMonth ? monthNo : (seenThisMonth ? monthNo % 12 + 1 : (monthNo + 10) % 12 + 1);
        var dayNo = parseInt(num.textContent, 10);
        var abbr = num.querySelector('.abbr-day');
        var wd = abbr ? abbr.textContent.replace(/[()（）\s]/g, '') : '';
        if (!dayNo) return;
        var label = el('span', 'gb-cal-date', mo + '/' + dayNo + (wd ? '\uff08' + wd + '\uff09' : ''));
        label.setAttribute('aria-hidden', 'true');
        num.appendChild(label);
        if (!li.querySelector(':scope > :not(p.day-num)')) li.classList.add('gb-cal-empty');
      });
    }

    // Chips: "バグ #14: 件名" -> "#14 件名" (status colour bar + tooltip carry the rest).
    cal.querySelectorAll('div.issue').forEach(function (chip) {
      var link = chip.querySelector(':scope > a.issue');
      if (!link || chip.getAttribute('data-gb-done')) return;
      chip.setAttribute('data-gb-done', '1');
      var full = link.textContent.trim();
      var m = full.match(/^(.+?) #(\d+)$/);
      var next = link.nextSibling;
      var subject = next && next.nodeType === 3 ? next.nodeValue.replace(/^\s*:\s*/, '').trim() : '';
      if (m) {
        link.textContent = issueKey(m[2]);
        link.setAttribute('aria-label', full + (subject ? ': ' + subject : ''));
      }
      if (next && next.nodeType === 3) {
        chip.replaceChild(el('span', 'gb-cal-chip__subject', subject), next);
      }
    });
    collapseCalendarDays(cal);
  }

  // Busy days: show 3 chips and a 「+n件」 toggle for the rest, so one day cannot stretch the whole week.
  var CAL_MAX_CHIPS = 4;
  var CAL_VISIBLE_CHIPS = 3;
  function collapseCalendarDays(cal) {
    var text = data().text || {};
    cal.querySelectorAll(':scope > li.calbody').forEach(function (li) {
      if (li.querySelector(':scope > .gb-cal-more')) return;
      var chips = li.querySelectorAll(':scope > div.issue, :scope > div.version');
      if (chips.length <= CAL_MAX_CHIPS) return;
      for (var i = CAL_VISIBLE_CHIPS; i < chips.length; i++) chips[i].classList.add('gb-cal-chip--extra');
      var more = (text.cal_more || '+%{count}').replace('%{count}', String(chips.length - CAL_VISIBLE_CHIPS));
      var btn = el('button', 'gb-cal-more', more);
      btn.type = 'button';
      btn.setAttribute('aria-expanded', 'false');
      btn.addEventListener('click', function () {
        var open = li.classList.toggle('gb-cal-day--expanded');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.textContent = open ? (text.show_less || '-') : more;
      });
      li.appendChild(btn);
    });
  }

  // ---------- milestone (version) form: キャンセル next to 作成 / 保存 ----------
  function decorateVersionForm() {
    var form = document.querySelector('body.controller-versions #content form.new_version, body.controller-versions #content form.edit_version');
    if (!form || form.querySelector('.gb-form-cancel')) return;
    var submit = form.querySelector('input[type=submit]');
    if (!submit) return;
    var action = form.getAttribute('action') || '';
    // new: /projects/:id/versions -> /projects/:id/roadmap ; edit: /versions/:id -> the version page
    var href = /\/projects\/[^/]+\/versions\/?$/.test(action) ? action.replace(/\/versions\/?$/, '/roadmap') : action;
    if (!href) return;
    var text = data().text || {};
    var c = el('a', 'gb-form-cancel', text.cancel || 'Cancel');
    c.href = href;
    submit.parentNode.insertBefore(c, submit.nextSibling);
  }

  // ---------- time entries: total as a stat chip ----------
  function decorateTimeTotals() {
    document.querySelectorAll('.controller-timelog p.query-totals').forEach(function (p) {
      if (p.getAttribute('data-gb-done')) return;
      p.setAttribute('data-gb-done', '1');
      var t = data().text || {};
      p.querySelectorAll(':scope > span').forEach(function (s) {
        s.classList.add('gb-total-chip');
        var label = s.querySelector('span:not(.value)');
        var value = s.querySelector('.value');
        if (!label) return;
        var name = label.textContent.replace(/[:：]\s*$/, '').trim();
        // 時間: 12:15 -> 合計 12:15 時間 (other totals keep their column name)
        if (s.classList.contains('total-for-hours') && t.total && value) {
          label.textContent = t.total;
          if (t.hours_unit && !s.querySelector('.gb-unit')) value.parentNode.insertBefore(el('span', 'gb-unit', t.hours_unit), value.nextSibling);
          s.setAttribute('title', name);
        } else {
          label.textContent = name;
        }
      });
    });
  }

  // list: one-line cells with the full text as a tooltip; small avatar in front of the user
  function decorateTimeList() {
    document.querySelectorAll('.controller-timelog table.list.time-entries').forEach(function (table) {
      table.querySelectorAll('tbody tr').forEach(function (tr) {
        if (tr.getAttribute('data-gb-done')) return;
        tr.setAttribute('data-gb-done', '1');
        ['td.issue', 'td.comments', 'td.project'].forEach(function (sel) {
          var td = tr.querySelector(sel);
          if (td && !td.title && td.textContent.trim()) td.title = td.textContent.replace(/\s+/g, ' ').trim();
        });
        var user = tr.querySelector('td.user');
        var a = user && user.querySelector('a');
        if (a && !user.querySelector('.avatar, .gb-avatar')) user.insertBefore(makeAvatar(a.textContent.trim(), 20), user.firstChild);
        // narrow lists show the avatar only: the name stays in the link (visually hidden) and its title
        if (a && !a.querySelector('.gb-te-user__name')) {
          var name = a.textContent.trim();
          a.title = name;
          a.textContent = '';
          a.appendChild(el('span', 'gb-te-user__name', name));
        }
        decorateTimeIssueCell(tr.querySelector('td.issue'));
        var comments = tr.querySelector('td.comments');
        if (comments && comments.textContent.trim() && !comments.querySelector('.gb-te-comment')) {
          var c = el('span', 'gb-te-comment');
          while (comments.firstChild) c.appendChild(comments.firstChild);
          comments.appendChild(c);
        }
        // the same comment as a second line under 課題, shown when the コメント column gives way
        var issueTd = tr.querySelector('td.issue');
        var note = comments && comments.textContent.replace(/\s+/g, ' ').trim();
        if (issueTd && note && !issueTd.querySelector('.gb-te-note')) {
          var n = el('span', 'gb-te-note', note);
          n.title = note;
          n.setAttribute('aria-hidden', 'true');
          issueTd.appendChild(n);
        }
        // "2026/11/22" -> the year can be dropped on narrow lists
        var day = tr.querySelector('td.spent_on');
        var dm = day && !day.querySelector('.gb-te-year') && day.textContent.trim().match(/^(\d{4}[\/.\-])(.+)$/);
        if (dm) {
          day.textContent = '';
          day.appendChild(el('span', 'gb-te-year', dm[1]));
          day.appendChild(document.createTextNode(dm[2]));
        }
        // phones: the ユーザー column folds into the date cell (avatar before the date)
        var av = user && user.querySelector('.gb-avatar');
        if (day && av && !day.querySelector('.gb-te-day-avatar')) {
          var copy = av.cloneNode(true);
          copy.classList.add('gb-te-day-avatar');
          if (a) copy.title = a.title || a.textContent.trim();
          day.insertBefore(copy, day.firstChild);
        }
      });
    });
  }

  // 課題 cell: "バグ #1: 件名" -> [バグ] #1 件名 inside one clamp wrapper (2 lines)
  function decorateTimeIssueCell(td) {
    if (!td || td.querySelector('.gb-te-issue')) return;
    var wrap = el('span', 'gb-te-issue');
    var link = td.querySelector('a.issue');
    var m = link && link.textContent.trim().match(/^(.+?) #(\d+)$/);
    if (m) {
      var full = td.textContent.replace(/\s+/g, ' ').trim();
      var proj = td.parentNode && td.parentNode.querySelector('td.project');
      link.textContent = issueKey(m[2], proj ? proj.textContent : '');
      link.setAttribute('aria-label', full);
      wrap.appendChild(trackerBadge(m[1], classNum(link, 'tracker')));
      wrap.appendChild(document.createTextNode(' '));
      var next = link.nextSibling;
      wrap.appendChild(link);
      if (next && next.nodeType === 3) {
        wrap.appendChild(document.createTextNode(' '));
        wrap.appendChild(el('span', 'gb-te-subj', next.nodeValue.replace(/^\s*:\s*/, '')));
        next.parentNode.removeChild(next);
      }
    }
    while (td.firstChild) wrap.appendChild(td.firstChild);
    td.appendChild(wrap);
  }

  // new / edit form: DOM (= tab) order follows the visual grid
  //   課題 → 日付 | 時間 → ユーザー → 作業分類 → コメント
  function decorateTimeForm() {
    var box = document.querySelector('.controller-timelog form.new_time_entry > .box.tabular, .controller-timelog form.edit_time_entry > .box.tabular');
    if (!box) return;
    var pOf = function (id) {
      var f = box.querySelector(':scope > p > #' + id + ', :scope > p > label[for="' + id + '"]');
      return f ? f.parentNode : null;
    };
    var comments = pOf('time_entry_comments');
    var user = pOf('time_entry_user_id');
    var activity = pOf('time_entry_activity_id');
    // idempotent: only moves nodes that are not yet in place
    if (comments && activity && activity.nextElementSibling !== comments) box.insertBefore(activity, comments);
    if (user && activity && user.nextElementSibling !== activity) box.insertBefore(user, activity);
    var t = data().text || {};
    // core drops the "h:mm" hint when the form is re-rendered after a validation error
    var hours = box.querySelector('#time_entry_hours');
    if (hours && !hours.getAttribute('placeholder')) hours.setAttribute('placeholder', 'h:mm');
    var issue = box.querySelector('#time_entry_issue_id');
    if (issue && t.issue_search_placeholder && !issue.getAttribute('placeholder')) {
      issue.setAttribute('placeholder', t.issue_search_placeholder);
    }
    var h2 = document.querySelector('.controller-timelog #content > h2');
    if (h2 && !h2.getAttribute('data-gb-done')) {
      h2.setAttribute('data-gb-done', '1');
      var heading = box.closest('form.edit_time_entry') ? t.edit_time_title : t.log_time_title;
      if (heading) {
        h2.textContent = heading;
        if (document.title.indexOf(heading) !== 0) document.title = heading + ' - ' + document.title;
      }
    }
  }

  // report toolbar: drop the ":" text nodes after "詳細" / "追加" labels
  function decorateTimeReport() {
    var sel = document.querySelector('.controller-timelog.action-report #query_form select#columns');
    var p = sel && sel.parentNode;
    if (!p || p.getAttribute('data-gb-done')) return;
    p.setAttribute('data-gb-done', '1');
    Array.prototype.slice.call(p.childNodes).forEach(function (n) {
      if (n.nodeType === 3 && /^\s*:\s*$/.test(n.nodeValue)) p.removeChild(n);
    });
  }

  // ---------- round 4 ----------
  // roadmap / version sidebar: the tracker checkbox group is headed 「ロードマップ」 (= page name);
  // say what the checkboxes do instead
  function decorateRoadmapSidebar() {
    var t = data().text || {};
    if (!t.roadmap_tracker_heading) return;
    var box = document.querySelector('.controller-versions #sidebar input[type="checkbox"][name="tracker_ids[]"]');
    var form = box && box.form;
    if (!form || form.getAttribute('data-gb-done')) return;
    form.setAttribute('data-gb-done', '1');
    form.classList.add('gb-tracker-filter');
    var h3 = form.querySelector('h3');
    if (h3) h3.textContent = t.roadmap_tracker_heading;
  }

  // time entry form re-rendered with errors: focus the first invalid field (not the optional 課題
  // search) and repeat each message right under its field
  function decorateTimeFormErrors() {
    var form = document.querySelector('.controller-timelog form.new_time_entry, .controller-timelog form.edit_time_entry');
    var summary = document.getElementById('errorExplanation');
    if (!form || !summary || form.getAttribute('data-gb-errors')) return;
    form.setAttribute('data-gb-errors', '1');
    var items = Array.prototype.map.call(summary.querySelectorAll('li'), function (li) {
      return li.textContent.replace(/\s+/g, ' ').trim();
    });
    var first = null;
    // core marks invalid fields with label.error (Redmine's own form builder, no field_with_errors)
    form.querySelectorAll('label.error[for]').forEach(function (label) {
      var field = document.getElementById(label.getAttribute('for'));
      if (!field || field.type === 'hidden' || !form.contains(field)) return;
      if (!first) first = field;
      field.setAttribute('aria-invalid', 'true');
      var name = (GB.form ? GB.form.labelText(label) : label.textContent).replace(/[*＊:：]/g, '').replace(/\s+/g, ' ').trim();
      var msgs = name ? items.filter(function (m) { return m.indexOf(name) === 0; }) : [];
      if (!msgs.length) return;
      var next = field.nextElementSibling;
      if (next && next.classList.contains('gb-field-error')) return;
      var err = el('span', 'gb-field-error', msgs.join(' / '));
      err.id = field.id + '_gb_error';
      field.parentNode.insertBefore(err, field.nextSibling);
      var desc = field.getAttribute('aria-describedby');
      field.setAttribute('aria-describedby', (desc ? desc + ' ' : '') + err.id);
    });
    if (first) {
      document.querySelectorAll('.controller-timelog [autofocus]').forEach(function (n) { n.removeAttribute('autofocus'); });
      first.setAttribute('autofocus', 'autofocus');
      window.setTimeout(function () { first.focus(); }, 0);
    }
  }

  // time report: the 合計 column is sticky on the right; show an edge shadow while columns are
  // hidden behind it, and pin the second criteria column (e.g. 課題) next to the first
  function decorateTimeReportTable() {
    var table = document.querySelector('.controller-timelog #time-report');
    if (!table) return;
    if (!table.getAttribute('data-gb-done')) {
      table.setAttribute('data-gb-done', '1');
      var head = table.querySelectorAll('thead tr:first-child > th:not(.period):not(.total)');
      if (head.length >= 2) table.classList.add('gb-report--c2');
      var scroller = table.closest('.autoscroll');
      if (scroller) {
        scroller.classList.add('gb-report-scroll');
        var update = function () {
          var more = scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 1;
          scroller.classList.toggle('gb-scroll-more', more);
          scroller.classList.toggle('gb-scrolled', scroller.scrollLeft > 0);
        };
        scroller.addEventListener('scroll', update, { passive: true });
        window.addEventListener('resize', update);
        update();
      }
    }
  }

  // gantt: issues without dates have no bar — their "status 0%" label sits at the far left; mute it
  function decorateGantt() {
    document.querySelectorAll('.controller-gantts #gantt_area .task.label').forEach(function (n) {
      if (n.getAttribute('data-gb-done')) return;
      n.setAttribute('data-gb-done', '1');
      var left = parseFloat(n.style.left);
      if (!isNaN(left) && left <= 8) n.classList.add('gb-task-label--nobar');
    });
    // subject column: "バグ #14" -> "バグ DEMO-14" (same key format everywhere)
    document.querySelectorAll('.controller-gantts .gantt_subjects_column .issue-subject a.issue').forEach(function (a) {
      if (a.getAttribute('data-gb-key')) return;
      a.setAttribute('data-gb-key', '1');
      var m = a.textContent.trim().match(/^(.*?)#(\d+)$/);
      if (m) a.textContent = m[1] + issueKey(m[2]);
    });
    // zoom / month navigation: drop the "|" text between 「« 10月」 and 「12月 »」
    document.querySelectorAll('.controller-gantts #query_form_with_buttons > p.contextual, .controller-gantts #query_form_with_buttons > p.contextual > span').forEach(function (p) {
      Array.prototype.slice.call(p.childNodes).forEach(function (n) {
        if (n.nodeType === 3 && /^[\s|\u00a0]*\|[\s|\u00a0]*$/.test(n.nodeValue)) n.nodeValue = ' ';
      });
    });
    // subject column width and key-only links: C-issue-row (15-c-issue-row.js, runs first)
    trimGantt();
  }

  // Core sizes the chart for 6 extra rows + 150px, leaving a blank band under the last row.
  // Every full-height layer is cut by the same amount from its ORIGINAL height (kept in data-gb-h0, so a
  // second run after the stylesheet / fonts settled gives the same result): the column bodies end on the
  // last row, and the outer boxes (chart area, subject / column containers) end right under the drawing
  // layer — keeping only the room a classic (non-overlay) scrollbar takes. The relation canvas follows.
  function trimGantt() {
    var area = document.getElementById('gantt_area');
    var table = area && area.closest('table.gantt-table');
    if (!table) return;
    var rows = table.querySelectorAll('.gantt_subjects_column .issue-subject, .gantt_subjects_column .project-name, .gantt_subjects_column .version-name');
    if (!rows.length) return;
    var top = area.getBoundingClientRect().top;
    var bottom = 0;
    rows.forEach(function (r) { bottom = Math.max(bottom, r.getBoundingClientRect().bottom - top); });
    var nodes = Array.prototype.slice.call(table.querySelectorAll('[style*="height"]'));
    nodes.forEach(function (n) {
      if (!n.hasAttribute('data-gb-h0')) n.setAttribute('data-gb-h0', String(parseFloat(n.style.height) || 0));
    });
    var areaH0 = parseFloat(area.getAttribute('data-gb-h0'));
    if (!areaH0 || !bottom) return;
    var delta = Math.floor(areaH0 - (bottom + 24));
    if (delta < 40) return;
    table.setAttribute('data-gb-trim', '1');
    var outers = [];
    nodes.forEach(function (n) {
      var h0 = parseFloat(n.getAttribute('data-gb-h0'));
      if (!(h0 > delta + 100)) return;
      if (Math.abs(h0 - areaH0) < 0.5) outers.push(n);
      else n.style.height = (h0 - delta) + 'px';
    });
    var contentB = 0;
    Array.prototype.forEach.call(area.children, function (c) {
      contentB = Math.max(contentB, c.offsetTop + c.offsetHeight);
    });
    var scrollbarH = Math.max(0, area.offsetHeight - area.clientHeight);
    var setOuter = function (h) { outers.forEach(function (n) { n.style.height = h + 'px'; }); };
    var outerH = Math.min(areaH0 - delta, Math.max(contentB, bottom) + scrollbarH);
    setOuter(outerH);
    // never trade the band for an inner vertical scroll
    var over = area.scrollHeight - area.clientHeight;
    if (over > 0) setOuter(Math.min(areaH0 - delta, outerH + over));
    var draw = document.getElementById('gantt_draw_area');
    var paper = window.draw_gantt;
    if (draw && paper && typeof paper.setSize === 'function') paper.setSize(draw.offsetWidth, draw.offsetHeight);
  }
  // the dev / theme stylesheet and the web font can land after ready: measure once more when loaded
  window.addEventListener('load', function () {
    if (document.querySelector('.controller-gantts #gantt_area')) trimGantt();
  });

  // time report: core shows 「設定」 as a separate link while the list keeps it in the … menu —
  // use the same … menu here (core's delegated .drdn-trigger handler opens it)
  function decorateTimeReportActions() {
    var ctx = document.querySelector('.controller-timelog.action-report #content > .contextual');
    if (!ctx || ctx.querySelector('.drdn')) return;
    var settings = ctx.querySelector(':scope > a.icon-settings');
    if (!settings) return;
    var label = (data().text && data().text.actions) || '';
    var drdn = el('span', 'drdn');
    var trigger = el('span', 'drdn-trigger');
    var btn = el('span', 'icon-only icon-actions');
    btn.title = label;
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', label);
    var dots = typeof GB.svgIcon === 'function' ? GB.svgIcon(GB.spriteHref(), '3-bullets', 's18 icon-svg') : null;
    if (dots && dots.nodeType === 1) btn.appendChild(dots);
    btn.appendChild(el('span', 'icon-label', label));
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }
    });
    trigger.appendChild(btn);
    var content = el('div', 'drdn-content');
    var items = el('div', 'drdn-items');
    items.appendChild(settings);
    content.appendChild(items);
    drdn.appendChild(trigger);
    drdn.appendChild(content);
    ctx.appendChild(drdn);
    // 追加 select: name the empty first option
    var add = document.querySelector('.controller-timelog.action-report #query_form select#criterias');
    var first = add && add.options[0];
    var text = data().text && data().text.report_add;
    if (first && !first.value && text && !first.textContent.trim()) first.textContent = text;
  }

  // R5: the locale override turns label_version into 「マイルストーン」 for milestones, but core also
  // uses it for plugin versions (/admin/plugins) and wiki page versions (annotate): say バージョン there
  function restoreVersionWording() {
    var t = data().text || {};
    if (!t.version_label || !t.milestone_label || t.version_label === t.milestone_label) return;
    var body = document.body.classList;
    if (body.contains('controller-admin') && body.contains('action-plugins')) {
      document.querySelectorAll('#content table.list thead th').forEach(function (th) {
        if (th.textContent.trim() === t.milestone_label) th.textContent = t.version_label;
      });
    }
    if (body.contains('controller-wiki') && body.contains('action-annotate')) {
      var h2 = document.querySelector('#content > h2');
      var last = h2 && h2.lastChild;
      if (last && last.nodeType === 3 && last.nodeValue.indexOf(t.milestone_label) !== -1) {
        last.nodeValue = last.nodeValue.replace(t.milestone_label, t.version_label);
        document.title = document.title.replace(t.milestone_label, t.version_label);
      }
    }
  }

  // ---------- round 6 ----------
  // activity sidebar: the ユーザー select's empty option reads 「すべてのユーザー」 instead of a blank box
  function decorateActivityUserSelect() {
    var text = data().text && data().text.all_users;
    if (!text || !GB.form) return;
    // C-form helper (js/15-c-form.js); a listed exception: not muted, it means "all"
    document.querySelectorAll('.controller-activities #activity_scope_form select').forEach(function (sel) {
      GB.form.labelBlank(sel, text, false);
    });
  }

  // time report toolbar: each label stays with its select (「詳細 [月]」「追加 [項目を追加]」), so a wrap
  // moves the pair, never the label alone
  function pairReportControls() {
    var p = document.querySelector('.controller-timelog.action-report #query_form select#columns');
    p = p && p.parentNode;
    if (!p || p.getAttribute('data-gb-pairs')) return;
    p.setAttribute('data-gb-pairs', '1');
    p.querySelectorAll(':scope > label[for]').forEach(function (label) {
      var field = p.querySelector(':scope > #' + label.htmlFor);
      if (!field) return;
      var pair = el('span', 'gb-report-pair');
      p.insertBefore(pair, label);
      pair.appendChild(label);
      pair.appendChild(field);
    });
  }

  // ---------- round 8 ----------
  // time report: 「バグ #1: 件名」 -> [バグ] DEMO-1 件名 (the same key as the list tab and every other page)
  function decorateReportIssues() {
    document.querySelectorAll('.controller-timelog #time-report td.name > a.issue').forEach(function (link) {
      if (link.getAttribute('data-gb-key')) return;
      var m = link.textContent.trim().match(/^(.+?) #(\d+)$/);
      if (!m) return;
      link.setAttribute('data-gb-key', '1');
      var td = link.parentNode;
      var next = link.nextSibling;
      var subject = next && next.nodeType === 3 ? next.nodeValue.replace(/^\s*:\s*/, '') : '';
      link.setAttribute('title', m[1] + ' ' + issueKey(m[2]) + (subject ? ': ' + subject : ''));
      link.textContent = issueKey(m[2]);
      var wrap = el('span', 'gb-report-issue');
      td.insertBefore(wrap, link);
      wrap.appendChild(trackerBadge(m[1], classNum(link, 'tracker')));
      wrap.appendChild(document.createTextNode(' '));
      wrap.appendChild(link);
      if (next && next.nodeType === 3) {
        wrap.appendChild(document.createTextNode(' '));
        wrap.appendChild(el('span', 'gb-report-subj', subject));
        td.removeChild(next);
      }
    });
  }

  // roadmap / version related issues: every key gets the width of the longest one in its table, so the
  // subjects start on one line too (DEMO-1 / DEMO-12). Measured after the web font has loaded.
  function alignRelatedKeys() {
    document.querySelectorAll('.controller-versions table.related-issues').forEach(function (table) {
      var keys = table.querySelectorAll('a.gb-rel__key');
      if (!keys.length) return;
      table.style.removeProperty('--gb-rel-key-w');
      var max = 0;
      keys.forEach(function (k) { max = Math.max(max, k.getBoundingClientRect().width); });
      if (max) table.style.setProperty('--gb-rel-key-w', Math.ceil(max) + 'px');
    });
  }

  // calendar / gantt period: year first, then month, in Japanese order —
  //   calendar 「[2026年] [11月]」 (the 年 / 月 labels stay for screen readers only),
  //   gantt    「[2026年] [11月] から [6] ヶ月分」
  // Nodes are moved (not restyled with order) so the tab order follows what is seen.
  function orderPeriodControls() {
    var month = document.querySelector('.controller-calendars #query_form select#month, .controller-gantts #query_form select#month');
    var year = month && month.parentNode.querySelector(':scope > select#year');
    var p = month && month.parentNode;
    if (!year || p.getAttribute('data-gb-period')) return;
    p.setAttribute('data-gb-period', '1');
    var t = data().text || {};
    if (t.year_option) {
      Array.prototype.forEach.call(year.options, function (o) {
        if (/^\d{4}$/.test(o.textContent.trim())) o.textContent = t.year_option.replace('%{year}', o.textContent.trim());
      });
    }
    var monthLabel = p.querySelector(':scope > label[for="month"]');
    var yearLabel = p.querySelector(':scope > label[for="year"]');
    var months = p.querySelector(':scope > input#months');
    if (monthLabel && yearLabel) {
      // calendar
      monthLabel.classList.add('gb-period-label');
      yearLabel.classList.add('gb-period-label');
      p.insertBefore(yearLabel, monthLabel);
      p.insertBefore(year, monthLabel);
    } else if (months) {
      // gantt: wrap 「ヶ月分」 so it can follow the months field
      var unit = months.nextSibling;
      while (unit && unit.nodeType === 3 && !unit.nodeValue.trim()) unit = unit.nextSibling;
      var unitSpan = null;
      if (unit && unit.nodeType === 3) {
        unitSpan = el('span', 'gb-period-text', unit.nodeValue.trim());
        p.replaceChild(unitSpan, unit);
      }
      // two unbreakable groups, 「[2026年] [11月] から」 and 「[6] ヶ月分」: a narrow row wraps between
      // them, never before a lone 「ヶ月分」
      var start = el('span', 'gb-period-group');
      var span = el('span', 'gb-period-group');
      p.insertBefore(start, months);
      p.insertBefore(span, months);
      start.appendChild(year);
      start.appendChild(month);
      if (t.period_from) start.appendChild(el('span', 'gb-period-text', t.period_from));
      span.appendChild(months);
      if (unitSpan) span.appendChild(unitSpan);
    }
  }

  // ---------- round 9 ----------
  // time report column headings: 「2026-11-19」 -> 「11/19(木)」, 「2026-11」 -> 「2026年11月」, 「2026」 -> 「2026年」
  // (the site writes dates as 2026/11/19; the full date stays in the title)
  function formatReportPeriods() {
    var table = document.querySelector('.controller-timelog #time-report');
    if (!table || table.getAttribute('data-gb-periods')) return;
    table.setAttribute('data-gb-periods', '1');
    var colSel = document.querySelector('.controller-timelog #query_form select#columns');
    var unit = colSel ? colSel.value : '';
    var lang = document.documentElement.lang || 'ja';
    var wd, ym, yo;
    try {
      wd = new Intl.DateTimeFormat(lang, { weekday: 'short' });
      ym = new Intl.DateTimeFormat(lang, { year: 'numeric', month: 'long' });
      yo = new Intl.DateTimeFormat(lang, { year: 'numeric' });
    } catch (e) {
      return;
    }
    table.querySelectorAll('thead th.period').forEach(function (th) {
      var t = th.textContent.trim();
      var m;
      if ((m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/))) {
        var d = new Date(+m[1], +m[2] - 1, +m[3]);
        th.title = m[1] + '/' + m[2] + '/' + m[3];
        th.textContent = (+m[2]) + '/' + (+m[3]);
        th.appendChild(el('span', 'gb-report-wd', '(' + wd.format(d) + ')'));
      } else if (unit === 'month' && (m = t.match(/^(\d{4})-(\d{1,2})$/))) {
        th.textContent = ym.format(new Date(+m[1], +m[2] - 1, 1));
      } else if (unit === 'year' && (m = t.match(/^(\d{4})$/))) {
        th.textContent = yo.format(new Date(+m[1], 0, 1));
      }
    });
  }

  // time report with two criteria (ユーザー → 課題): phones hide the first column and show its value
  // as the group heading in the second one, so the issue column and the pinned 合計 always fit
  function groupReportRows() {
    var table = document.querySelector('.controller-timelog #time-report');
    if (!table || table.getAttribute('data-gb-grp')) return;
    var heads = table.querySelectorAll('thead tr:first-child > th:not(.period):not(.total)');
    if (heads.length !== 2) return;
    table.setAttribute('data-gb-grp', '1');
    table.classList.add('gb-report--grp');
    var h2 = heads[1];
    var hp = el('span', 'gb-report-grp', heads[0].textContent.trim() + ' / ');
    h2.insertBefore(hp, h2.firstChild);
    table.querySelectorAll('tbody tr.subtotal, tbody tr.total, tfoot tr.total').forEach(function (tr) {
      var c1 = tr.children[0];
      var c2 = tr.children[1];
      if (!c1 || !c2 || c2.textContent.trim()) return;
      var span = el('span', 'gb-report-grp');
      Array.prototype.forEach.call(c1.childNodes, function (n) { span.appendChild(n.cloneNode(true)); });
      c2.appendChild(span);
      c2.classList.add('gb-report-grp-cell');
    });
  }

  GB.ready(function () {
    formatReportPeriods();
    decorateActivityUserSelect();
    orderPeriodControls();
    decorateReportIssues();
    restoreVersionWording();
    decorateTimeReportActions();
    decorateRoadmapSidebar();
    decorateTimeFormErrors();
    decorateTimeReportTable();
    decorateGantt();
    decorateTimeForm();
    decorateTimeList();
    decorateRoadmapFilterNote(document);
    decorateVersionHours(document);
    decorateTimeReport();
    pairReportControls();
    decorateActivityFilter();
    decorateRelatedIssues(document);
    alignRelatedKeys();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(alignRelatedKeys);
    decorateVersionOverview(document);
    decorateCalendar();
    decorateTimeTotals();
    decorateVersionForm();
    groupReportRows();
  });
  GB.onAjax(function () {
    decorateGantt();
    decorateTimeForm();
    decorateTimeList();
    decorateRelatedIssues(document);
    alignRelatedKeys();
    decorateVersionOverview(document);
    decorateTimeTotals();
    decorateReportIssues();
  });
})();
