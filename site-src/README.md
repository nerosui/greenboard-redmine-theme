# 紹介ページのソース

`../site/`（GitHub Pages で公開する紹介ページ）は、このフォルダから作ります。`../site/` のファイルは直接編集しません。

```bash
node build.js        # ../site/ を作り直す（Node.js のほかに必要なものはありません）
```

## 構成

| パス | 内容 |
|---|---|
| `templates/page.js` | ページ本体。文言はすべてここにあります |
| `templates/404.js` | 404 ページ |
| `templates/data.js` / `parts.js` | 画面の見本に使う架空のデータと、見本を組む部品 |
| `css/` | 番号順に連結されます。`20` は見本の画面（テーマの配色と寸法）、`30` は動かないページ、`50` は動くページ、`60` はスマホ、`70` はタブレットと低い画面 |
| `js/` | 番号順に連結されます。`10` は光、`30` はスクロールと場面の進行、`40`〜`46` は場面ごとの動き、`90` は開始と切り替え |
| `static/` | そのまま配る画像・アイコン・書体 |
| `tools/` | 書体・画像を作り直す道具（ふだんは使いません） |

## しくみ

- 動くページ（`html.motion`）では、`section` はスクロールの長さだけを持ち、各場面の `.stage` が画面に固定されます。場面ごとに
  `update(p, intro, outro)` が呼ばれ、`p` はその場面の進み具合、`intro` と `outro` は前後の場面との受け渡しです。スクロールそのものには手を加えません。
- 光は 2 枚の canvas（`#sky` と `#lit`）と木もれ日の 2 枚の画像です。時刻ごとの値は `js/10-light.js` の `KEYS` にまとめてあります。
  WebGL が使えないときは CSS の空に切り替わります。
- 次のどれかに当てはまるときは、同じ内容の動かないページになります: JavaScript が無効、`prefers-reduced-motion: reduce`、
  画面が小さい（幅 18.75em・高さ 30em 未満。拡大表示を含む）、URL に `?static=1`。開いたまま条件が変わったときも切り替わります。
- 時計の横のボタンで、ひとりでに動くもの（木もれ日・星・車窓など）を止められます。状態はタブを閉じるまで覚えています。
  25 秒のあいだ操作がないときや、タブが裏にあるときも止まります。
- 読み上げ: 動くページでは `.stage` を支援技術から隠し、同じ文言を `.said` としてスクロール位置に沿って置きます。画面の見本は
  `aria-hidden` と `inert` を付け、説明文（`.vh`）を添えます。
- 外部への通信はありません。

## 見出しの文言を変えたとき

見出しの明朝体は、使う文字だけを抜き出した書体です。文字が足りないと `build.js` が止まるので、次の手順で作り直します。

1. [Shippori Mincho](https://github.com/google/fonts/tree/main/ofl/shipporimincho) の `ShipporiMincho-Medium.ttf` を手に入れる
2. `pip install fonttools brotli`
3. `node tools/fonts.js <ShipporiMincho-Medium.ttf の場所>`
4. `node build.js`

書体のライセンス（SIL Open Font License 1.1）は `static/fonts/OFL.txt` にあり、ページと一緒に配ります。

## 画像

`tools/images.js`（アイコンと OGP）と `tools/leaves.js`（木もれ日）は `playwright-core` を使います。

```bash
npm i --no-save playwright-core
node tools/images.js
node tools/leaves.js
```

## 確認

`../site/` を任意の静的サーバーで配り、`/greenboard-redmine-theme/` 以下に置くと公開時と同じになります（404 ページの `base` のため）。

- `?static=1` 動かないページ
- `?snap=1` スクロールのなめらかな追従を切る（決まった位置で画面を撮るとき）
