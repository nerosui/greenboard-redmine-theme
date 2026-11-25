/* ============ 1. open: 夜 → 朝、一覧がボードになる ============ */
(() => {
  const el = $('#open'),
    night = $('.night', el),
    lens = $('.lens', el),
    lensIn = $('.lens__in', el),
    walls = $$('.wall', el),
    hero = $('.hero', el),
    hint = $('.hint', el),
    bloom = $('.bloom', el),
    lineA = $('.line-a', el);
  const ww = $('.winwrap', el),
    win = $('.win', el),
    pan = $('.pan', el),
    wash = $('.cap__wash', el),
    vList = $('.v-list', el),
    vBoard = $('.v-board', el),
    cursor = $('.cursor', el),
    capB = $('.cap--b', el),
    capC = $('.cap--c', el);
  const acts = $$('.act', el).map(a => ({ el: a, id: a.dataset.id, fr: $('.fr', a), fc: $('.fc', a) }));
  const colsEl = $('.cols', vBoard),
    actorsEl = $('.actors', el),
    nvI = $('.nv[data-n="課題"]', el),
    nvB = $('.nv[data-n="ボード"]', el),
    col3 = $('.col-3', el),
    cnt2 = $('.col-2 .cnt', el),
    cnt3 = $('.col-3 .cnt', el),
    newbtn = $('.newbtn', el);
  const veil = makeGL(
    $('.veil', el),
    `uniform vec2 uS;uniform vec4 uLead,uHint;uniform float uRad,uPh,uWords;float near(vec2 p,vec4 b){vec2 d=max(b.xy-p,p-b.zw);float f=1.-clamp(length(max(d,0.))/uR.y/.3,0.,1.);return f*f*f*(f*(f*6.-15.)+10.);}
void main(){vec2 p=vec2(gl_FragCoord.x,uR.y-gl_FragCoord.y);float d=distance(p,uS);float o=max(d-uRad,0.);float halo=exp(-o/(uRad*.55+90.));float wide=exp(-o/(uRad*.8+150.));
vec2 q=(p-uS)/uR.y;float rays=.5+.5*n(vec2(atan(q.y,q.x)*5.+uT*.05,length(q)*1.5-uT*.04));
float dark=mix(.985,.90,smoothstep(.12,.95,p.x/uR.x)*(1.-uPh));dark=mix(dark,.95,uPh*.6);dark*=1.-mix(.46,.26,uPh)*wide*(.7+.3*rays);
dark=min(.985,dark+.055*uWords*max(near(p,uLead),near(p,uHint)));
vec3 glow=vec3(.42,.86,.66)*wide*.16*(.6+.4*rays)+vec3(1.,.93,.74)*halo*halo*.5;float a=clamp(dark+halo*.25,0.,1.);vec3 c=vec3(.043,.078,.07)*dark+glow;c+=(h(p+fract(uT))-.5)*.03;gl_FragColor=vec4(min(c,vec3(a)),a);}`,
    ['uS', 'uRad', 'uPh', 'uLead', 'uHint', 'uWords'],
    () => R.classList.toggle('gl', veil.live)
  );
  if (veil) R.classList.add('gl');
  const nChars = $$('.line-a .ch', el).length;
  let R0,
    bx,
    by,
    cover,
    S0,
    S1,
    f0,
    f1,
    c0,
    WW,
    WH,
    PO,
    colStep,
    shiftDy,
    drop,
    c14,
    btn,
    vdpr = 1,
    sx = 0,
    sy2 = 0,
    a14;
  const S = scene('#open', {
    layout() {
      const hb = hero.offsetTop + hero.offsetHeight; // on phones the disc stays below the words
      R0 = phone ? clamp((vh - hb) * 0.56, 84, 128) : tall ? Math.min(230, vw * 0.26) : Math.min(230, vh * 0.27, vw * 0.165);
      bx = vw * (phone || tall ? 0.66 : vw < 1200 ? 0.78 : 0.735);
      by = phone ? Math.max(vh * 0.7, hb + R0 + 16) : vh * (tall ? 0.69 : 0.54);
      cover = Math.hypot(vw, vh) * 1.08;
      lens.style.width = lens.style.height = R0 * 2 + 'px';
      lensIn.style.width = vw + 'px';
      if (veil && veil.live) {
        vdpr = Math.min(devicePixelRatio || 1, 1.25);
        veil.size(vdpr);
        veil.f('uPh', phone ? 1 : 0);
        /* the words sit on a slightly darker patch of the night */
        const ht = hero.offsetTop - (phone ? 0 : hero.offsetHeight * (tall ? 1 : 0.54)),
          lead = $$('.hero__p,.hero__s', hero);
        const boxOf = (es, dx, dy) =>
          [
            Math.min(...es.map(e => e.offsetLeft)) + dx,
            Math.min(...es.map(e => e.offsetTop)) + dy,
            Math.max(...es.map(e => e.offsetLeft + e.offsetWidth)) + dx,
            Math.max(...es.map(e => e.offsetTop + e.offsetHeight)) + dy
          ].map(v => v * vdpr);
        veil.v4('uLead', boxOf(lead, hero.offsetLeft, ht));
        veil.v4('uHint', boxOf([hint], 0, 0));
      }
      WW = phone ? 390 : 1280;
      WH = phone ? 660 : 800;
      PO = phone ? 0 : 208;
      if (phone) {
        S0 = (vw - 16) / WW;
        f0 = [vw / 2, Math.max(206, vh - WH * S0 + 30) + (WH * S0) / 2];
      } else if (tall) {
        /* upright tablets: the sidebar leaves the frame so that the board can be read */
        S0 = (vw - 28) / 1084;
        f0 = [vw / 2 - (PO / 2) * S0, Math.max(210 + (WH * S0) / 2, 120 + (vh - 120) / 2)];
      } else if (tablet) {
        S0 = Math.min((vw - 48) / WW, (vh - 214) / WH);
        f0 = [vw / 2, 206 + (WH * S0) / 2];
      } else {
        const Lm = Math.max(vw * 0.034, 20) + 250,
          aw = vw - Lm - 36;
        S0 = Math.min(aw / WW, (vh - 64 - 28) / WH, 1.04);
        f0 = [Lm + aw / 2, Math.max(70, 64 + (vh - 84 - WH * S0) / 2) + (WH * S0) / 2];
      }
      c0 = [WW / 2, WH / 2];
      reset(ww, win, colsEl, actorsEl);
      const o = pan.getBoundingClientRect();
      const cards = {};
      $$('.slot-card', vBoard).forEach(s => {
        if (!s.classList.contains('drop')) cards[s.dataset.id] = rect(s, o);
      });
      drop = rect($('.slot.drop', vBoard), o);
      c14 = cards[14];
      colStep = cards[16].x - cards[20].x;
      shiftDy = -(c14.h + 8);
      btn = rect(newbtn, o);
      acts.forEach((a, i) => {
        const rs = $(`.slot-row[data-id="${a.id}"]`, vList);
        a.b = cards[a.id] || { x: cards[11].x, y: cards[11].y + cards[11].h + 8, w: cards[11].w, h: cards[11].h };
        a.a = rs ? rect(rs, o) : { x: a.b.x + (i % 2 ? 90 : -60), y: -220 - (i % 3) * 60, w: a.b.w, h: a.b.h };
        a.extra = !rs;
        if (a.fr) a.fr.style.width = a.a.w + 'px';
        a.fc.style.width = a.b.w + 'px';
        a.after14 = a.id !== '14' && a.b.x === c14.x && a.b.y > c14.y;
        a.in3 = a.id !== '14' && Math.abs(a.b.x - drop.x) < 2;
        a.i = i;
        a.z = 70 + ((i * 53) % 7) * 46;
        if (a.id === '14') {
          a14 = a;
          a.el.classList.add('hero14');
        }
      });
      actorsEl.style.perspectiveOrigin = `${cards[16].x + cards[16].w / 2}px ${cards[16].y + 200}px`;
      S1 = phone ? S0 * 1.04 : clamp(Math.min(600, vw * 0.42) / c14.w, S0, 2.4);
      f1 = phone ? [vw / 2, f0[1]] : tablet ? [vw * 0.5, vh * 0.62] : [vw * 0.37, vh * 0.52];
    },
    leave() {
      X.veil = 1;
      X.pulse[2] = 0;
    },
    update(p, intro, outro, now, dt) {
      const t = T;
      /* night: lens + veil */
      const nightOn = p < 0.092;
      cls(night, 'off', !nightOn);
      night.style.visibility = nightOn ? 'inherit' : 'hidden';
      if (nightOn) {
        const g = E.in(seg(p, 0, 0.078)),
          rise = stopped ? 1 : E.out5(clamp((now - T0 - 400) / 2600)),
          k = ease(dt, 250);
        sx += ((pOn ? px - vw / 2 : 0) * 0.26 - sx) * k;
        sy2 += ((pOn ? py - vh / 2 : 0) * 0.26 - sy2) * k;
        const cx = lerp(bx + sx + Math.sin(t * 0.5) * 8, vw * 0.5, g),
          cy = lerp(by + sy2 + Math.cos(t * 0.4) * 8 + (1 - rise) * vh * 0.5, vh * 0.5, g),
          s = 1 + g * (cover / R0);
        tf(lens, `translate3d(${cx - R0}px,${cy - R0}px,0) scale(${s})`);
        tf(lensIn, `translate3d(${R0 - cx / s}px,${R0 - cy / s}px,0) scale(${1 / s})`);
        const u = E.io(seg(p, 0, 0.08)),
          wt = `rotateX(${lerp(16, 5, u)}deg) rotateZ(${lerp(-6, -1.5, u)}deg) scale(${lerp(1.18, 1.06, u)})`;
        walls.forEach(w => tf(w, wt));
        if (veil && veil.live) {
          veil.v2('uS', [cx * vdpr, cy * vdpr]);
          veil.f('uWords', 1 - seg(p, 0.004, 0.03));
          veil.f('uRad', R0 * s * vdpr);
          veil.draw();
        }
        op(hero, 1 - seg(p, 0.006, 0.038));
        tf(hero, phone ? `translate3d(0,${-p * vh * 2}px,0)` : `translate3d(0,calc(${tall ? -100 : -54}% - ${p * vh * 2}px),0)`);
        cls(hint, 'gone', p > 0.003);
      }
      op(bloom, p < 0.2 ? seg(p, 0.052, 0.084) * (1 - seg(p, 0.1, 0.19)) : 0);
      X.veil = seg(p, 0.1, 0.2);
      /* line A */
      const la = seg(p, 0.074, 0.116) * (1 + nChars * 0.03),
        lo = seg(p, phone ? 0.19 : 0.158, phone ? 0.215 : 0.188);
      once(lineA, 'v', la.toFixed(3), v => lineA.style.setProperty('--t', v));
      op(lineA, p < 0.08 ? 0 : 1 - lo);
      tf(lineA, `translate3d(0,calc(-50% - ${(phone ? 4 : 0) + E.in2(lo) * 18}svh),0)`);
      /* list → board: every row lifts off, comes toward the camera and lands in its column */
      const F0 = 0.31,
        F1 = 0.5,
        fl = seg(p, F0, F1);
      op(vList, 1 - seg(p, F0 - 0.005, F0 + 0.04));
      op(vBoard, seg(p, F0 + 0.01, F0 + 0.06));
      cls(nvI, 'on', p < F0 + 0.03);
      cls(nvB, 'on', p >= F0 + 0.03);
      const dg = E.io(seg(p, 0.665, 0.765)),
        held = p >= 0.65 && p < 0.768,
        done = p >= 0.768,
        gap = E.io(seg(p, 0.665, 0.72));
      cls(col3, 'near', p > 0.715 && !done);
      cls(col3, 'done', done);
      once(cnt2, '_d', done, v => {
        cnt2.textContent = v ? 6 : 7;
        cnt3.textContent = v ? 4 : 3;
        if (p > 0.3)
          [cnt2, cnt3].forEach(c => {
            c.classList.remove('bump');
            void c.offsetWidth;
            c.classList.add('bump');
          });
      });
      X.pulse[2] = 0;
      const st = 0.56 / acts.length;
      let hx = 0,
        hy = 0;
      for (const a of acts) {
        const kk = seg(fl, a.i * st, a.i * st + 0.44),
          k = E.land(kk),
          arc = Math.sin(kk * Math.PI);
        let x = lerp(a.a.x, a.b.x, k),
          y = lerp(a.a.y, a.b.y, k) - arc * 22,
          z = arc * a.z,
          rot = arc * (a.i % 2 ? 3 : -3),
          sc = 1;
        if (a.after14) y += shiftDy * gap;
        if (a.in3) y += shiftDy * k * (1 - E.io(seg(p, 0.7, 0.758)));
        if (a === a14) {
          if (p > 0.64) {
            const lift = Math.sin(dg * Math.PI);
            x = lerp(a.b.x, drop.x, dg);
            y = lerp(a.b.y, drop.y, dg) - lift * 14;
            rot = lift * 3 + (held ? 1.2 : 0);
            sc = held ? 1.04 : 1;
            z = held ? 40 : 0;
          }
          hx = x;
          hy = y;
        }
        tf(a.el, `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) scale(${sc})`);
        if (a.fr) {
          op(a.fr, 1 - seg(kk, 0.03, 0.2));
          tf(a.fr, `scale(${lerp(1, a.b.w / a.a.w, E.out(seg(kk, 0, 0.26))).toFixed(4)},1)`);
          op(a.fc, seg(kk, 0.08, 0.28));
        } else op(a.fc, seg(kk, 0.02, 0.3));
        cls(a.el, 'fly', kk > 0.02 && kk < 0.97);
        cls(a.el, 'drag', a === a14 && held);
      }
      /* camera: wide → push in on SHOP-14 → track it across → pull back */
      const rise = E.out5(seg(p, 0.19, 0.28)),
        peek = E.out(seg(p, 0.12, 0.16)),
        sh = phone ? 0 : E.io(seg(p, 0.53, 0.625)) - E.io(seg(p, 0.8, 0.885));
      const ccx = PO + hx + c14.w / 2,
        ccy = 52 + hy + c14.h / 2;
      /* after the pull back the camera keeps leaning in, towards 「新しい課題」 */
      const lean = E.io(seg(p, 0.885, 1)),
        Sc = lerp(S0 * lerp(0.93, 1, rise) * (1 + 0.05 * E.io(fl)), S1, sh) * (1 + 0.04 * lean),
        cxw = lerp(lerp(c0[0], ccx, sh), PO + btn.x + btn.w / 2, 0.035 * lean),
        cyw = lerp(lerp(c0[1], Math.min(ccy, Math.max(c0[1], WH - 30 - (vh - f1[1]) / S1)), sh), 52 + btn.y + btn.h / 2, 0.035 * lean),
        fx = lerp(f0[0], f1[0], sh),
        fy = lerp(f0[1], f1[1], sh);
      const tx = fx - cxw * Sc,
        ty = fy - cyw * Sc + lerp(lerp(vh * 1.05, vh * (phone ? 0.58 : 0.56), peek), 0, rise);
      tf(ww, `translate3d(${tx.toFixed(1)}px,${ty.toFixed(1)}px,0) scale(${Sc.toFixed(4)})`);
      tf(
        win,
        phone
          ? `rotateX(${lerp(14, 0, rise).toFixed(2)}deg)`
          : `rotateX(${(lerp(16, 5, rise) * (1 - sh) * (1 - 0.7 * E.io(fl))).toFixed(2)}deg) rotateY(${(-5 * E.io(seg(p, 0.29, 0.5)) * (1 - sh) + sh * 2.5 * (1 - 2 * dg)).toFixed(2)}deg)`
      );
      ww.style.opacity = p < 0.11 ? 0.004 : 1;
      cls(win, 'focus', sh > 0.45 || outro > 0.25);
      /* cursor / finger */
      const gx = c14.w * 0.62,
        gy = 40,
        bcx = btn.x + btn.w * 0.6,
        bcy = btn.y + btn.h * 0.6;
      const ci = E.out(seg(p, 0.6, 0.648)),
        tb = E.io(seg(p, 0.86, 0.95));
      let cxp = lerp(hx + gx + 200, hx + gx, ci),
        cyp = lerp(hy + gy + 170, hy + gy, ci);
      if (p > 0.77) {
        const aw = E.io(seg(p, 0.775, 0.84));
        cxp = lerp(lerp(drop.x + gx, drop.x + gx + 60, aw), bcx, tb);
        cyp = lerp(lerp(drop.y + gy, drop.y + gy + 50, aw), bcy, tb);
      }
      op(cursor, seg(p, 0.595, 0.615));
      let panX = 0;
      if (phone) panX = -colStep * (E.io(seg(p, 0.54, 0.6)) + E.io(seg(p, 0.675, 0.755)) - 2 * E.io(seg(p, 0.82, 0.88)));
      if (phone || memo(colsEl).t) {
        const pt = `translate3d(${panX.toFixed(1)}px,0,0)`;
        tf(colsEl, pt);
        tf(actorsEl, pt);
      }
      const press = p > 0.957 && p < 0.99;
      cls(newbtn, 'down', press);
      tf(
        cursor,
        `translate3d(${(PO + cxp + (p > 0.86 ? panX * (1 - tb) : panX)).toFixed(1)}px,${(52 + cyp).toFixed(1)}px,0) scale(${(((held || press ? 0.86 : 1) * S0) / Sc).toFixed(3)})`
      );
      SH.btn = [tx + (PO + bcx) * Sc, ty + (52 + bcy) * Sc];
      /* captions */
      const b = Math.min(seg(p, 0.25, 0.29), 1 - seg(p, 0.52, 0.55)),
        c = phone ? Math.min(seg(p, 0.56, 0.6), 1 - outro * 2) : Math.min(seg(p, 0.618, 0.65), 1 - seg(p, 0.785, 0.812));
      op(capB, b * (1 - outro));
      tf(capB, `translate3d(0,${(1 - E.out(seg(p, 0.25, 0.31))) * 24}px,0)`);
      op(capC, c);
      tf(capC, `translate3d(0,${((1 - E.out(seg(p, phone ? 0.56 : 0.618, phone ? 0.62 : 0.68))) * 30).toFixed(1)}px,0)`);
      op(wash, phone ? 0 : Math.min(E.io(seg(p, 0.565, 0.622)), 1 - E.io(seg(p, 0.805, 0.85)))); // the headline may only appear once its ground is clear
      X.haze = p < 0.2 ? seg(p, 0.015, 0.05) : phone ? 0 : Math.max(seg(sh, 0, 0.1), seg(62 - ty, 0, 12)); // before the window's own bar can run into the header
    }
  });
})();
