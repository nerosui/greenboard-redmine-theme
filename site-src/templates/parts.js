// 画面の見本を組む小さな部品。
const { I, TR, ST, WHO, PR, UPD } = require('./data.js');
const by = id => I.find(i => i[0] === id);
const av = (w, s = '') => w ? `<b class="av a-${w}${s}">${WHO[w][0]}</b>` : '';
const tr = t => `<b class="pill t${t}">${TR[t]}</b>`, st = s => `<b class="pill s${s}">${ST[s]}</b>`;
const pr = p => `<span class="prio ${PR[p][2]}">${PR[p][0]}</span>`;
const row = i => `<div class="row"><i class="cb"></i><span class="key">SHOP-${i[0]}</span><span class="c-tr">${tr(i[1])}</span><span class="c-st">${st(i[2])}</span>${pr(i[3])}<span class="sub">${i[4]}</span><span class="c-av">${av(i[5])}<em>${i[5] ? WHO[i[5]][1] : ''}</em></span><span class="dots">···</span></div>`;
const card = i => `<div class="card"><div class="h">${tr(i[1])}<span class="key">SHOP-${i[0]}</span></div><div class="s">${i[4]}</div><div class="f">${av(i[5])}${pr(i[3])}<span>${PR[i[3]][1]}</span>${i[6] ? `<span class="due${i[7] ? ' over' : ''}"><i class="clk"></i>${i[6]}</span>` : ''}</div></div>`;
const orow = (i, k) => `<div class="orow"><i class="ocb"></i><b>${i[0]}</b><span>${TR[i[1]]}</span><span>${ST[i[2]]}</span><span>${PR[i[3]][1]}</span><b>${i[4]}</b><b>${i[5] ? WHO[i[5]][1] : ''}</b><span>2026/${UPD[k]}</span></div>`;
const OHEAD = `<div class="orow oh"><i class="ocb"></i><span>#</span><span>トラッカー</span><span>ステータス</span><span>優先度</span><span>題名</span><span>担当者</span><span>更新日</span></div>`;
const rep = (n, f) => Array.from({ length: n }, (_, k) => f(k)).join('');
const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><use href="#i-${n}"/></svg>`;
const chars = s => [...s].map(c => c === '\n' ? '<br>' : `<span class="ch">${c}</span>`).join('');
const filterBox = `<div class="fbox"><div class="fl"><i class="chev"></i>フィルタ<span class="fcount">1件の条件</span></div><div class="fr"><i class="cb on"></i><span>ステータス</span><span class="sel">未完了<i class="chev d"></i></span></div><div class="fl"><i class="chev r"></i>オプション</div><div class="fb"><span class="btn pri sm">✓ 適用</span><span class="btn sm">クリア</span></div></div>`;
// 見出しは 1 文字ずつ動かすので、読み上げ用の文と見た目用の文字を分ける。
const spoken = (plain, shown) => `<span class="vh">${plain}</span><span aria-hidden="true">${shown}</span>`;
module.exports = { by, av, tr, st, pr, row, card, orow, OHEAD, rep, ic, chars, filterBox, spoken };
