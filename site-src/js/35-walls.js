/* ---- the two walls of the hero are drawn once to bitmaps and repeat as backgrounds ---- */
(() => {
  const { I, ...d } = DATA,
    W = 736;
  const mk = (h, sc) => {
    const c = D.createElement('canvas');
    c.width = W * sc;
    c.height = h * sc;
    const x = c.getContext('2d');
    x.scale(sc, sc);
    x.textBaseline = 'middle';
    return [c, x];
  };
  const put = (col, c, h) =>
    c.toBlob(b => {
      col.style.backgroundImage = `url(${URL.createObjectURL(b)})`;
      col.style.backgroundSize = `${W}px ${h}px`;
    });
  const fit = (x, s, w) => {
    if (x.measureText(s).width <= w) return s;
    while (s.length > 1 && x.measureText(s + '…').width > w) s = s.slice(0, -1);
    return s + '…';
  };
  $$('.wall--old .wcol').forEach(col => {
    const k = +col.dataset.k,
      [c, x] = mk(527, 1.5);
    x.fillStyle = '#eee';
    x.fillRect(0, 0, W, 27);
    x.font = 'bold 12px Verdana,"Hiragino Kaku Gothic ProN",Meiryo,sans-serif';
    x.fillStyle = '#555';
    [
      ['#', 30],
      ['トラッカー', 74],
      ['ステータス', 144],
      ['優先度', 208],
      ['題名', 260],
      ['担当者', 516],
      ['更新日', 612]
    ].forEach(([s, l]) => x.fillText(s, l, 14));
    x.font = '12px Verdana,"Hiragino Kaku Gothic ProN",Meiryo,sans-serif';
    for (let r = 0; r < 20; r++) {
      const j = (r + k) % 20,
        i = I[j],
        y = 27 + r * 25;
      x.fillStyle = r % 2 ? '#fff' : '#f6f7f8';
      x.fillRect(0, y, W, 25);
      x.fillStyle = '#d7d7d7';
      x.fillRect(0, y + 24, W, 1);
      x.strokeStyle = '#888';
      x.lineWidth = 1;
      x.strokeRect(6.5, y + 7.5, 11, 11);
      x.fillStyle = '#169';
      x.fillText(i[0], 30, y + 12.5);
      x.fillText(fit(x, i[4], 244), 260, y + 12.5);
      x.fillText(i[5] ? d.WHO[i[5]][1] : '', 516, y + 12.5);
      x.fillStyle = '#333';
      x.fillText(d.TR[i[1]], 74, y + 12.5);
      x.fillText(d.ST[i[2]], 144, y + 12.5);
      x.fillText(d.PR[i[3]][1], 208, y + 12.5);
      x.fillText('2026/' + d.UPD[j], 612, y + 12.5);
    }
    x.fillStyle = '#d7d7d7';
    x.fillRect(0, 26, W, 1);
    put(col, c, 527);
  });
  const TRC = { 1: '#e0625b', 2: '#7fa32b', 3: '#e09a2f' },
    STC = { 1: '#ed8077', 2: '#4488c5', 3: '#5eb5a6', 5: '#a1af2f' },
    AVC = { h: '#8a6bb8', m: '#3d93a8', o: '#c9772e', k: '#c85a7c' },
    F = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP","Yu Gothic UI",Meiryo,system-ui,sans-serif';
  const pill = (x, l, y, w, col, s) => {
    x.fillStyle = col;
    x.beginPath();
    x.roundRect ? x.roundRect(l, y - 11, w, 22, 11) : x.rect(l, y - 11, w, 22);
    x.fill();
    x.fillStyle = '#fff';
    x.font = '600 12px ' + F;
    x.textAlign = 'center';
    x.fillText(s, l + w / 2, y + 0.5);
    x.textAlign = 'left';
  };
  $$('.wall--new .wcol').forEach(col => {
    const k = +col.dataset.k,
      [c, x] = mk(880, 2);
    x.fillStyle = '#fff';
    x.fillRect(0, 0, W, 880);
    for (let r = 0; r < 20; r++) {
      const i = I[(r + k) % 20],
        y = r * 44,
        m = y + 22;
      x.fillStyle = '#e0e5e3';
      x.fillRect(0, y + 43, W, 1);
      x.strokeStyle = '#c9d1ce';
      x.lineWidth = 1;
      x.beginPath();
      x.roundRect ? x.roundRect(10.5, m - 7.5, 15, 15, 3) : x.rect(10.5, m - 7.5, 15, 15);
      x.stroke();
      x.font = '14px ' + F;
      x.fillStyle = '#1a7f5e';
      x.fillText('SHOP-' + i[0], 32, m + 1);
      pill(x, 105, m, 68, TRC[i[1]], d.TR[i[1]]);
      pill(x, 185, m, 64, STC[i[2]], d.ST[i[2]]);
      x.font = '13px ' + F;
      x.fillStyle = d.PR[i[3]][2] === 'hi' ? '#e0625b' : d.PR[i[3]][2] === 'lo' ? '#4488c5' : '#74807c';
      x.textAlign = 'center';
      x.fillText(d.PR[i[3]][0], 279, m);
      x.textAlign = 'left';
      x.font = '14px ' + F;
      x.fillStyle = '#2f3a37';
      x.fillText(fit(x, i[4], 360), 301, m + 1);
      if (i[5]) {
        x.fillStyle = AVC[i[5]];
        x.beginPath();
        x.arc(684, m, 10, 0, 7);
        x.fill();
        x.fillStyle = '#fff';
        x.font = '600 11px ' + F;
        x.textAlign = 'center';
        x.fillText(d.WHO[i[5]][0], 684, m + 0.5);
        x.textAlign = 'left';
      }
      x.fillStyle = '#55625e';
      x.font = '14px ' + F;
      x.fillText('···', 708, m - 2);
    }
    put(col, c, 880);
  });
})();
