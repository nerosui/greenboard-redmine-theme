/* ============ 4. wiki: 書いて、読まれる ============
   One sheet, written in 「並べて表示」 (source | live preview), saved with ⌘+Enter, then read. On narrow and upright
   screens the theme hides the split view, so there the same story plays with the 編集 / プレビュー tabs.
   While editing, the editor is a window of the screen's height: both panes are clipped to it and scrolled to the
   line being worked on; once saved, the clip opens and the preview is the whole page. */
(() => {
  const el = $('#wiki'),
    wrap = $('.sheetwrap', el),
    wk = $('.wk', el),
    bg = $('.wk__bg', el),
    bar = $('.wk__bar', el),
    body = $('.wk__body', el),
    src = $('.wk__src', el),
    sheet = $('.sheet', el),
    st = $('.wk__st', el),
    ok = $('.wk__ok', el),
    foot = $('.wk__foot', el),
    meta = $('.wk__meta', el),
    tools = $('.wk__tools', el),
    hl = $('.wk__hl', el),
    mk = $('.mk i', el),
    h = $('.wiki__h', el),
    sub = $('.wiki__s', el),
    after = $('.wiki__after', el);
  const lines = $$('.tln', src),
    tys = $$('.ty', src),
    xs = $$('.x', src),
    ins = $$('.ins', src),
    carets = $$('.caret', src),
    pv = $$('.pv', sheet),
    cbs = $$('.tasks .cb', sheet).slice(0, 2),
    go = $('.wk__go', el),
    keys = $$('kbd', foot);
  const TYPE = ['c0', 'c1', 'c2', 'c7'];
  let two, stack, sr, SHh, SRH, vis, srcOff, shOff, sA, aX, aY, sB, bX, bY, travel;

  /* the moments of the edit. Split view: the panes scroll back to the top before the emphasis is added.
     Tabs: the preview opens at the top (emphasis), then scrolls down to the ticked tasks. */
  const at = k => 0.03 + k * 0.022;
  const T2 = { chk: [0.14, 0.165], tick: [0.155, 0.18], back: [0.19, 0.22], ins: [0.21, 0.235], mark: [0.25, 0.29], save: 0.3 };
  const T1 = {
    chk: [0.14, 0.155],
    ins: [0.17, 0.185],
    tab: 0.2,
    mark: [0.215, 0.25],
    down: [0.25, 0.28],
    tick: [0.275, 0.29],
    save: 0.3
  };

  const clip = (e, top, bottom) =>
    once(
      e,
      'clip',
      `${top.toFixed(1)},${bottom.toFixed(1)}`,
      () => (e.style.clipPath = `inset(${top.toFixed(1)}px 0 ${bottom.toFixed(1)}px 0)`)
    );

  scene('#wiki', {
    layout() {
      reset(wrap, wk, src, sheet);
      [src, sheet].forEach(e => (e.style.clipPath = memo(e).clip = ''));
      body.style.height = src.style.minHeight = '';
      stack = phone || tall;
      two = !stack && vw >= 1024;
      wk.classList.toggle('one', !two);
      const W = two ? 600 : phone ? 390 : stack ? Math.min(860, Math.max(640, vw - 72)) : 640;
      wk.style.width = two ? '' : W + 'px';
      const WK = wk.offsetWidth,
        chrome = bar.offsetHeight + foot.offsetHeight,
        pad = two ? 20 : 0;
      let top, winH;
      if (stack) {
        sA = sB = phone ? (vw - 20) / W : Math.min(1.1, (vw - 72) / W);
        sub.style.top = h.offsetTop + h.offsetHeight + 8 + 'px';
        top = sub.offsetTop + sub.offsetHeight + (phone ? 30 : 40);
        winH = vh - top - (phone ? 40 : 96);
      } else {
        sub.style.top = h.offsetTop + h.offsetHeight + 22 + 'px';
        const lim = Math.min(h.offsetLeft, sub.offsetLeft) - Math.max(28, vw * 0.034);
        sA = Math.min(1.1, (lim - 56) / WK);
        top = 96;
        winH = vh - 96 - 96;
        aX = Math.max(20, (lim - WK * sA) / 2 + 6);
        sB = Math.min(1.22, tablet ? 1 : (vw * 0.6) / W, (lim - 28) / W);
        bX = Math.max(20, (lim - W * sB) / 2 + 6);
        bY = Math.max(96, vh * 0.13);
      }
      const bodyH = Math.max(240, winH / sA - chrome);
      body.style.height = bodyH + 'px';
      vis = bodyH - pad * 2;
      src.style.minHeight = vis + 'px';
      sr = rect(sheet, wk.getBoundingClientRect());
      SHh = sheet.offsetHeight;
      SRH = src.offsetHeight;
      /* scroll each pane so that the line being written sits in the lower part of the window */
      srcOff = clamp(lines[3].offsetTop + 30 - vis * 0.72, 0, Math.max(0, SRH - vis));
      shOff = clamp(pv[3].offsetTop + pv[3].offsetHeight + 24 - vis * 0.86, 0, Math.max(0, SHh - vis));
      if (stack) {
        aX = (vw - WK * sA) / 2 + sr.x * sA;
        aY = bY = top + sr.y * sA;
        bX = aX;
        /* the page keeps the scroll it had in the preview; the reading then goes on to its foot */
        const t0 = aY - shOff * sA;
        travel = Math.max(0, t0 + SHh * sA - vh + 72);
        if (SHh * sA <= vh - 98) travel = Math.max(travel, t0 - 84);
      } else {
        aX += sr.x * sA;
        aY = top + sr.y * sA;
        travel = Math.max(0, SHh * sB - (vh - bY) + 56, bY - 84, bY + SHh * sB - vh * 0.62);
      }
    },
    leave() {
      X.readY = 0.45;
    },
    update(p, intro, outro) {
      const T = two ? T2 : T1,
        i = E.out5(seg(intro, 0.25, 1)),
        o = E.in2(outro);

      /* camera: the position of the preview sheet on screen, and its scale */
      const cam = stack ? 0 : E.io(seg(p, 0.33, 0.5)),
        rel = two ? cam : seg(p, 0.31, 0.38),
        read = E.io(stack ? seg(p, 0.3, 1) : seg(p, 0.5, 1)),
        s = lerp(sA, sB, cam),
        px = lerp(aX, bX, cam),
        py = lerp(aY, bY, cam) - travel * read;
      tf(
        wrap,
        `translate3d(${(px - sr.x * s).toFixed(1)}px,${(py - sr.y * s + (1 - i) * vh * 0.7 + o * vh * 0.25).toFixed(1)}px,0) scale(${s.toFixed(4)})`
      );
      tf(wk, `rotateX(${((1 - i) * 38 - o * 46).toFixed(2)}deg)`);
      op(wk, Math.min(seg(intro, 0.3, 0.6), 1 - seg(outro, 0.05, 0.43)));

      /* typing: the new section and its three tasks */
      lines.forEach((l, k) => {
        op(l, seg(p, at(k) - 0.002, at(k)));
        typed(tys[k], seg(p, at(k), at(k) + 0.02));
      });
      xs.forEach((x, k) => once(x, 'v', p >= T.chk[k], v => (x.style.visibility = v ? '' : 'hidden')));
      ins.forEach((x, k) => once(x, 'v', p >= T.ins[k], v => (x.style.visibility = v ? '' : 'hidden')));
      let c = '';
      lines.forEach((l, k) => {
        if (p >= at(k) - 0.002 && p < at(k) + 0.026) c = TYPE[k];
      });
      if (p >= T.chk[0] - 0.015 && p < T.chk[0] + 0.01) c = 'c3';
      else if (p >= T.chk[1] - 0.012 && p < T.chk[1] + 0.01) c = 'c4';
      else if (p >= T.ins[0] - 0.012 && p < T.ins[0] + 0.008) c = 'c5';
      else if (p >= T.ins[1] - 0.01 && p < T.ins[1] + 0.012) c = 'c6';
      once(src, 'c', c, v => carets.forEach(e => (e.style.display = v && e.classList.contains(v) ? '' : 'none')));

      /* the window onto both panes */
      let so,
        ho,
        sx = 0,
        hx = 0;
      if (two) {
        const back = 1 - E.io(seg(p, T.back[0], T.back[1]));
        so = srcOff * back;
        ho = shOff * back;
      } else {
        const sw = E.out(seg(p, T.tab + 0.004, T.tab + 0.022));
        so = srcOff;
        ho = shOff * E.io(seg(p, T.down[0], T.down[1]));
        cls(bar, 'pvw', p >= T.tab);
        op(src, 1 - sw);
        op(sheet, sw);
        sx = -10 * sw;
        hx = 10 * (1 - sw);
      }
      const shut = 1 - rel;
      clip(src, so, Math.max(0, SRH - so - vis));
      clip(sheet, ho * shut, Math.max(0, SHh - ho - vis) * shut);
      if (two) {
        const gone = seg(p, 0.33, 0.42);
        op(src, 1 - gone);
        sx = -40 * E.in2(gone);
      }
      tf(src, `translate3d(${sx.toFixed(1)}px,${(-so).toFixed(1)}px,0)`);
      tf(sheet, `translate3d(${hx.toFixed(1)}px,${(-ho).toFixed(1)}px,0)`);

      /* preview: follows a beat behind, as the theme's live preview does */
      let busy = false;
      if (two) {
        pv.forEach((e, k) => {
          const d = at(k) + 0.035,
            a = seg(p, d, d + 0.012);
          op(e, a);
          tf(e, `translate3d(0,${((1 - E.out(a)) * 6).toFixed(1)}px,0)`);
          if (p > at(k) + 0.004 && p < d + 0.006) busy = true;
        });
        T.ins.forEach(t => (busy = busy || (p > t && p < t + 0.018)));
      }
      op(st, busy ? 1 : 0);
      cbs.forEach((b, k) => cls(b, 'on', p >= T.tick[k]));
      tf(mk, `scaleX(${E.out(seg(p, T.mark[0], T.mark[1])).toFixed(3)})`);

      /* ⌘+Enter, then 「更新しました。」 */
      cls(keys[0], 'down', p > T.save && p < T.save + 0.03);
      cls(keys[1], 'down', p > T.save + 0.01 && p < T.save + 0.03);
      cls(go, 'down', p > T.save + 0.015 && p < T.save + 0.035);
      op(ok, Math.min(seg(p, T.save + 0.035, T.save + 0.05), 1 - (two ? seg(p, 0.44, 0.46) : seg(p, 0.37, 0.39))));

      /* the editor falls away; the preview stays as the page */
      const gone = two ? seg(p, 0.36, 0.44) : seg(p, 0.35, 0.4);
      [bg, bar, foot].forEach(e => op(e, 1 - gone));
      once(sheet, 'sh', (two ? seg(p, 0.38, 0.5) : gone).toFixed(2), v => sheet.style.setProperty('--sh', v));
      op(meta, two ? seg(p, 0.46, 0.5) : seg(p, 0.36, 0.4));
      const t = two ? Math.min(seg(p, 0.6, 0.64), 1 - seg(p, 0.76, 0.8)) : 0;
      op(tools, t);
      op(hl, t);

      /* words */
      const out = stack ? seg(p, 0.3, 0.4) : seg(p, 0.48, 0.52);
      op(h, Math.min(seg(intro, 0.5, 1), 1 - out, 1 - outro * 3));
      tf(h, `translate3d(0,${((1 - E.out(seg(intro, 0.5, 1))) * 30).toFixed(1)}px,0)`);
      op(sub, Math.min(seg(intro, 0.8, 1), 1 - out, 1 - outro * 3));
      const a = stack ? (tall ? seg(p, 0.72, 0.8) : seg(p, 0.84, 0.92)) : seg(p, 0.54, 0.6);
      op(after, Math.min(a, 1 - outro * 3));
      tf(after, `translate3d(0,${((1 - E.out(a)) * 24).toFixed(1)}px,0)`);

      /* light: what passes behind the header dissolves only once the top of the page has left the screen */
      const pageTop = py - (stack ? ho * s : 0);
      X.haze = seg(60 - pageTop, 0, 100);
      if (tablet && bX < 150) X.low = seg(intro, 0.6, 1) * (1 - outro) * seg(pageTop + SHh * s, vh - 60, vh - 20);
      if (stack && a > 0) X.low = Math.max(X.low, a * (1 - outro));
      const r0 = phone ? 0.42 : 0.3;
      X.readY = lerp(p < 0.5 && !stack ? 0.34 : lerp(r0, phone ? 0.74 : 0.7, read), 0.76, o);
    }
  });
})();
