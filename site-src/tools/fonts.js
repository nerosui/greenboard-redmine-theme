// 明朝体のサブセットを作り直す。見出しの文言を変えたあとに実行する。
//   node tools/fonts.js <ShipporiMincho-Medium.ttf>     （pyftsubset が必要: pip install fonttools brotli）
// 元の書体: https://github.com/google/fonts/tree/main/ofl/shipporimincho （SIL Open Font License 1.1）
const fs = require('fs'),
  path = require('path'),
  { execFileSync } = require('child_process');
const ttf = process.argv[2];
if (!ttf) throw new Error('ttf ファイルを指定してください');
const { minchoChars } = require('./mincho.js');
const vars = new Proxy({}, { get: () => '' });
const set = minchoChars([require('../templates/page.js')(vars), require('../templates/404.js')(vars)]);
const text = [...set].sort().join('');
const dir = path.join(__dirname, '../static/fonts');
execFileSync('pyftsubset', [
  ttf,
  `--text=${text}`,
  '--flavor=woff2',
  '--layout-features=*',
  `--output-file=${path.join(dir, 'shippori-mincho-500.woff2')}`
]);
fs.writeFileSync(path.join(dir, 'glyphs.txt'), text + '\n');
console.log(`${set.size} 文字`);
