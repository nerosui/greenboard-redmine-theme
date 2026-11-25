/* ============ 2. desk: 書く、返す ============ */
(() => {
  const mat = $('.desk__mat'),
    el = $('#desk'),
    fw = $('.formwrap', el),
    form = $('.form', el),
    born = $('.born', el),
    sub = $('.desk__s', el),
    h2 = $('.desk__h2', el),
    s2 = $('.desk__s2', el);
  const t1 = $('.typed', el),
    t2 = $('.typed2', el),
    trk = $('.trk', el),
    trkV = $('.trk__v', el),
    who = $('.who', el),
    due = $('.due', el),
    go = $('.go', el),
    inp = $('.inp', el),
    caret = $('.caret', inp);
  const tw = $('.threadwrap', el),
    th = $('.thread', el),
    comp = $('.composer', el),
    panel = $('.panel', el),
    cta = $('.cta', el),
    t3 = $('.typed3', el),
    stsel = $('.stsel', el),
    send = $('.send', el),
    cmA = $('.cm--a', el),
    cmNew = $('.cm--new', el),
    stswap = $('.stswap', el);
  let matX,
    matW,
    matY0,
    matY1,
    mid,
    pushK,
    pushX,
    stack,
    FW,
    FH,
    ir,
    SM,
    mx,
    my,
    SF,
    wx,
    wy,
    TW,
    ts,
    tx0,
    ty0,
    PH,
    pill,
    THH,
    TH0,
    hA,
    hN,
    lift;
  const h1 = $('.desk__h', el);
  const pop = (e, on) =>
    once(e, 's', on, v => {
      e.style.visibility = v ? 'inherit' : 'hidden';
      if (v && !stopped)
        e.animate(
          [
            { opacity: 0, transform: 'translateY(22px)' },
            { opacity: 1, transform: 'none' }
          ],
          { duration: SNAP ? 1 : 700, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both' }
        );
    });
  const flash = (e, on) =>
    once(e, 'f', on, v => {
      if (v) {
        e.classList.remove('flash');
        void e.offsetWidth;
        e.classList.add('flash');
      }
    });
  scene('#desk', {
    /* the form is filled in quickly: 0.35 screens are cut out of this stretch of the track */
    cut: { len: 8.15, by: 0.35, from: 0.31, to: 0.455 },
    layout() {
      reset(fw, form, tw, th);
      FW = phone ? 390 : 720;
      FH = form.offsetHeight;
      stack = phone || tall;
      /* the mat leaves clear ground for the headline: beside it, or below it on narrow and tall screens */
      const gap = Math.max(28, vw * 0.034),
        hl = h2.offsetLeft;
      matX = phone ? -10 : stack ? 24 : Math.max(20, vw * 0.036);
      matW = phone ? vw + 20 : stack ? vw - 48 : hl - gap - matX;
      mid = matX + matW / 2;
      s2.style.left = phone || stack ? '' : Math.min(hl, vw - 18 - s2.offsetWidth) + 'px';
      mat.style.left = matX + 'px';
      mat.style.width = matW + 'px';
      ir = rect(inp, form.getBoundingClientRect());
      SM = phone ? ((vw - 20) / FW) * 1.06 : Math.min(4.2, (vw * 0.05) / 16);
      mx = phone ? (vw - FW * SM) / 2 : vw * 0.07 - ir.x * SM;
      my = vh * 0.46 - (ir.y + ir.h / 2) * SM;
      if (phone) my = Math.max(my, sub.offsetTop + sub.offsetHeight + 14, 230);
      if (phone) {
        SF = (vw - 20) / FW;
        wx = 10;
        wy = 84;
      } else {
        SF = Math.min(1.3, (vh - 104) / FH, (matW - 56) / FW);
        wx = mid - (FW * SF) / 2;
        /* keep the foot of the form clear of the clock */
        if (wx < 172) wx = Math.min(172, matX + matW - 24 - FW * SF);
        if (wx < 166 && !stack) {
          SF = Math.min(SF, (vh - 142) / FH);
          wx = mid - (FW * SF) / 2;
        }
        wy = Math.max(70, (vh - FH * SF) / 2 + (wx < 166 ? -8 : 12));
      }
      sub.style.top = vh * 0.46 - (ir.h * SM) / 2 - 86 + 'px';
      TW = phone ? 390 : 760;
      th.style.width = tw.style.width = TW + 'px';
      /* the thread is laid out once, complete; comments and composer then only slide, so nothing reflows */
      memo(cmA).s = memo(cmNew).s = undefined;
      th.style.height = '';
      memo(th).h = null;
      reset(comp);
      hA = cmA.offsetHeight;
      hN = cmNew.offsetHeight;
      TH0 = th.offsetHeight - hA - hN - 44;
      PH = panel.offsetHeight;
      THH = TH0 + hA + PH;
      if (phone) {
        ty0 = s2.offsetTop + s2.offsetHeight + 46;
        ts = Math.min((vw - 20) / TW, Math.max(0.82, (vh - ty0 - 16) / THH));
        tx0 = (vw - TW * ts) / 2;
      } else if (stack) {
        ty0 = s2.offsetTop + s2.offsetHeight + 76;
        ts = Math.min(1.15, (vh - ty0 - 90) / THH, (matW - 64) / TW);
        tx0 = mid - (TW * ts) / 2;
      } else {
        ts = Math.min(1.25, (vh - 170) / THH, (matW - 64) / TW);
        tx0 = mid - (TW * ts) / 2;
        ty0 = Math.max(92, (vh - THH * ts) / 2 + 16);
      }
      /* on short phones the sheet rises over the words while the composer is open */
      lift = phone ? Math.max(0, ty0 + THH * ts - vh + 16) : 0;
      const room = stack ? vw - 40 : hl - gap * 0.8 - 20;
      pushK = phone ? 0 : clamp(room / (TW * ts) - 1, 0, 0.26);
      pushX = 20 + room / 2;
      matY0 = phone ? 92 : Math.max(58, vh * 0.07);
      matY1 = stack ? ty0 - (phone ? 24 : 40) : matY0;
      mat.style.height = (phone ? vh - matY1 - 44 : vh - matY0 * 1.6) + 'px';
      pill = rect(stswap, th.getBoundingClientRect());
    },
    update(p, intro, outro) {
      /* form: opens out of the 「新しい課題」 button into a macro shot of the title field */
      const b0 = SH.btn || [vw * 0.8, vh * 0.2],
        oi = E.io(intro),
        pb = E.io(seg(p, 0.205, 0.31)),
        gone = seg(p, 0.48, 0.53);
      const s = lerp(lerp(0.03, SM, oi), SF, pb) * (1 - gone * 0.12);
      const panY = phone ? -Math.max(0, FH * SF - (vh - wy) + 24) * E.io(seg(p, 0.34, 0.44)) : 0;
      const x = lerp(lerp(b0[0], mx, oi), wx, pb),
        y = lerp(lerp(b0[1], my, oi), wy + panY, pb);
      tf(fw, `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(4)})`);
      const tilt = Math.sin(pb * Math.PI);
      tf(form, `rotateX(${(tilt * 7).toFixed(2)}deg) rotateY(${(tilt * -9 + (1 - oi) * 20).toFixed(2)}deg)`);
      op(fw, Math.min(seg(intro, 0.02, 0.2), 1 - gone));
      const n = typed(t1, seg(p, 0.07, 0.19));
      cls(inp, 'has', n > 0);
      caret.style.display = p > 0.2 ? 'none' : '';
      const said = 1 - seg(p, 0.17, 0.205);
      op(sub, Math.min(seg(intro, 0.75, 1), said));
      if (phone) op(h1, Math.min(seg(intro, 0.6, 0.95), said));
      const tr2 = p > 0.325;
      once(trk, 'b', tr2, v => {
        trk.dataset.t = v ? 2 : 1;
        trkV.textContent = v ? '機能' : 'バグ';
      });
      flash(trk, tr2);
      typed(t2, seg(p, 0.335, 0.415));
      cls(who, 'empty', p < 0.425);
      flash(who, p >= 0.425);
      cls(due, 'empty', p < 0.44);
      flash(due, p >= 0.44);
      cls(go, 'down', p > 0.455 && p < 0.478);
      /* the sheet condenses into one card; the card rises and becomes the head of the conversation */
      const bi = E.out5(seg(p, 0.48, 0.56)),
        fly = E.io(seg(p, 0.56, 0.63));
      const b0x = wx + ir.x * SF,
        b0y = wy + panY + ir.y * SF,
        bs0 = (ir.w * SF) / 340,
        bs1 = phone ? 0.98 : 1.35;
      const mxp = vw / 2 - 170 * bs1,
        myp = vh * 0.44 - 52 * bs1,
        tgx = tx0 + 20 * ts,
        tgy = ty0 + 8 * ts;
      const bx = lerp(lerp(b0x, mxp, bi), tgx, fly),
        by = lerp(lerp(b0y, myp, bi), tgy, fly) - Math.sin(fly * Math.PI) * 40,
        bs = lerp(lerp(bs0, bs1, bi), ts * 0.9, fly);
      op(born, Math.min(seg(p, 0.48, 0.5), 1 - seg(p, 0.625, 0.65)));
      tf(
        born,
        `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0) rotate(${(Math.sin(bi * Math.PI) * -4 + Math.sin(fly * Math.PI) * 5).toFixed(2)}deg) scale(${bs.toFixed(4)})`
      );
      /* thread */
      const ti = E.out5(seg(p, 0.635, 0.715)),
        zo = E.in2(outro),
        open = E.io(seg(p, 0.73, 0.79)) - E.io(seg(p, 0.945, 0.985)),
        push = phone ? 0 : E.io(seg(p, 0.75, 0.81)) - E.io(seg(p, 0.935, 0.975)),
        tsc = ts * (1 + push * pushK) * (1 + zo * 1.6),
        px0 = tx0 + (pill.x + pill.w / 2) * ts,
        py0 = ty0 + (pill.y + pill.h / 2) * ts;
      SH.pill = [px0, py0];
      const ax = outro > 0 ? pill.x + pill.w / 2 : TW / 2,
        ay = outro > 0 ? pill.y + pill.h / 2 : THH - PH * 0.55,
        sx0 = lerp(tx0 + ax * ts, pushX, push),
        sy0 = lerp(ty0 + ay * ts, stack ? ty0 + ay * ts : vh * 0.56, push);
      tf(
        tw,
        `translate3d(${(sx0 - ax * tsc).toFixed(1)}px,${(sy0 - ay * tsc + (1 - ti) * 70 - lift * open).toFixed(1)}px,0) scale(${tsc.toFixed(4)})`
      );
      op(mat, Math.min(E.io(seg(p, 0.2, 0.3)), 1 - outro * 1.5));
      tf(mat, `translate3d(0,${(lerp(matY0, matY1, fly) - lift * open).toFixed(1)}px,0) rotate(${phone ? -0.5 : -0.8}deg)`);
      if (tablet) X.low = seg(intro, 0.5, 0.9) * (1 - seg(pb, 0.3, 0.8));
      X.haze = phone
        ? seg(p, 0.31, 0.37) * (1 - seg(p, 0.48, 0.53))
        : Math.max(seg(intro, 0.35, 0.8) * (1 - seg(pb, 0.6, 0.95)), seg(push, 0.05, 0.5));
      op(tw, seg(p, 0.64, 0.68));
      const words = Math.min(1 - outro * 2, lift > 20 ? 1 - open * 1.6 : 1);
      op(h2, Math.min(seg(p, 0.64, 0.7), words));
      tf(h2, `translate3d(0,${((1 - E.out(seg(p, 0.64, 0.72))) * 30).toFixed(1)}px,0)`);
      op(s2, Math.min(seg(p, 0.67, 0.73), words));
      pop(cmA, p > 0.69);
      const rowA = E.out(seg(p, 0.682, 0.7)) * hA,
        rowN = E.out(seg(p, 0.945, 0.965)) * hN;
      tf(comp, `translate3d(0,${(rowA + rowN - hA - hN).toFixed(1)}px,0)`);
      once(th, 'h', Math.round(TH0 + rowA + rowN + lerp(44, PH, open)), v => (th.style.height = v + 'px'));
      op(panel, seg(open, 0.15, 0.6));
      op(cta, 1 - seg(open, 0, 0.4));
      tf(panel, `scale(${lerp(0.96, 1, open)})`);
      typed(t3, seg(p, 0.8, 0.885));
      cls(stsel, 'b', p > 0.9);
      cls(stsel, 'flash', p > 0.9 && p < 0.93);
      cls(send, 'down', p > 0.925 && p < 0.946);
      pop(cmNew, p > 0.95);
      cls(stswap, 'b', p > 0.965);
    }
  });
})();
