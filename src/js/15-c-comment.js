// 15-c-comment: the collapsed comment entry row (owner: c-comment, DESIGN §6.10, ACCEPTANCE K1).
// One builder for /issues/:id, /news/:id and /boards/:id/topics/:id; styled only by css/15-c-comment.css.
//   GB.commentCta(label, onOpen, userName?) -> div.gb-comment-cta
//     children: the current user's 28px GB.avatar + <button type="button" class="gb-comment-cta__btn">label</button>
//     onOpen(event) runs on click / Enter / Space (native button activation).
//     userName is optional; without it the avatar follows GB.currentUser() and updates once the display
//     name is known (GB.onCurrentUser).
// The page owns the expanded panel, where the row is inserted, and toggling `row.hidden` while the panel
// is open; it should return focus with GB.commentCta.focus(row) on close.
(function () {
  var GB = window.GB;

  function meName() {
    var me = typeof GB.currentUser === 'function' ? GB.currentUser() : null;
    return me ? me.name : '';
  }

  function commentCta(label, onOpen, userName) {
    var row = document.createElement('div');
    row.className = 'gb-comment-cta';
    var avatar = GB.avatar(userName || meName(), 28);
    row.appendChild(avatar);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'gb-comment-cta__btn';
    btn.textContent = label;
    btn.addEventListener('click', function (e) {
      if (typeof onOpen === 'function') onOpen(e);
    });
    row.appendChild(btn);

    if (!userName && typeof GB.onCurrentUser === 'function') {
      GB.onCurrentUser(function (me) {
        if (!me || !me.name || !row.contains(avatar)) return;
        var next = GB.avatar(me.name, 28);
        row.replaceChild(next, avatar);
        avatar = next;
      });
    }
    return row;
  }

  commentCta.focus = function (row) {
    var btn = row && row.querySelector('.gb-comment-cta__btn');
    if (btn) btn.focus({ preventScroll: true });
  };

  GB.commentCta = commentCta;
})();
