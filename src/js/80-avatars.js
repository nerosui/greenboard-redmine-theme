// 80-avatars: Redmine 6.1 renders square two-letter initials avatars
// (<span role="img" class="avatar avatar-color-N sNN">プ確</span>). Turn every one of them into the
// single-initial round avatar of DESIGN §2.9, coloured by the user's display name like GB.avatar.
// The core element is kept (other features look it up via `.avatar:not(.gb-avatar)`); only its text and
// a data-av attribute change. Idempotent and re-run after AJAX.
(function () {
  var GB = window.GB;

  // Returns { name, visible }: visible = the name is printed next to the avatar.
  function nameFor(av) {
    var t = av.getAttribute('aria-label') || av.getAttribute('title') || av.getAttribute('alt');
    // core labels some avatars with the field name: 「担当者: 花子 鈴木」 -> 「花子 鈴木」
    if (t) return { name: GB.stripFieldLabel(t), visible: false };
    // the user link that follows the avatar (most core views)
    var sib = av.nextElementSibling;
    for (var i = 0; sib && i < 3; i++, sib = sib.nextElementSibling) {
      if (sib.matches('a.user')) return { name: sib.textContent, visible: true };
      var inner = sib.querySelector && sib.querySelector('a.user');
      if (inner) return { name: inner.textContent, visible: true };
    }
    var p = av.parentElement;
    for (var d = 0; p && d < 2; d++, p = p.parentElement) {
      var u = p.querySelector('a.user');
      if (u) return { name: u.textContent, visible: true };
    }
    // profile heading: <h2><span class="avatar">プ確</span> プレビュー 確認用</h2>
    var parent = av.parentElement;
    if (parent && /^H[1-4]$/.test(parent.tagName)) {
      var txt = parent.textContent.replace(av.textContent, '').trim();
      if (txt) return { name: txt, visible: true };
    }
    return { name: '', visible: false };
  }

  function decorate(root) {
    (root || document).querySelectorAll('span[role="img"].avatar:not(.gb-avatar):not([data-gb-init])').forEach(function (av) {
      av.setAttribute('data-gb-init', av.textContent.trim());
      var found = nameFor(av);
      var name = found.name.replace(/\s+/g, ' ').trim();
      if (name) {
        av.setAttribute('data-av', String(GB.avatarIndex(name)));
        av.textContent = GB.initial(name);
      } else {
        av.textContent = GB.initial(av.textContent);
      }
      if (name && found.visible) {
        // the user's name is printed next to the avatar: hide the decorative initial from AT
        av.setAttribute('aria-hidden', 'true');
      } else if (name) {
        // no visible name: keep role=img and give it the plain user name as its label
        av.setAttribute('aria-label', name);
      }
    });
  }

  GB.decorateAvatars = decorate;
  GB.onAjax(function (root) { decorate(root); });
})();
