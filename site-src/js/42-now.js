/* ============ 3. now: いま ============ */
(() => {
  const el = $('#now'),
    flood = $('.flood', el),
    bands = $('.bands', el),
    bs = $$('.band', el),
    nums = $$('.band__n', el),
    labs = $$('.band__l', el),
    deep = $$('.band__d', el),
    h = $('.now__h', el),
    after = $('.now__after', el),
    hw = $('.homewrap', el),
    home = $('.home', el),
    cards = [$('.h-st', el), $('.h-ms', el), $('.h-act', el)],
    sbar = $('.sbar', el),
    pb = $$('.pbar i', el);
  let s, x, y, T, HW, cover;
  scene('#now', {
    layout() {
      reset(hw, home, bands);
      HW = phone ? 390 : tall ? 760 : 1040;
      const HH = home.offsetHeight;
      s = Math.min(
        1.14,
        (vw - (phone ? 24 : tall ? 56 : 80)) / HW,
        (vh - (phone ? (vh < 700 ? 224 : 300) : clamp(vh * 0.31, 170, 270))) / HH
      );
      x = (vw - HW * s) / 2;
      y = phone ? (vh < 700 ? 96 : 170) : 86 + Math.max(0, (vh - (vh < 640 ? 180 : 250) - HH * s) / 2);
      const hr = home.getBoundingClientRect(),
        sr = sbar.getBoundingClientRect();
      T = { x: x + (sr.left - hr.left) * s, y: y + (sr.top - hr.top) * s, w: sr.width * s, h: sr.height * s };
      nums.forEach(n => (n.style.transformOrigin = '0 100%'));
    },
    update(p, intro, outro) {
      /* the status pill of the last scene floods the frame, then the other statuses rise through it */
      const P = SH.pill || [vw * 0.6, vh * 0.2],
        fo = p < 0.2;
      flood.style.visibility = fo ? 'inherit' : 'hidden';
      cover = (Math.hypot(Math.max(P[0], vw - P[0]), Math.max(P[1], vh - P[1])) * 2.02) / 100;
      const wide = lerp(0.22, cover, E.in2(seg(intro, 0, 0.9)));
      if (fo) tf(flood, `translate3d(${P[0].toFixed(1)}px,${P[1].toFixed(1)}px,0) scale(${(wide / 6).toFixed(4)})`);
      const q = p + (intro - 0.92) * 0.17; // the other statuses start to rise just before the flood has settled
      op(bands, intro > 0.915 ? 1 - seg(p, 0.565, 0.585) : 0);
      bs.forEach((b, i) => {
        const g = i === 1 ? 1 : E.out5(seg(q, i * 0.012, 0.085 + i * 0.012));
        tf(b, `scale(1,${g.toFixed(4)})`);
        const cnt = E.out(seg(p, 0.01 + i * 0.02, 0.16 + i * 0.02)),
          n = Math.round(cnt * +nums[i].dataset.n);
        once(nums[i], 'n', n, v => (nums[i].textContent = v));
        const f = Math.min(seg(cnt, 0.35, 0.75), 1 - seg(p, 0.385, 0.42));
        op(deep[i], Math.min(seg(p, 0, 0.06), 1 - E.io(seg(p, 0.365, 0.46))));
        op(nums[i], f);
        op(labs[i], f);
        tf(nums[i], `scale(1,${(1 / Math.max(g, 0.25)).toFixed(3)})`);
      });
      op(h, Math.min(seg(p, 0.01, 0.06), 1 - seg(p, 0.35, 0.4)));
      tf(
        h,
        `translate3d(0,${((1 - E.out5(seg(p, 0.01, 0.1))) * 40 - seg(p, 0.06, 0.36) * 7 - E.in2(seg(p, 0.35, 0.4)) * 50).toFixed(1)}px,0)`
      );
      const m = E.io(seg(p, 0.365, 0.56));
      X.band = wide * 50 > Math.hypot(P[0] - 90, P[1] - 30) && p < 0.4; // white header as soon as the colour has reached the brand
      X.covered = intro > 0.92 && p < 0.365;
      tf(
        bands,
        `translate3d(${lerp(0, T.x, m).toFixed(1)}px,${lerp(0, T.y, m).toFixed(1)}px,0) scale(${lerp(1, T.w / vw, m).toFixed(4)},${lerp(1, T.h / vh, m).toFixed(4)})`
      );
      op(sbar, p > 0.565 ? 1 : 0);
      const lay = E.in2(outro),
        cr = E.io(seg(p, 0.6, 0.95));
      tf(hw, `translate3d(${x.toFixed(1)}px,${(y + lay * vh * 0.5).toFixed(1)}px,0) scale(${(s * lerp(1, 1.05, cr)).toFixed(4)})`);
      tf(
        home,
        `translate3d(${(-HW * 0.025 * cr).toFixed(1)}px,0,0) rotateX(${(lay * 58).toFixed(2)}deg) rotateY(${lerp(7, 0, cr).toFixed(2)}deg)`
      );
      cards.forEach((c, i) => {
        const a = seg(p, 0.43 + [0, 0.045, 0.05][i], 0.56 + [0, 0.045, 0.05][i]);
        op(c, a * (1 - outro * 3.3));
        tf(c, `translate3d(0,${((1 - E.out5(a)) * 50).toFixed(1)}px,0)`);
      });
      pb.forEach(b => tf(b, `scaleX(${+b.style.getPropertyValue('--w') * E.out5(seg(p, 0.66, 0.8))})`));
      const a = seg(p, 0.78, 0.86);
      op(after, a * (1 - outro * 4));
      tf(after, `translate3d(0,${((1 - E.out(a)) * 24).toFixed(1)}px,0)`);
    }
  });
})();
