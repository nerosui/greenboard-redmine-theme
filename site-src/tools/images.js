// favicon.ico / apple-touch-icon.png / OGP 画像を作り直す。
//   npm i --no-save playwright-core   してから   node tools/images.js
// OGP は ../site の冒頭の場面を撮るので、先に build.js を実行しておく。
const fs = require('fs'),
  path = require('path');
const { chromium } = require('playwright-core');
const STATIC = path.join(__dirname, '../static'),
  SITE = path.join(__dirname, '../../site');
const TYPE = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml'
};
(async () => {
  const browser = await chromium.launch({ args: ['--enable-gpu', '--use-angle=metal', '--lang=ja'] });
  const svg = fs.readFileSync(path.join(STATIC, 'favicon.svg'), 'utf8');
  const icon = async (size, square) => {
    const p = await browser.newPage({ viewport: { width: size, height: size } });
    await p.setContent(
      `<style>body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>` + (square ? svg.replace('rx="8"', '') : svg)
    );
    const png = await p.screenshot({ omitBackground: true });
    await p.close();
    return png;
  };
  fs.writeFileSync(path.join(STATIC, 'apple-touch-icon.png'), await icon(180, true));
  const png = await icon(32, false),
    head = Buffer.alloc(22);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(1, 4);
  head[6] = head[7] = 32;
  head.writeUInt16LE(1, 10);
  head.writeUInt16LE(32, 12);
  head.writeUInt32LE(png.length, 14);
  head.writeUInt32LE(22, 18);
  fs.writeFileSync(path.join(STATIC, 'favicon.ico'), Buffer.concat([head, png]));

  const p = await browser.newPage({ viewport: { width: 1200, height: 630 }, locale: 'ja-JP' });
  await p.route('http://site.test/**', r => {
    const f = path.join(SITE, new URL(r.request().url()).pathname.replace(/\/$/, '/index.html'));
    return fs.existsSync(f)
      ? r.fulfill({ body: fs.readFileSync(f), contentType: TYPE[path.extname(f)] || 'application/octet-stream' })
      : r.fulfill({ status: 404 });
  });
  await p.goto('http://site.test/', { waitUntil: 'networkidle' });
  await p.addStyleTag({ content: '.hint,.tools,.hdr__cta{display:none!important}' });
  await p.waitForTimeout(5000);
  fs.writeFileSync(path.join(STATIC, 'img/ogp.jpg'), await p.screenshot({ type: 'jpeg', quality: 84 }));
  await browser.close();
})();
