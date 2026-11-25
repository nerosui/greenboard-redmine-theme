// ../site を作り直す。  node build.js
const fs = require('fs'),
  path = require('path'),
  crypto = require('crypto');
const SRC = __dirname,
  OUT = path.join(SRC, '..', 'site');
const read = f => fs.readFileSync(path.join(SRC, f), 'utf8');
const parts = dir =>
  fs
    .readdirSync(path.join(SRC, dir))
    .filter(f => /^\d\d-.*\.(css|js)$/.test(f))
    .sort()
    .map(f => read(`${dir}/${f}`))
    .join('\n');
const data = require('./templates/data.js');

const css = '@charset "utf-8";\n' + parts('css');
const { I, TR, ST, WHO, PR, UPD } = data;
const js = `(() => {\n'use strict';\nconst DATA = ${JSON.stringify({ I, TR, ST, WHO, PR, UPD })};\n${parts('js')}})();\n`;
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 8);

// 最初の描画より前に、動く版か静かな版かを決める（条件は js/00-core.js の wantsMotion と同じ）。
const HEADJS = `(d=>{d.classList.add('js');var m=q=>matchMedia(q).matches;if(!m('(prefers-reduced-motion: reduce)')&&m('(min-width: 18.75em) and (min-height: 30em)')&&!/[?&]static=1/.test(location.search)){d.classList.add('motion');try{if(sessionStorage.getItem('gb-motion')==='off')d.classList.add('stopped')}catch(e){}}})(document.documentElement)`;

const BASE = 'https://nerosui.github.io/greenboard-redmine-theme/';
const vars = {
  BASE,
  HEADJS,
  REPO: 'https://github.com/nerosui/greenboard-redmine-theme',
  TITLE: 'おはよう、Redmine。｜Greenboard',
  DESC: '散らかっていたのは、仕事じゃなくて画面でした。夜明け前から次の朝まで、一日の光の中で見る Redmine のテーマ「Greenboard」。無料、GPL v2。',
  CSS: `assets/site.css?${hash(css)}`,
  JS: `assets/site.js?${hash(js)}`,
  FONT: 'assets/fonts/shippori-mincho-500.woff2'
};
const pages = { 'index.html': require('./templates/page.js')(vars), '404.html': require('./templates/404.js')(vars) };

// 明朝体のサブセットに無い文字が使われていたら止める（tools/fonts.js を実行して作り直す）。
const { minchoChars } = require('./tools/mincho.js');
const have = new Set(read('static/fonts/glyphs.txt').trim());
const missing = [...minchoChars(Object.values(pages))].filter(c => !have.has(c));
if (missing.length && !process.argv.includes('--no-font-check')) {
  console.error('フォントに無い文字: ' + missing.join(''));
  process.exit(1);
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
for (const [f, s] of Object.entries(pages)) fs.writeFileSync(path.join(OUT, f), s);
fs.writeFileSync(path.join(OUT, 'assets/site.css'), css);
fs.writeFileSync(path.join(OUT, 'assets/site.js'), js);
for (const f of ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png']) fs.copyFileSync(path.join(SRC, 'static', f), path.join(OUT, f));
fs.cpSync(path.join(SRC, 'static/img'), path.join(OUT, 'assets/img'), { recursive: true });
fs.cpSync(path.join(SRC, 'static/fonts'), path.join(OUT, 'assets/fonts'), { recursive: true, filter: f => !f.endsWith('glyphs.txt') });
console.log('site/ を書き出しました');
