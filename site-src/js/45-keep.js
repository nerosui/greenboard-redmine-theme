/* ============ 6. keep: そのまま ============ */
(() => {
  const el = $('#keep'),
    h = $('.keep__h', el),
    li = $$('.keep__f li', el),
    sub = $('.keep__s', el);
  let boxes = [],
    hr;
  scene('#keep', {
    layout() {
      const st = $('.stage', el),
        o = st.getBoundingClientRect(),
        all = [h, ...li, sub];
      all.forEach(e => {
        e.style.transform = 'none';
        memo(e).t = null;
      });
      h.style.fontSize = '';
      const w = h.scrollWidth,
        max = vw * (phone ? 0.86 : 0.84);
      if (w > max) h.style.fontSize = ((parseFloat(getComputedStyle(h).fontSize) * max) / w).toFixed(1) + 'px';
      const b = es => {
        const rs = es.map(e => rect(e, o));
        return [
          Math.min(...rs.map(r => r.x)) / vw - 0.01,
          Math.min(...rs.map(r => r.y)) / vh - 0.01,
          Math.max(...rs.map(r => r.x + r.w)) / vw + 0.01,
          Math.max(...rs.map(r => r.y + r.h)) / vh + 0.01
        ];
      };
      boxes = [b([h]), b([...li, sub])];
      hr = rect(h, o);
    },
    update(p, intro, outro) {
      const i = E.out5(seg(intro, 0.62, 1)),
        out = E.in2(seg(p, 0.66, 0.79));
      X.boxes = boxes;
      X.boxK = seg(intro, 0.5, 1) * (1 - out);
      op(h, i * (1 - out));
      tf(h, `translate3d(0,${(-out * 90).toFixed(1)}px,0) scale(${lerp(1.16, 1, i).toFixed(4)})`);
      const mxv = pOn ? cx * 100 : lerp(10, 90, seg(p, 0, 0.8)),
        myv = pOn ? cy * 100 : 42,
        k = Math.round(mxv) + ' ' + Math.round(myv);
      once(h, 'm', k, () => {
        h.style.setProperty('--mx', ((((mxv / 100) * vw - hr.x) / hr.w) * 100).toFixed(1) + '%');
        h.style.setProperty('--my', ((((myv / 100) * vh - hr.y) / hr.h) * 100).toFixed(1) + '%');
      });
      li.forEach((l, j) => {
        const a = seg(p, 0.03 + j * 0.09, 0.12 + j * 0.09);
        op(l, a * (1 - out));
        tf(l, `translate3d(0,${((1 - E.out5(a)) * 26 - out * 60).toFixed(1)}px,0)`);
      });
      op(sub, seg(p, 0.32, 0.4) * (1 - out));
    }
  });
})();
