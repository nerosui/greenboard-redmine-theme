// 15-c-timeline: one timeline item for every activity list (owner: c-timeline, DESIGN §6.5)
// The plugin partial (greenboard/_timeline.html.erb) prints .gb-timeline for the dashboard and the project home.
// Core's activity lists (/activity, /projects/:id/activity, /users/:id) print <h3> + <dl><dt><dd>; this file
// rewrites them into the same DOM and class names, so 15-c-timeline.css is the only stylesheet for all of them:
//   div.gb-timeline__day (今日 / 昨日 / YYYY/MM/DD)
//   ul.gb-timeline__list > li.gb-timeline__item
//     avatar · div.gb-timeline__body (meta, title, change, desc) · time.gb-timeline__time (HH:MM)
// Server data: #gb-data (statuses, trackers, projects, wording) and #gb-timeline-data (plugin hook: the day of each
// heading and, per journal id, the old and new status, which core's markup does not carry).
(function () {
  var GB = window.GB;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function readJSON(id) {
    var node = document.getElementById(id);
    if (!node) return null;
    try { return JSON.parse(node.textContent); } catch (e) { return null; }
  }
  function pageData() {
    var d = typeof GB.pageData === 'function' ? GB.pageData() : readJSON('gb-data');
    return d || {};
  }
  function find(list, key, value) {
    list = list || [];
    for (var i = 0; i < list.length; i++) if (String(list[i][key]) === String(value)) return list[i];
    return null;
  }
  function squish(s) { return String(s || '').replace(/\s+/g, ' ').trim(); }

  // project identifier for an issue key: the project name in the row (cross-project lists) or the page's project
  function projectIdent(projectName) {
    var name = squish(projectName);
    if (name) {
      var p = find(pageData().projects, 'name', name);
      if (p) return p.identifier;
    }
    var m = String(document.body.className).match(/(?:^|\s)project-([^\s]+)/);
    return m ? m[1] : '';
  }

  // 「バグ #8 (未対応): 件名」; time entries: 「1.00 時間 (バグ #8 (未対応): 件名)」
  var ISSUE_TITLE = /^(.+?) #(\d+)(?: \(([^)]+)\))?: ([\s\S]*)$/;
  var TIME_TITLE = /^(\S+(?: \S+)?) \(([\s\S]+)\)$/;
  // excerpts are plain text cut from Markdown / Textile: drop list / heading / quote markers and emphasis
  var MARKUP_LEAD = /^\s*(?:[*\-+#>]+|\d+\.|h\d\.|bq\.)\s+/;

  function plainExcerpt(desc) {
    if (!desc) return '';
    var lines = [''];
    Array.prototype.forEach.call(desc.childNodes, function (n) {
      if (n.nodeType === 1 && n.tagName === 'BR') { lines.push(''); return; }
      lines[lines.length - 1] += n.textContent;
    });
    return squish(lines.map(function (l) {
      return l.replace(MARKUP_LEAD, '').replace(/\*\*|__|~~|`/g, '');
    }).join(' '));
  }

  function dayHeading(h3, iso, tl, text) {
    var label = squish(h3.textContent);
    if (iso && tl) {
      if (iso === tl.today) label = text.today || label;
      else if (iso === tl.yesterday) label = text.yesterday || label;
      else label = iso.replace(/-/g, '/');
    }
    var day = el('div', 'gb-timeline__day', label);
    day.setAttribute('role', 'heading');
    day.setAttribute('aria-level', '3');
    return day;
  }

  function avatarFor(name, typeIcon) {
    if (name) return GB.avatar(name, 28);
    var a = el('span', 'gb-avatar gb-avatar--28 gb-avatar--type');
    a.setAttribute('aria-hidden', 'true');
    if (typeIcon) a.appendChild(typeIcon.cloneNode(true));
    return a;
  }

  function projectChip(projectNode) {
    var name = squish(projectNode.textContent);
    var chip = el('span', 'gb-timeline__project');
    var ident = projectIdent(name);
    var found = find(pageData().projects, 'name', name);
    if (found && ident) {
      var a = el('a', null, name);
      a.href = '/projects/' + encodeURIComponent(ident);
      chip.appendChild(a);
    } else {
      chip.appendChild(el('span', null, name));
    }
    return chip;
  }

  function statusChange(link, tl, d) {
    var m = link && (link.getAttribute('href') || '').match(/#change-(\d+)$/);
    var change = m && tl && tl.status ? tl.status[m[1]] : null;
    if (!change || change[1] == null) return null;
    var to = find(d.statuses, 'id', change[1]);
    if (!to) return null;
    var box = el('div', 'gb-timeline__change');
    var from = change[0] != null ? find(d.statuses, 'id', change[0]) : null;
    if (from) box.appendChild(GB.statusPill(from.name, from.id));
    var arrow = el('span', 'gb-timeline__arrow', '→');
    arrow.setAttribute('aria-hidden', 'true');
    box.appendChild(arrow);
    box.appendChild(GB.statusPill(to.name, to.id));
    return box;
  }

  // title line: [tracker] KEY subject (+ hours chip for time entries); other events: the plain linked title
  function titleLine(link, projectName, d) {
    var title = el('div', 'gb-timeline__title');
    if (!link) return title;
    var text = squish(link.textContent);
    var hours = null;
    var tm = text.match(TIME_TITLE);
    if (tm && ISSUE_TITLE.test(tm[2])) { hours = tm[1]; text = tm[2]; }
    var m = text.match(ISSUE_TITLE);
    var tracker = m && find(d.trackers, 'name', m[1]);
    link.className = 'gb-timeline__link';
    if (!tracker) {
      link.textContent = text;
      link.title = text;
      title.appendChild(link);
      return title;
    }
    title.appendChild(GB.trackerBadge(tracker.name, tracker.id));
    var wrap = el('span', 'gb-timeline__text');
    link.textContent = '';
    link.title = m[4];
    link.appendChild(el('span', 'gb-timeline__key', GB.issueKey(projectIdent(projectName), m[2])));
    link.appendChild(document.createTextNode(' '));
    link.appendChild(el('span', 'gb-timeline__subject', m[4]));
    wrap.appendChild(link);
    if (hours) {
      wrap.appendChild(document.createTextNode(' '));
      wrap.appendChild(el('span', 'gb-timeline__hours', hours));
    }
    title.appendChild(wrap);
    return title;
  }

  function buildItem(dt, dd, iso, tl, d) {
    var type = String(dt.className).trim().split(/\s+/)[0];
    var li = el('li', 'gb-timeline__item gb-ev-' + type);
    var authorLink = dd && dd.querySelector('.author a');
    var authorName = authorLink ? squish(authorLink.textContent) : '';
    var project = dt.querySelector(':scope > .project');
    var projectName = project ? project.textContent : '';
    var link = dt.querySelector(':scope > a');
    var time = dt.querySelector(':scope > .time');

    li.appendChild(avatarFor(authorName, dt.querySelector(':scope > svg')));

    var body = el('div', 'gb-timeline__body');
    var meta = el('div', 'gb-timeline__meta');
    if (authorLink) {
      var who = el('strong', 'gb-timeline__who');
      who.appendChild(authorLink);
      meta.appendChild(who);
      meta.appendChild(el('span', 'gb-timeline__action', (d.actions && d.actions[type]) || (d.text && d.text.other) || ''));
    } else {
      meta.appendChild(el('span', 'gb-timeline__action', (d.noauthor && d.noauthor[type]) || ''));
    }
    if (project && squish(projectName)) meta.appendChild(projectChip(project));
    body.appendChild(meta);
    body.appendChild(titleLine(link, projectName, d));
    var change = statusChange(link, tl, d);
    if (change) body.appendChild(change);
    var excerpt = plainExcerpt(dd && dd.querySelector('.description'));
    if (excerpt) body.appendChild(el('p', 'gb-timeline__desc', excerpt));
    li.appendChild(body);

    var clock = time ? squish(time.textContent) : '';
    var t = el('time', 'gb-timeline__time', clock);
    if (iso && /^\d{1,2}:\d{2}$/.test(clock)) {
      var hhmm = clock.length === 4 ? '0' + clock : clock;
      t.textContent = hhmm;
      t.setAttribute('datetime', iso + 'T' + hhmm);
      t.title = iso.replace(/-/g, '/') + ' ' + hhmm;
    }
    li.appendChild(t);
    return li;
  }

  // Core lists a day's rows grouped by issue (ActivitiesHelper#sort_activity_events), so times jump back and
  // forth. The dashboard / project home list a day strictly newest first (ACCEPTANCE L3), so sort the rows the
  // same way: by the event time from #gb-timeline-data (ms, core's row order) when it matches the rows, else by
  // the shown 「HH:MM」. Ties keep core's order (stable sort).
  function newestFirst(items, times) {
    var exact = Array.isArray(times) && times.length === items.length;
    var keyed = items.map(function (li, i) {
      var t = li.querySelector('.gb-timeline__time');
      var clock = t ? String(t.getAttribute('datetime') || t.textContent).match(/(\d{1,2}):(\d{2})\s*$/) : null;
      var key = exact ? Number(times[i]) : (clock ? Number(clock[1]) * 60 + Number(clock[2]) : -1);
      return { li: li, i: i, key: isFinite(key) ? key : -1 };
    });
    keyed.sort(function (a, b) { return (b.key - a.key) || (a.i - b.i); });
    return keyed.map(function (k) { return k.li; });
  }

  function decorate() {
    var root = document.getElementById('activity');
    if (!root || root.getAttribute('data-gb-tl') || !root.querySelector(':scope > dl')) return;
    root.setAttribute('data-gb-tl', '1');
    root.classList.add('gb-timeline');
    var d = pageData();
    var tl = readJSON('gb-timeline-data');
    var days = (tl && tl.days) || [];
    var times = (tl && tl.times) || [];
    var dayIndex = 0;
    Array.prototype.slice.call(root.children).forEach(function (node) {
      if (node.tagName === 'H3') {
        var iso = days[dayIndex++] || '';
        root.replaceChild(dayHeading(node, iso, tl, d.text || {}), node);
        return;
      }
      if (node.tagName !== 'DL') return;
      var prev = node.previousElementSibling;
      var dated = prev && prev.classList.contains('gb-timeline__day');
      var iso2 = dated ? days[dayIndex - 1] || '' : '';
      var ul = el('ul', 'gb-timeline__list');
      var items = Array.prototype.slice.call(node.querySelectorAll(':scope > dt')).map(function (dt) {
        var dd = dt.nextElementSibling && dt.nextElementSibling.tagName === 'DD' ? dt.nextElementSibling : null;
        return buildItem(dt, dd, iso2, tl, d);
      });
      newestFirst(items, dated ? times[dayIndex - 1] : null).forEach(function (li) { ul.appendChild(li); });
      root.replaceChild(ul, node);
    });
  }

  GB.timeline = { decorate: decorate };
  GB.ready(decorate);
  GB.onAjax(decorate);
})();
