// 木もれ日の影（枝と葉を描いてぼかした 2 枚）を作り、static/img/leaf-near.webp と leaf-far.webp に書き出す。
//   npm i --no-save playwright-core   してから   node tools/leaves.js
const { chromium } = require('playwright-core');
const fs = require('fs'),
  path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  for (const [name, seed, W, H, blur, nBranch, leaf, q] of [
    ['leaf-near', 7, 1400, 1000, 5, 4, 62, 0.55],
    ['leaf-far', 23, 1400, 1000, 16, 6, 44, 0.5]
  ]) {
    const url = await p.evaluate(
      ([seed, W, H, blur, nBranch, leaf, q]) => {
        let s = seed;
        const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
        const c = document.createElement('canvas');
        c.width = W;
        c.height = H;
        const x = c.getContext('2d');
        x.filter = `blur(${blur}px)`;
        x.fillStyle = x.strokeStyle = 'rgb(18,58,44)';
        x.lineCap = 'round';
        const leafAt = (px, py, ang, len) => {
          x.save();
          x.translate(px, py);
          x.rotate(ang);
          const w = len * (0.3 + R() * 0.14);
          x.beginPath();
          x.moveTo(0, 0);
          x.bezierCurveTo(len * 0.3, -w, len * 0.75, -w * 0.8, len, 0);
          x.bezierCurveTo(len * 0.75, w * 0.8, len * 0.3, w, 0, 0);
          x.fill();
          x.restore();
        };
        const branch = (px, py, ang, len, w, depth) => {
          const steps = Math.round(len / 26);
          let a = ang;
          for (let i = 0; i < steps; i++) {
            a += (R() - 0.5) * 0.22 + 0.012;
            const nx = px + Math.cos(a) * 26,
              ny = py + Math.sin(a) * 26;
            x.lineWidth = Math.max(1, w * (1 - i / steps));
            x.beginPath();
            x.moveTo(px, py);
            x.lineTo(nx, ny);
            x.stroke();
            px = nx;
            py = ny;
            if (i > 1 && R() < 0.8) {
              const side = i % 2 ? 1 : -1;
              leafAt(px, py, a + side * (0.5 + R() * 0.7), leaf * (0.6 + R() * 0.7));
              if (R() < 0.45) leafAt(px, py, a - side * (0.4 + R() * 0.6), leaf * (0.5 + R() * 0.5));
            }
            if (depth < 2 && i > 2 && R() < 0.2)
              branch(px, py, a + (R() < 0.5 ? 1 : -1) * (0.5 + R() * 0.5), len * (0.35 + R() * 0.3), w * 0.55, depth + 1);
          }
          leafAt(px, py, a, leaf * 1.1);
        };
        for (let i = 0; i < nBranch; i++) {
          const t = i / (nBranch - 1);
          branch(
            W * (1.02 - t * 0.75) + (R() - 0.5) * 120,
            -30 + R() * 40,
            Math.PI * (0.55 + t * 0.22 + (R() - 0.5) * 0.12),
            H * (0.55 + R() * 0.45),
            7 + R() * 5,
            0
          );
        }
        for (let i = 0; i < Math.ceil(nBranch / 2); i++)
          branch(W + 30, H * (0.1 + i * 0.22 + R() * 0.1), Math.PI * (0.92 + R() * 0.2), W * (0.3 + R() * 0.3), 6 + R() * 4, 0);
        const d = document.createElement('canvas');
        d.width = 640;
        d.height = Math.round((640 * H) / W);
        const y = d.getContext('2d');
        y.imageSmoothingQuality = 'high';
        y.drawImage(c, 0, 0, d.width, d.height);
        // 透明度を 24 段階に丸めて、可逆圧縮を効かせる
        const im = y.getImageData(0, 0, d.width, d.height),
          a = im.data;
        for (let i = 3; i < a.length; i += 4) a[i] = Math.round(a[i] / 11) * 11;
        y.putImageData(im, 0, 0);
        return d.toDataURL('image/webp', q);
      },
      [seed, W, H, blur, nBranch, leaf, q]
    );
    const buf = Buffer.from(url.split(',')[1], 'base64');
    fs.writeFileSync(path.join(__dirname, '..', 'static/img', name + '.webp'), buf);
    console.log(name, (buf.length / 1024).toFixed(1) + ' KB', url.slice(5, 15));
  }
  await b.close();
})();
