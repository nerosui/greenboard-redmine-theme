/* ============ 5. train: 帰りの電車 ============ */
(() => {
  const el = $('#train'),
    glass = $('.glass', el),
    pw = $('.phonewrap', el),
    ph = $('.phone', el),
    cols = $('.mcols', el),
    touch = $('.touch', el),
    glare = $('.glare', el),
    ta = $('.train__a', el),
    tb = $('.train__b', el),
    sub = $('.train__s', el);
  let s,
    x,
    y,
    boxes = [];
  const union = bs => [
    Math.min(...bs.map(b => b[0])),
    Math.min(...bs.map(b => b[1])),
    Math.max(...bs.map(b => b[2])),
    Math.max(...bs.map(b => b[3]))
  ];
  const box = e => [e.offsetLeft / vw, e.offsetTop / vh, (e.offsetLeft + e.offsetWidth) / vw, (e.offsetTop + e.offsetHeight) / vh];
  scene('#train', {
    layout() {
      reset(pw, ph, glass);
      if (phone) {
        s = Math.min(1.2, (vh - 250) / 560);
        x = (vw - 300 * s) / 2;
        y = 270;
      } else {
        s = Math.min(1.6, (vh + 70) / 610, tablet ? (vw * 0.56) / 300 : 9);
        x = vw * 0.5 - 150 * s;
        y = vh * 0.1;
      }
      boxes = [[ta, tb].map(box), [box(sub)]];
    },
    leave() {
      X.shift = 0;
    },
    update(p, intro, outro) {
      const i = E.out5(intro),
        o = E.in2(outro),
        a = E.io(seg(p, 0.14, 0.34)),
        b = E.io(seg(p, 0.5, 0.7));
      op(glass, seg(intro, 0.1, 0.7) * (1 - o));
      tf(glass, `scale(${(lerp(1.25, 1, i) + o * 0.8).toFixed(4)})`);
      tf(pw, `translate3d(${x.toFixed(1)}px,${(y + (1 - i) * vh * 0.9 + o * vh * 0.9).toFixed(1)}px,0) scale(${s.toFixed(4)})`);
      tf(
        ph,
        `rotateY(${lerp(phone ? 10 : 16, phone ? -6 : -12, E.io(p)).toFixed(2)}deg) rotateX(${lerp(9, 2, p).toFixed(2)}deg) rotateZ(${lerp(-2.5, 1.5, p).toFixed(2)}deg)`
      );
      tf(cols, `translate3d(${(-(a + b) * 340).toFixed(1)}px,0,0)`);
      X.shift = (a + b) * 1.6 + p * 0.8; // the swipe carries the whole city with it
      glare.style.translate = `${lerp(-70, 70, (p * 1.7 + (a + b) * 0.45) % 1).toFixed(1)}% 0`;
      const g = p < 0.44 ? seg(p, 0.14, 0.34) : seg(p, 0.5, 0.7),
        on = g > 0 && g < 1;
      op(touch, on ? Math.min(seg(g, 0, 0.15), 1 - seg(g, 0.8, 1)) * 0.9 : 0);
      tf(touch, `translate3d(${lerp(235, 60, E.io(g)).toFixed(1)}px,${(330 - Math.sin(g * Math.PI) * 14).toFixed(1)}px,0)`);
      const ti = E.out(seg(p, 0.03, 0.14)),
        f = Math.min(seg(p, 0.035, 0.1), 1 - outro * 2);
      op(ta, f);
      tf(ta, `translate3d(${((1 - ti) * -40).toFixed(1)}px,0,0)`);
      op(tb, Math.min(seg(p, 0.07, 0.135), 1 - outro * 2));
      tf(tb, `translate3d(${((1 - E.out(seg(p, 0.065, 0.17))) * 40).toFixed(1)}px,0,0)`);
      op(sub, Math.min(seg(p, 0.14, 0.2), 1 - outro * 2));
      X.boxes = phone ? [union(boxes[0]), boxes[1][0]] : [...boxes[0], boxes[1][0]];
      X.boxK = f;
    }
  });
})();
