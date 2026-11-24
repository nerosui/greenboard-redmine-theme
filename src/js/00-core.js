// 00-core: shared helpers for all Greenboard modules.
// Public API (add only, never change signatures):
//   GB.ready(fn), GB.onAjax(fn), GB.spriteHref(), GB.svgIcon(sprite, id, cls), GB.statusIdOf(el), GB.initial(name)
//   GB.avatarIndex(name), GB.avatar(name, size) -> <span class="gb-avatar ...">, GB.avatarHTML(name, size) -> string
//   GB.avatarFor(user|name, size) -> same avatar rule from a { name } object, GB.stripFieldLabel(text)
//   GB.projectAvatar(name, size) -> <span class="gb-proj-avatar ...">
//   GB.trackerIdOf(el), GB.statusPill(text, id), GB.trackerBadge(text, id), GB.icon(id, cls)
//   GB.currentUser() -> {id, login, name, known}, GB.onCurrentUser(fn), GB.issueKey(projectIdentifier, id)
//   (known === true when the display name came from the cache; otherwise name is the login until fetched)
(function () {
  var GB = window.GB = window.GB || {};
  var readyFns = [], ajaxFns = [], isReady = false;

  GB.ready = function (fn) { if (isReady) fn(); else readyFns.push(fn); };
  GB.onAjax = function (fn) { ajaxFns.push(fn); };

  GB.spriteHref = function () {
    var use = document.querySelector('#icon-copy-source use') || document.querySelector('svg.icon-svg use');
    var href = use && (use.getAttribute('href') || use.getAttribute('xlink:href'));
    return href ? href.split('#')[0] : null;
  };

  GB.svgIcon = function (sprite, id, cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', cls);
    svg.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(ns, 'use');
    use.setAttribute('href', sprite + '#icon--' + id);
    svg.appendChild(use);
    return svg;
  };

  // Sprite icon with the sprite resolved automatically (null when the sprite is unknown).
  GB.icon = function (id, cls) {
    var sprite = GB.spriteHref();
    return sprite ? GB.svgIcon(sprite, id, cls || 'icon-svg') : null;
  };

  // Theme-drawn house icon (the sprite has no home shape): an inline SVG that sits like a sprite icon.
  GB.homeIcon = function (cls) {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('class', (cls || 'icon-svg') + ' gb-icon-home');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M3.5 11.2 12 4l8.5 7.2M6 9.6V20h4.4v-5.6h3.2V20H18V9.6');
    svg.appendChild(path);
    return svg;
  };

  GB.statusIdOf = function (el) {
    var m = el && el.className && String(el.className).match(/(?:^|\s)status-(\d+)(?:\s|$)/);
    return m ? m[1] : null;
  };

  GB.trackerIdOf = function (el) {
    var m = el && el.className && String(el.className).match(/(?:^|\s)tracker-(\d+)(?:\s|$)/);
    return m ? m[1] : null;
  };

  GB.initial = function (name) { return (Array.from(String(name || '').trim())[0] || '?').toUpperCase(); };

  // Deterministic avatar colour: sum of UTF-16 code units of the full display name, mod 8.
  GB.avatarIndex = function (name) {
    var s = String(name || '').trim();
    if (!s) return -1;
    var sum = 0;
    for (var i = 0; i < s.length; i++) sum += s.charCodeAt(i);
    return sum % 8;
  };

  function normSize(size) {
    var n = parseInt(size, 10);
    return [20, 28, 36, 64].indexOf(n) >= 0 ? n : 28;
  }

  // Round initial avatar (§2.9). aria-hidden: the visible name is the accessible label.
  GB.avatar = function (name, size) {
    var span = document.createElement('span');
    var idx = GB.avatarIndex(name);
    span.className = 'gb-avatar gb-avatar--' + normSize(size);
    span.setAttribute('data-av', String(idx));
    span.setAttribute('aria-hidden', 'true');
    span.textContent = idx < 0 ? '?' : GB.initial(name);
    return span;
  };

  GB.avatarHTML = function (name, size) { return GB.avatar(name, size).outerHTML; };

  // 「担当者: 花子 鈴木」 -> 「花子 鈴木」 (core prefixes some avatar labels with the field name)
  GB.stripFieldLabel = function (text) {
    return String(text || '').replace(/^[^:：]{1,12}[:：]\s*/, '').trim();
  };

  // One avatar rule everywhere: initial = first character of the display name, colour = hash of the
  // display name (same as GB.avatar and the decorated core avatars). user: { name } or a name string.
  GB.avatarFor = function (user, size) {
    var name = typeof user === 'string' ? user : (user && (user.name || user.login)) || '';
    return GB.avatar(GB.stripFieldLabel(name), size);
  };

  // Rounded-square project avatar with the same deterministic palette.
  GB.projectAvatar = function (name, size) {
    var span = document.createElement('span');
    var n = parseInt(size, 10);
    span.className = 'gb-proj-avatar' + (n === 36 || n === 48 ? ' gb-proj-avatar--' + n : '');
    span.setAttribute('data-av', String(Math.max(0, GB.avatarIndex(name))));
    span.setAttribute('aria-hidden', 'true');
    span.textContent = GB.initial(name);
    return span;
  };

  GB.statusPill = function (text, id) {
    var span = document.createElement('span');
    span.className = 'gb-status' + (id ? ' gb-status-' + id : '');
    span.textContent = text;
    return span;
  };

  // Issue key shared by every page: GB.issueKey('demo', 21) -> "DEMO-21"; no project -> "#21".
  GB.issueKey = function (projectIdentifier, id) {
    var ident = String(projectIdentifier || '').trim();
    return ident ? ident.toUpperCase() + '-' + id : '#' + id;
  };

  GB.trackerBadge = function (text, id) {
    var span = document.createElement('span');
    span.className = 'gb-tracker' + (id ? ' gb-tracker-' + id : '');
    span.textContent = text;
    return span;
  };

  // ---- current user (display name is cached; login is always available) ----
  var meFns = [];
  var ME_KEY = 'greenboard.me2.';
  function readMe() {
    var a = document.querySelector('#loggedas a.user, #loggedas a');
    if (!a) return null;
    var m = (a.getAttribute('href') || '').match(/\/users\/(\d+)/);
    var me = { id: m ? m[1] : null, login: a.textContent.trim(), name: a.textContent.trim(), url: a.getAttribute('href'), known: false };
    try {
      var cached = me.id && localStorage.getItem(ME_KEY + me.id);
      if (cached) { me.name = cached; me.known = true; }
    } catch (e) { /* storage unavailable */ }
    return me;
  }
  GB.currentUser = function () { return readMe(); };
  GB.onCurrentUser = function (fn) { meFns.push(fn); };

  function refreshMe() {
    var me = readMe();
    if (!me || !me.id || !window.fetch) return;
    var stamp;
    try { stamp = Number(sessionStorage.getItem(ME_KEY + 'checked.' + me.id) || 0); } catch (e) { stamp = 0; }
    if (stamp && Date.now() - stamp < 30 * 60 * 1000) return;
    fetch('/users/' + me.id, { credentials: 'same-origin', headers: { Accept: 'text/html' } })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html) return;
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var h2 = doc.querySelector('#content > h2');
        if (!h2) return;
        h2.querySelectorAll('.avatar, img, svg').forEach(function (n) { n.remove(); });
        var name = h2.textContent.replace(/\s+/g, ' ').trim();
        if (!name) return;
        try {
          localStorage.setItem(ME_KEY + me.id, name);
          sessionStorage.setItem(ME_KEY + 'checked.' + me.id, String(Date.now()));
        } catch (e) { /* ignore */ }
        if (name !== me.name || !me.known) {
          me.name = name;
          me.known = true;
          meFns.forEach(function (fn) { try { fn(me); } catch (err) { console.error('[greenboard]', err); } });
        }
      })
      .catch(function () { /* offline or blocked: keep the login */ });
  }

  function runReady() {
    if (isReady) return;
    isReady = true;
    readyFns.forEach(function (fn) { try { fn(); } catch (e) { console.error('[greenboard]', e); } });
    if (window.jQuery) {
      jQuery(document).ajaxComplete(function () {
        ajaxFns.forEach(function (fn) { try { fn(document); } catch (e) { console.error('[greenboard]', e); } });
      });
    }
    // rails-ujs remote forms/links (data-remote) do not go through jQuery.ajax
    document.addEventListener('ajax:complete', function () {
      setTimeout(function () {
        ajaxFns.forEach(function (fn) { try { fn(document); } catch (e) { console.error('[greenboard]', e); } });
      }, 0);
    });
    ajaxFns.forEach(function (fn) { try { fn(document); } catch (e) { console.error('[greenboard]', e); } });
    refreshMe();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', runReady);
  else runReady();
})();
