/* ============ 4. wiki: 読む ============ */
(() => {
  const el = $('#wiki'),
    wrap = $('.sheetwrap', el),
    sheet = $('.sheet', el),
    h = $('.wiki__h', el),
    sub = $('.wiki__s', el);
  let s, x, y0, travel, stack, end, SHh;
  scene('#wiki', {
    layout() {
      reset(wrap, sheet);
      const W = phone ? 390 : 860;
      sheet.style.width = W + 'px';
      SHh = sheet.offsetHeight;
      s = phone ? (vw - 20) / W : Math.min(1.22, (vw * 0.6) / W);
      x = phone ? 10 : Math.max(24, vw * 0.41 - (W * s) / 2);
      y0 = vh * 0.13;
      stack = phone || tall;
      if (stack) {
        s = phone ? s : Math.min(1.1, (vw - 72) / W);
        x = (vw - W * s) / 2;
        sub.style.top = h.offsetTop + h.offsetHeight + 8 + 'px';
        y0 = sub.offsetTop + sub.offsetHeight + (phone ? 34 : 44);
      } else {
        const lim = h.offsetLeft - Math.max(28, vw * 0.034);
        s = Math.min(1.22, tablet ? 1 : (vw * 0.6) / W, (lim - 28) / W);
        x = Math.max(20, (lim - W * s) / 2 + 6);
        y0 = Math.max(96, vh * 0.13);
      }
      travel = Math.max(0, SHh * s - (vh - y0) + (phone ? 72 : 56));
      if (!stack) travel = Math.max(travel, y0 - 84);
      if (stack && SHh * s <= vh - 84 - 14) travel = Math.max(travel, y0 - 84 - (tall ? (vh - 84 - SHh * s) * 0.3 : 0));
      end = y0 - travel;
    },
    leave() {
      X.readY = 0.45;
    },
    update(p, intro, outro) {
      const go = stack ? E.io(seg(p, 0.24, 1)) : E.io(p),
        cover = stack ? 1 - seg(p, 0.25, 0.36) : 1;
      const i = E.out5(seg(intro, 0.25, 1)),
        o = E.in2(outro);
      tf(
        wrap,
        `translate3d(${x.toFixed(1)}px,${(y0 - travel * go + (1 - i) * vh * 0.7 + o * vh * 0.25).toFixed(1)}px,0) scale(${s.toFixed(4)})`
      );
      tf(sheet, `rotateX(${((1 - i) * 38 - o * 46).toFixed(2)}deg)`);
      op(sheet, Math.min(seg(intro, 0.3, 0.6), 1 - seg(outro, 0.05, 0.43)));
      op(h, Math.min(seg(intro, 0.5, 1), 1 - outro * 3, cover));
      tf(h, `translate3d(0,${((1 - E.out(seg(intro, 0.5, 1))) * 30).toFixed(1)}px,0)`);
      op(sub, Math.min(seg(intro, 0.8, 1), 1 - outro * 3, cover));
      if (tablet && x < 150) X.low = seg(intro, 0.6, 1) * (1 - outro) * seg(SHh * s + y0 - travel * go, vh - 60, vh - 20);
      if (end < 90) X.haze = seg(go, 0.2, 0.5);
      X.readY = lerp(lerp(phone ? 0.42 : 0.3, phone ? 0.74 : 0.7, E.io(p)), 0.76, o); // the reading light walks down the page, then sinks to the horizon
    }
  });
})();
