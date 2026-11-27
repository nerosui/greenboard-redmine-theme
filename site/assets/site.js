(() => {
'use strict';
const DATA = {"I":[[20,3,1,"n","初売りセールの告知ページを用意する","h","12/28"],[19,2,5,"hi","配送日時の指定を注文画面に追加する","o","12/2"],[18,1,1,"n","商品名が長いと一覧の行が崩れる","h","12/12"],[17,2,1,"lo","購入履歴からもう一度注文できるようにする","",""],[16,3,2,"n","公開前の確認手順を Wiki にまとめる","m","12/14"],[15,2,3,"n","会員登録フォームの入力項目を減らす","h","12/8",1],[14,1,2,"ur","クーポンを2枚使うと合計金額がずれる","o","12/7",1],[13,2,1,"n","商品一覧を在庫の有無で絞り込めるようにする","o","2027/01/15"],[12,3,2,"n","よくある質問に返品・交換の手順を追加する","k","12/15"],[11,2,1,"n","お気に入りのボタンを商品一覧にも置く","",""],[10,1,5,"n","検索結果の並び順が「新着順」にならない","o","11/30"],[9,3,1,"n","注文確認メールの文面を見直す","k","12/12"],[8,2,2,"n","のしとギフト包装を注文時に選べるようにする","o","12/14"],[7,2,3,"n","トップページのバナーを冬の特集に切り替える","h","12/4",1],[6,1,1,"hi","郵便番号から住所が自動入力されない","o","12/11"],[5,2,2,"hi","年末年始の休業と発送日のお知らせを掲載する","k","12/11"],[4,3,3,"n","送料の案内文を新しい料金表に合わせる","k","12/5",1],[3,1,2,"ur","スマホで購入ボタンが画面の外にはみ出す","o","12/9"],[2,2,1,"lo","カートに「あとで買う」を追加する","o","2027/01/20"],[1,2,2,"n","商品ページの写真を新しい撮影分に差し替える","h","12/10"]],"TR":{"1":"バグ","2":"機能","3":"サポート"},"ST":{"1":"未対応","2":"処理中","3":"処理済み","5":"完了"},"WHO":{"h":["樋","樋口 真央"],"m":["森","森下 由佳"],"o":["小","小野寺 剛"],"k":["早","早川 蓮"]},"PR":{"n":["→","通常",""],"hi":["↑","高め","hi"],"ur":["↑","急いで","hi"],"lo":["↓","低め","lo"]},"UPD":["12/04 10:12","11/24 16:40","12/05 09:31","12/03 11:02","12/08 09:41","12/08 10:05","12/07 17:20","12/03 13:15","12/04 15:48","12/03 13:20","11/25 10:07","12/04 18:02","12/02 14:26","11/27 11:39","12/08 08:55","12/08 09:18","12/01 16:11","12/04 12:30","11/30 09:50","11/30 10:44"]};
/* ---- helpers ---- */
const D = document;
const R = D.documentElement;
const $ = (s, c = D) => c.querySelector(s);
const $$ = (s, c = D) => [...c.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (p, a, b) => clamp((p - a) / (b - a));
const ease = (dt, ms) => 1 - Math.exp(-dt / ms); // the same feel at 60 Hz and at 120 Hz
const E = {
  out: t => 1 - Math.pow(1 - t, 3),
  out5: t => 1 - Math.pow(1 - t, 5),
  io: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  in: t => t * t * t,
  in2: t => t * t,
  land: t => 1 + 2.1 * Math.pow(t - 1, 3) + 1.1 * Math.pow(t - 1, 2) // a small overshoot, used only when cards land
};

/* Last written values live on the element, so a frame touches the DOM only when something changed. */
const memo = el => el._c || (el._c = {});
const tf = (el, v) => {
  const c = memo(el);
  if (c.t !== v) el.style.transform = c.t = v;
};
const op = (el, v) => {
  const c = memo(el);
  v = Math.round(clamp(v) * 1000) / 1000;
  if (c.o === v) return;
  c.o = v;
  el.style.opacity = v;
  el.style.visibility = v <= 0 ? 'hidden' : 'inherit';
};
const cls = (el, name, on) => {
  const c = memo(el);
  if (c['.' + name] !== on) el.classList.toggle(name, (c['.' + name] = on));
};
const typed = (el, t) => {
  const c = memo(el);
  const s = el.dataset.text;
  const n = Math.round(clamp(t) * s.length);
  if (c.n !== n) el.textContent = s.slice(0, (c.n = n));
  return n;
};
const once = (el, key, v, fn) => {
  const c = memo(el);
  if (c[key] !== v) fn((c[key] = v));
};
const rect = (e, o) => {
  const r = e.getBoundingClientRect();
  return { x: r.left - o.left, y: r.top - o.top, w: r.width, h: r.height };
};
const reset = (...els) =>
  els.forEach(e => {
    e.style.transform = 'none';
    memo(e).t = null;
  });

/* ---- viewport ---- */
const QUERY = new URLSearchParams(location.search);
const SNAP = QUERY.get('snap') === '1'; // no smoothing, for frame captures
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const roomy = matchMedia('(min-width: 18.75em) and (min-height: 30em)'); // also false at high zoom and with a large default font
const wantsMotion = () => !reducedMotion.matches && roomy.matches && QUERY.get('static') !== '1';
let vw = innerWidth;
let vh = innerHeight;
let phone = vw <= 760;
let tablet = !phone && vw <= 1100;
let tall = tablet && vh >= vw; // tablets held upright

/* ---- clocks: T0 = page start, T = ambient seconds (stands still while motion is stopped) ---- */
let T0 = performance.now();
let T = 0;

/* ---- copy button ---- */
{
  const b = $('.term__c');
  if (b && navigator.clipboard) {
    b.hidden = false;
    b.addEventListener('click', () =>
      navigator.clipboard.writeText($('.term code').textContent).then(() => {
        b.textContent = 'コピーしました';
        setTimeout(() => (b.textContent = 'コピー'), 1800);
      })
    );
  }
}

/* ---- static page: scale the fixed-size screens to their column ---- */
function fitStatic() {
  if (R.classList.contains('motion')) return;
  for (const w of $$('.winwrap,.formwrap,.threadwrap,.homewrap')) {
    const c = w.firstElementChild;
    c.style.transform = 'none';
    w.style.height = '';
    const s = Math.min(1, w.clientWidth / c.offsetWidth);
    c.style.transformOrigin = '0 0';
    c.style.transform = `scale(${s})`;
    w.style.height = c.offsetHeight * s + 'px';
  }
}

/* ================= light =================
   Two full-screen canvases: #sky behind everything (time of day), #lit in front (shade, passing lights).
   KEYS is the day. g = scene index + progress; min = clock in minutes; a value that is left out keeps its last one. */
const hex = h => [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const KEYS = [
  {
    g: 0,
    top: '050b0a',
    bot: '0b1412',
    sun: [0.68, 0.54],
    sunC: '9be8c4',
    sunR: 0.2,
    glow: 0,
    stars: 0,
    city: 0,
    hor: 0,
    horY: 0.8,
    horC: '000000',
    haze: 0.3,
    ridge: 0,
    leaf: 0,
    blind: 0,
    beam: 0,
    read: 0,
    train: 0,
    ink: 0,
    min: 312
  },
  { g: 0.07, top: 'fdeccb', bot: 'fbdcb4', sun: [0.6, 0.5], sunC: 'fff0d0', sunR: 0.55, glow: 0.4, haze: 1, ink: 1, min: 365 },
  { g: 0.2, top: 'f6ecd6', bot: 'fbf1dc', sun: [0.8, 0.2], glow: 0.4, leaf: 0.4, min: 420 },
  { g: 0.3, top: 'e6efe0', bot: 'f6f3e2', sun: [0.92, 0.0], sunC: 'ffefc4', sunR: 0.5, glow: 0.5, leaf: 1, min: 462 },
  { g: 0.9, leaf: 1, min: 545 },
  { g: 1.06, top: 'e4d9c6', bot: 'eee4d2', sun: [0.3, -0.1], sunC: 'fff3d8', sunR: 0.7, glow: 0.25, leaf: 0, blind: 1, min: 724 },
  { g: 1.55, blind: 1, min: 790 },
  { g: 1.9, top: 'e6dbc6', bot: 'f0e3ca', blind: 0.5, sun: [0.2, 0.0], min: 885 },
  { g: 2.02, blind: 0, min: 900 },
  { g: 2.38, top: 'efd9b8', bot: 'f3dfc2', sun: [0.04, 0.3], sunC: 'ffc890', glow: 0.3, min: 965 },
  { g: 2.58, top: 'ebc9a2', bot: 'f2dcbc', sun: [0.0, 0.46], sunC: 'ffb070', sunR: 0.5, glow: 0.36, beam: 1, min: 990 },
  { g: 2.95, beam: 0.8, read: 0, min: 1020 },
  { g: 3.15, top: 'dfae86', bot: 'ecc9a4', beam: 0.2, read: 1, sun: [0.0, 0.62], min: 1035 },
  { g: 3.8, top: 'd59c7a', bot: 'e8b692', read: 1, sun: [0.02, 0.8], min: 1062 },
  {
    g: 3.98,
    top: '2a3c66',
    bot: 'e58f58',
    read: 0,
    beam: 0,
    hor: 1,
    horY: 0.74,
    horC: 'ffb070',
    glow: 0.2,
    city: 0.2,
    train: 0.2,
    ink: 0,
    min: 1098
  },
  { g: 4.13, top: '0a1330', bot: '1a284a', hor: 0.4, horY: 0.78, horC: '80586a', city: 1, train: 1, stars: 0.25, glow: 0, min: 1150 },
  { g: 4.85, city: 1, train: 1, min: 1192 },
  { g: 5.05, top: '040813', bot: '0a1522', city: 0, train: 0, stars: 1, ridge: 1, hor: 0.4, horY: 0.85, horC: '1f4a66', min: 1425 },
  { g: 5.68, stars: 1, hor: 0.55, horC: '2c6a72', min: 1640 },
  { g: 5.93, top: '0b1c2c', bot: '1d3a40', stars: 0.35, hor: 0.95, horC: 'f0a070', min: 1745 },
  { g: 6, top: '0b3328', bot: '156a50', stars: 0, ridge: 0.5, hor: 0.5, horY: 1.04, horC: 'ffe2a8', min: 1790 },
  { g: 6.3, top: '115a43', bot: '17735a', stars: 0, ridge: 0, hor: 0.42, horY: 1.02, horC: 'fff0c8', min: 1806 }
];
{
  const last = {};
  for (const k of KEYS) {
    for (const f in k) if (typeof k[f] === 'string') k[f] = hex(k[f]);
    for (const f in last) if (!(f in k)) k[f] = last[f];
    Object.assign(last, k);
  }
}
const L = {}; // the interpolated key of this frame
const X = { readY: 0.45, shift: 0, pulse: [0, 0, 0], cur: [0.5, 0.5], curS: 0, veil: 0, haze: 0, covered: false, boxes: [], boxK: 0 }; // set by the scenes
function lightAt(g) {
  let i = 0;
  while (i < KEYS.length - 2 && KEYS[i + 1].g <= g) i++;
  const a = KEYS[i],
    b = KEYS[i + 1];
  const t = clamp((g - a.g) / (b.g - a.g)),
    u = t * t * (3 - 2 * t);
  for (const f in a) L[f] = typeof a[f] === 'number' ? lerp(a[f], b[f], f === 'min' ? t : u) : a[f].map((v, j) => lerp(v, b[f][j], u));
}

const GLSL = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uR;uniform float uT;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float hs(vec2 p){vec3 q=fract(p.xyx*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){return n(p)*.55+n(p*2.03+7.1)*.3+n(p*4.1+3.7)*.15;}
`;
function makeGL(cv, frag, names, changed) {
  const gl = cv.getContext('webgl', { premultipliedAlpha: true, antialias: false, alpha: true, powerPreference: 'low-power' });
  if (!gl) return null;
  let u = {},
    scale = 1;
  const build = () => {
    const pr = gl.createProgram();
    for (const [type, src] of [
      [gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}'],
      [gl.FRAGMENT_SHADER, GLSL + frag]
    ]) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      gl.attachShader(pr, s);
    }
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
    gl.useProgram(pr);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, 'p');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    u = {};
    for (const k of ['uR', 'uT', ...names]) u[k] = gl.getUniformLocation(pr, k);
    return true;
  };
  const api = {
    live: build(),
    size(s) {
      scale = s;
      cv.width = Math.max(2, Math.round(vw * s));
      cv.height = Math.max(2, Math.round(vh * s));
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(u.uR, cv.width, cv.height);
    },
    f(k, v) {
      gl.uniform1f(u[k], v);
    },
    v2(k, v) {
      gl.uniform2f(u[k], v[0], v[1]);
    },
    v3(k, v) {
      gl.uniform3f(u[k], v[0], v[1], v[2]);
    },
    v4(k, v) {
      gl.uniform4f(u[k], v[0], v[1], v[2], v[3]);
    },
    draw() {
      gl.uniform1f(u.uT, T);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
  if (!api.live) return null;
  cv.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    api.live = false;
    changed();
  });
  cv.addEventListener('webglcontextrestored', () => {
    api.live = build();
    if (api.live) api.size(scale);
    changed();
  });
  return api;
}

/* ---- plain CSS sky, only when WebGL is missing or its context is lost ---- */
let cssSky = null;
function glChanged() {
  const off = !sky || !sky.live;
  R.classList.toggle('nogl', off);
  if (off && !cssSky) {
    cssSky = D.createElement('div');
    cssSky.className = 'cssky';
    cssSky.setAttribute('aria-hidden', 'true');
    D.body.prepend(cssSky);
  }
  R.classList.toggle('nolit', !lit || !lit.live);
  kick();
}
const rgb = (c, a = 1) => `rgba(${c.map(v => Math.round(v * 255)).join(',')},${a.toFixed(3)})`;
function drawCssSky() {
  const at = `circle at ${(L.sun[0] * 100).toFixed(1)}% ${(L.sun[1] * 100).toFixed(1)}%`;
  const y = L.horY * 100;
  cssSky.style.background =
    `radial-gradient(${at},${rgb(L.sunC, L.glow)},transparent ${(L.sunR * 100).toFixed(0)}vmax),` +
    `linear-gradient(180deg,transparent ${(y - 34).toFixed(0)}%,${rgb(L.horC, L.hor * 0.6)} ${y.toFixed(0)}%,transparent ${(y + 24).toFixed(0)}%),` +
    `linear-gradient(180deg,${rgb(L.top)},${rgb(L.bot)})`;
  cssSky.style.setProperty('--stars', L.stars.toFixed(2));
}

const sky = makeGL(
  $('#sky'),
  `uniform vec4 uBox0,uBox1,uBox2;uniform float uBoxK,uHead;float boxed(vec2 p,vec4 b){vec2 d=max(b.xy-p,p-b.zw);return smoothstep(.1,.0,max(d.x,d.y));}
uniform vec3 uTop,uBot,uSunC,uHorC;uniform vec2 uSun;uniform float uSunR,uGlow,uStars,uCity,uHor,uHorY,uHaze,uShift,uRidge;
void main(){
vec2 uv=gl_FragCoord.xy/uR;uv.y=1.-uv.y;float asp=uR.x/uR.y;
float calm=smoothstep(uHead,uHead*1.5,uv.y);calm*=1.-uBoxK*max(boxed(uv,uBox0),max(boxed(uv,uBox1),boxed(uv,uBox2)));vec3 c=mix(uTop,uBot,smoothstep(0.,1.,uv.y));
float f=fbm(vec2(uv.x*asp*1.3+uT*.012,uv.y*1.7-uT*.006));c+=(f-.5)*.07*uHaze;
float d=distance(vec2(uv.x*asp,uv.y),vec2(uSun.x*asp,uSun.y));c+=uSunC*exp(-d/uSunR)*uGlow*(.85+.3*f);
c+=uHorC*exp(-abs(uv.y-uHorY)*7.)*uHor*(.8+.4*n(vec2(uv.x*3.+uT*.02,1.)));
if(uStars>0.01){vec2 g=floor(gl_FragCoord.xy/2.);float s=hs(g);c+=vec3(.86,.93,1.)*calm*step(.9975,s)*(.5+.5*sin(uT*1.7+s*90.))*uStars*(1.-uv.y*.55)*.8;vec2 g2=floor(gl_FragCoord.xy/9.);float s2=hs(g2+3.);vec2 f2=fract(gl_FragCoord.xy/9.)-.5-(vec2(hs(g2+1.),hs(g2+2.))-.5)*.5;c+=mix(vec3(1.,.9,.78),vec3(.8,.9,1.),hs(g2+5.))*calm*step(.975,s2)*exp(-dot(f2,f2)*26.)*(.6+.4*sin(uT*1.1+s2*50.))*uStars*(1.-uv.y*.4);float mw=fbm(vec2(uv.x*2.6-uv.y*2.2+1.,uv.y*2.4+uv.x*1.2));c+=vec3(.2,.27,.4)*mw*mw*mw*.9*uStars*smoothstep(.95,.2,uv.y);}
if(uRidge>0.01){float r2=.80-.05*fbm(vec2(uv.x*2.2+9.,1.))-.02*n(vec2(uv.x*9.,3.));c=mix(c,mix(uTop,uHorC,.3)*.75,smoothstep(r2-.003,r2+.003,uv.y)*uRidge*.9);float r1=.88-.07*fbm(vec2(uv.x*3.1,2.))-.025*n(vec2(uv.x*13.,5.));c=mix(c,uTop*.5,smoothstep(r1-.003,r1+.003,uv.y)*uRidge);}
if(uCity>0.01){for(int l=0;l<3;l++){float fl=float(l);float sz=.032+fl*.03;vec2 q=vec2(uv.x*asp+uShift*(.35+fl*.5)+fl*3.1,uv.y);vec2 id=floor(q/sz);float r=h(id+fl*17.);vec2 ce=(id+.5+(vec2(h(id+3.),h(id+9.))-.5)*.6)*sz;float dd=distance(q,ce)/sz;float band=smoothstep(.42,.58,uv.y)*smoothstep(.97,.82,uv.y);float on=step(.66-fl*.07,r);vec3 lc=mix(vec3(1.,.74,.42),vec3(.62,.8,1.),step(.78,h(id+5.)));c+=lc*smoothstep(.4,.16+fl*.06,dd)*on*band*mix(.2,1.,calm)*uCity*(.26+fl*.12)*(.6+.4*h(id+11.));}
c+=vec3(.9,.6,.4)*exp(-abs(uv.y-.92)*9.)*.25*uCity*mix(.5,1.,calm);}
c+=(h(gl_FragCoord.xy+fract(uT))-.5)*.022;gl_FragColor=vec4(c,1.);}`,
  [
    'uTop',
    'uBot',
    'uSunC',
    'uHorC',
    'uSun',
    'uSunR',
    'uGlow',
    'uStars',
    'uCity',
    'uHor',
    'uHorY',
    'uHaze',
    'uShift',
    'uRidge',
    'uBox0',
    'uBox1',
    'uBox2',
    'uBoxK',
    'uHead'
  ],
  glChanged
);
const lit = makeGL(
  $('#lit'),
  `uniform float uBlind,uBeam,uRead,uReadY,uTrain,uShift,uCurS,uInk;uniform vec2 uCur;uniform vec3 uPulse;
void main(){vec2 uv=gl_FragCoord.xy/uR;uv.y=1.-uv.y;float asp=uR.x/uR.y;vec2 q=vec2(uv.x*asp,uv.y);float a=0.;vec3 add=vec3(0.);vec3 sc=vec3(.04,.11,.14);
if(uBlind>0.01){float d1=uv.x*.72+uv.y*.6;float patch=smoothstep(.14,.4,d1)*smoothstep(1.2,.94,d1);float s=uv.y*5.2+q.x*1.3+sin(uT*.25)*.04;float slat=smoothstep(.02,.36,abs(fract(s)-.5));float keep=smoothstep(.2,.52,length((uv-vec2(.47,.5))*vec2(1.25,.9)));a+=patch*(1.-slat)*.15*uBlind*keep;sc=mix(sc,vec3(.2,.15,.1),uBlind);}
if(uBeam>0.01){float b=exp(-pow((uv.y-(.12+uv.x*.62))*2.2,2.));a+=(1.-b)*.17*uBeam;sc=mix(sc,vec3(.3,.14,.1),uBeam);}
if(uRead>0.01){float dy=abs(uv.y-uReadY);a+=smoothstep(.16,.52,dy)*.25*uRead;sc=mix(sc,vec3(.32,.16,.08),uRead);}
if(uTrain>0.01){float x=uv.x*.55+uv.y*.12+uShift*.9;float b1=smoothstep(.16,.0,abs(fract(x)-.5))*step(.35,h(vec2(floor(x),1.)));float b2=smoothstep(.05,.0,abs(fract(x*2.3+.3)-.5))*step(.5,h(vec2(floor(x*2.3+.3),2.)));add+=vec3(1.,.86,.62)*(b1*.13+b2*.1)*uTrain;}
float dc=distance(q,vec2(uCur.x*asp,uCur.y));float cl=exp(-dc*dc*9.)*uCurS;add+=vec3(.7,1.,.86)*cl*.2*(1.-uInk);a*=1.-cl*.8;
float dp=distance(q,vec2(uPulse.x*asp,uPulse.y));add+=vec3(1.,.86,.5)*exp(-dp*dp*5.)*uPulse.z;
a=clamp(a,0.,.7);vec3 c=max(sc*a+add+(h(gl_FragCoord.xy+fract(uT*1.3))-.5)*.012*a,0.);
// premultiplied output must never exceed its alpha, or some compositors wrap around
a=clamp(max(a,max(c.r,max(c.g,c.b))),0.,1.);gl_FragColor=vec4(min(c,vec3(a)),a);}`,
  ['uBlind', 'uBeam', 'uRead', 'uReadY', 'uTrain', 'uShift', 'uCurS', 'uCur', 'uPulse', 'uInk'],
  glChanged
);

const FAR = [2, 2, 3, 3];
function drawLight() {
  if (sky && sky.live && !X.covered) {
    for (const k of ['Top', 'Bot', 'SunC', 'HorC']) sky.v3('u' + k, L[k[0].toLowerCase() + k.slice(1)]);
    sky.v2('uSun', L.sun);
    for (const k of ['SunR', 'Glow', 'Stars', 'City', 'Hor', 'HorY', 'Haze', 'Ridge']) sky.f('u' + k, L[k[0].toLowerCase() + k.slice(1)]);
    sky.f('uShift', X.shift + T * 0.05);
    sky.v4('uBox0', X.boxes[0] || FAR);
    sky.v4('uBox1', X.boxes[1] || FAR);
    sky.v4('uBox2', X.boxes[2] || FAR);
    sky.f('uBoxK', X.boxK);
    sky.f('uHead', 60 / vh); // no stars behind the header
    sky.draw();
  }
  if (cssSky && !(sky && sky.live)) drawCssSky();
  if (lit && lit.live) {
    const dark = X.curS * (1 - L.ink);
    const on = L.blind + L.beam + L.read + L.train + dark + X.pulse[2] > 0.01;
    cls(litCv, 'off', !on);
    if (!on) return;
    for (const k of ['Blind', 'Beam', 'Read', 'Train', 'Ink']) lit.f('u' + k, L[k.toLowerCase()]);
    lit.f('uReadY', X.readY);
    lit.f('uShift', X.shift + T * 0.22);
    lit.f('uCurS', X.curS);
    lit.v2('uCur', X.cur);
    lit.v3('uPulse', X.pulse);
    lit.draw();
  }
}
const litCv = $('#lit');

/* ---- leaves: two fixed layers, cross-faded and drifting with the scroll ---- */
const leafWrap = $('.leaves'),
  leafN = $('.leaf--near'),
  leafF = $('.leaf--far');
function leaves() {
  const v = L.leaf * X.veil,
    on = v > 0.01;
  cls(leafWrap, 'on', on);
  if (!on) return;
  const w = Math.sin(T * 0.35),
    k = clamp(G);
  op(leafN, v * (0.17 + 0.05 * w));
  op(leafF, v * (0.22 - 0.05 * w));
  leafN.style.translate = `${(-k * 90).toFixed(1)}px ${(k * 50).toFixed(1)}px`;
  leafF.style.translate = `${(-k * 40).toFixed(1)}px ${(k * 22).toFixed(1)}px`;
}

/* ---- header tone and clock ---- */
const hdr = $('.hdr'),
  tools = $('.tools'),
  clock = $('.clock'),
  clockB = $('.clock b');
function chrome() {
  const ink = L.ink > 0.5;
  const paper = sunUnderHeader();
  const tone = paper ? 'paper' : G >= 5.98 ? 'green' : X.band || !ink ? 'dark' : 'light';
  once(hdr, 'tone', tone, v => (hdr.dataset.tone = v));
  once(tools, 'tone', G > 6.25 ? 'end' : ink && !X.band ? 'light' : 'dark', v => (tools.dataset.tone = v));
  const m = Math.round(L.min) % 1440;
  const s = String((m / 60) | 0).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  once(clockB, 's', s, v => (clockB.textContent = v));
  cls(clock, 'off', G > 6.25);
}

/* ---- pointer ---- */
let px = 0,
  py = 0,
  pOn = false,
  cx = 0.5,
  cy = 0.5;
addEventListener(
  'pointermove',
  e => {
    if (e.pointerType !== 'mouse') return;
    px = e.clientX;
    py = e.clientY;
    pOn = true;
    wake();
  },
  { passive: true }
);

/* the big button leans toward the pointer */
{
  const b = $('.cta-big');
  let bx = 0,
    by = 0;
  addEventListener(
    'pointermove',
    e => {
      if (e.pointerType !== 'mouse' || !live || stopped || G < 5.9) return;
      const r = b.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      const dx = e.clientX - (r.left + r.width / 2 - bx),
        dy = e.clientY - (r.top + r.height / 2 - by);
      const d = Math.hypot(dx, dy),
        k = d < 170 ? (1 - d / 170) * 0.32 : 0;
      bx = dx * k;
      by = dy * k;
      tf(b, `translate3d(${bx.toFixed(1)}px,${by.toFixed(1)}px,0)`);
    },
    { passive: true }
  );
}

/* ---- reveal on enter (the last section is in normal flow) ---- */
$$('.end__h,.kit>*,.more').forEach(el => {
  el.dataset.rv = '';
  el.style.setProperty('--rv', el.matches('.kit>*') ? [...el.parentNode.children].indexOf(el) + 1 : 0);
});
{
  const io = new IntersectionObserver(
    es =>
      es.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('on');
        io.unobserve(e.target);
      }),
    { rootMargin: '0px 0px -8% 0px' }
  );
  $$('[data-rv]').forEach(el => io.observe(el));
}
$$('.hero__h .ch').forEach((c, i) => c.style.setProperty('--i', i));
$$('.line-a .ch').forEach((c, i) => c.style.setProperty('--i', i));

/* ---- spoken copy: while the film runs its stages are hidden from assistive technology, and the same words
        are placed along the scroll track so that reading order and heading navigation follow the page ---- */
$$('.scene > .stage').forEach(stage => {
  const said = D.createElement('div');
  said.className = 'said';
  const items = $$('h1,h2,p,li', stage).filter(n => !n.closest('[inert],.hint'));
  items.forEach((n, i) => {
    const o = D.createElement('div');
    if (/^H\d$/.test(n.tagName)) {
      o.setAttribute('role', 'heading');
      o.setAttribute('aria-level', n.tagName[1]);
    }
    o.textContent = (n.querySelector('.vh') || n).textContent;
    o.style.top = (i / items.length) * 86 + '%';
    said.append(o);
  });
  stage.before(said);
});

/* ================= engine =================
   Sections are only the scroll track; every .stage is fixed and is shown while its section, plus a lead-in of PRE
   screens, is under the top of the viewport. Nothing intercepts scrolling. */
const PRE = 0.8;
const IDLE = 25000; // ambient light comes to rest after this long without input
const scenes = [];
const endEl = $('#install');
const scene = (sel, o) => {
  const el = $(sel);
  scenes.push(Object.assign({ el, stage: $('.stage', el), i: scenes.length }, o));
};
const SH = {}; // points handed from one scene to the next (button, status pill)

let live = false,
  stopped = false;
let nap = 0,
  raf = 0,
  last = 0,
  amb = 1,
  lastInput = performance.now(),
  busyUntil = 0;
let sy = -1,
  G = 0,
  endTop = 0,
  dawn = 0;

const kick = () => {
  if (live && !raf && !D.hidden) raf = requestAnimationFrame(frame);
};
/* when only the ambient light moves, about 30 frames a second are enough */
const rest = () => {
  if (nap || !live) return;
  nap = setTimeout(() => {
    nap = 0;
    kick();
  }, 26);
};
const wake = () => {
  lastInput = performance.now();
  kick();
};

/* distance into a scene; a scene can play one stretch faster without moving its other moments or its light */
function travelled(s, y, pre) {
  if (!s.more) return y;
  const all = s.h + s.more - pre;
  const a = all * s.cut.from,
    long = all * (s.cut.to - s.cut.from),
    short = long - s.more;
  return y < a ? y : y < a + short ? a + ((y - a) * long) / short : y + s.more;
}

function frame(now) {
  raf = 0;
  if (!live) return;
  const dt = Math.min(now - last, 64);
  const y0 = scrollY;
  const still = stopped || now - lastInput > IDLE;
  const moving = sy !== y0 || now < busyUntil || (pOn && Math.abs(px / vw - cx) + Math.abs(py / vh - cy) > 0.002);
  last = now;
  amb += ((still ? 0 : 1) - amb) * ease(dt, 500);
  if (still && (amb < 0.02 || stopped)) amb = 0;
  cls(R, 'calm', amb === 0);
  T += (dt / 1000) * amb;

  if (sy < 0 || SNAP || stopped || Math.abs(y0 - sy) > vh * 4) sy = y0;
  else sy += (y0 - sy) * ease(dt, 72);
  if (Math.abs(y0 - sy) < 0.4) sy = y0;

  const pre = PRE * vh;
  let g = 0;
  X.covered = X.band = false;
  X.boxK = 0;
  for (const s of scenes) {
    const y = travelled(s, sy - s.top, pre),
      h = s.h + s.more,
      vis = y > -pre - 1 && y < h;
    if (y >= 0) g = s.i + clamp(y / (s.i === scenes.length - 1 ? dawn - s.top : h));
    if (s.vis !== vis) {
      s.vis = vis;
      s.stage.style.visibility = vis ? 'visible' : 'hidden';
      if (!vis && s.leave) s.leave();
    }
    if (!vis) continue;
    X.haze = X.low = 0;
    s.update(clamp(y / (h - pre)), s.i ? clamp(1 + y / pre) : 1, clamp((y - (h - pre)) / pre), now, dt);
    /* what passes behind the header dissolves into the sky, so that no text runs into the brand */
    cls(s.stage, 'haze', X.haze + X.low > 0.01);
    if (X.haze + X.low > 0.01) {
      once(s.stage, 'haze', X.haze.toFixed(2), v => s.stage.style.setProperty('--haze', v));
      once(s.stage, 'low', X.low.toFixed(2), v => s.stage.style.setProperty('--low', v));
    }
  }
  if (sy > dawn) g = 6 + clamp((sy - dawn) / (vh * 1.1)) * 0.6;
  G = g;
  lightAt(g);
  if (pOn) {
    const k = ease(dt, 110);
    cx += (px / vw - cx) * k;
    cy += (py / vh - cy) * k;
    X.cur[0] = cx;
    X.cur[1] = cy;
    X.curS += (1 - X.curS) * ease(dt, 300);
  }
  sunrise();
  chrome();
  leaves();
  drawLight();
  if (moving || sy !== y0) kick();
  else if (amb > 0) rest();
}

function measure() {
  const at = live && scenes[0].h ? place() : null;
  vw = R.clientWidth;
  vh = scenes[0].stage.clientHeight || innerHeight;
  phone = vw <= 760;
  tablet = !phone && vw <= 1100;
  tall = tablet && vh >= vw;
  if (sky && sky.live) sky.size(phone ? 0.5 : 0.4);
  if (lit && lit.live) lit.size(phone ? 0.6 : 0.5);
  for (const s of scenes) {
    const r = s.el.getBoundingClientRect();
    s.top = r.top + scrollY;
    s.h = r.height;
    s.more = s.cut ? (r.height / s.cut.len) * s.cut.by : 0;
  }
  endTop = endEl.getBoundingClientRect().top + scrollY;
  dawn = endTop - vh * 0.5;
  sunTop = endTop + sun.offsetTop;
  sunR = sun.offsetHeight / 2;
  if (at) {
    const y = scenes[at.i] ? scenes[at.i].top + scenes[at.i].h * at.k : endTop + at.k;
    if (Math.abs(y - scrollY) > 4) scrollTo(0, y);
  }
  for (const s of scenes) {
    s.stage.style.visibility = 'hidden';
    if (s.layout) s.layout();
    s.vis = undefined;
  }
  sy = -1;
  wake();
}
/* where we are, independent of the size of the screen */
function place() {
  const y = scrollY;
  for (const s of scenes) if (y < s.top + s.h && y < endTop) return { i: s.i, k: clamp((y - s.top) / s.h) };
  return { i: scenes.length, k: y - endTop };
}

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

/* ============ 3. now: いま ============ */
(() => {
  const el = $('#now'),
    flood = $('.flood', el),
    bands = $('.bands', el),
    bs = $$('.band', el),
    nums = $$('.band__n', el),
    labs = $$('.band__l', el),
    deep = $$('.band__d', el),
    h = $('.now__h', el),
    after = $('.now__after', el),
    hw = $('.homewrap', el),
    home = $('.home', el),
    cards = [$('.h-st', el), $('.h-ms', el), $('.h-act', el)],
    sbar = $('.sbar', el),
    pb = $$('.pbar i', el);
  let s, x, y, T, HW, cover;
  scene('#now', {
    layout() {
      reset(hw, home, bands);
      HW = phone ? 390 : tall ? 760 : 1040;
      const HH = home.offsetHeight;
      s = Math.min(
        1.14,
        (vw - (phone ? 24 : tall ? 56 : 80)) / HW,
        (vh - (phone ? (vh < 700 ? 224 : 300) : clamp(vh * 0.31, 170, 270))) / HH
      );
      x = (vw - HW * s) / 2;
      y = phone ? (vh < 700 ? 96 : 170) : 86 + Math.max(0, (vh - (vh < 640 ? 180 : 250) - HH * s) / 2);
      const hr = home.getBoundingClientRect(),
        sr = sbar.getBoundingClientRect();
      T = { x: x + (sr.left - hr.left) * s, y: y + (sr.top - hr.top) * s, w: sr.width * s, h: sr.height * s };
      nums.forEach(n => (n.style.transformOrigin = '0 100%'));
    },
    update(p, intro, outro) {
      /* the status pill of the last scene floods the frame, then the other statuses rise through it */
      const P = SH.pill || [vw * 0.6, vh * 0.2],
        fo = p < 0.2;
      flood.style.visibility = fo ? 'inherit' : 'hidden';
      cover = (Math.hypot(Math.max(P[0], vw - P[0]), Math.max(P[1], vh - P[1])) * 2.02) / 100;
      const wide = lerp(0.22, cover, E.in2(seg(intro, 0, 0.9)));
      if (fo) tf(flood, `translate3d(${P[0].toFixed(1)}px,${P[1].toFixed(1)}px,0) scale(${(wide / 6).toFixed(4)})`);
      const q = p + (intro - 0.92) * 0.17; // the other statuses start to rise just before the flood has settled
      op(bands, intro > 0.915 ? 1 - seg(p, 0.565, 0.585) : 0);
      bs.forEach((b, i) => {
        const g = i === 1 ? 1 : E.out5(seg(q, i * 0.012, 0.085 + i * 0.012));
        tf(b, `scale(1,${g.toFixed(4)})`);
        const cnt = E.out(seg(p, 0.01 + i * 0.02, 0.16 + i * 0.02)),
          n = Math.round(cnt * +nums[i].dataset.n);
        once(nums[i], 'n', n, v => (nums[i].textContent = v));
        const f = Math.min(seg(cnt, 0.35, 0.75), 1 - seg(p, 0.385, 0.42));
        op(deep[i], Math.min(seg(p, 0, 0.06), 1 - E.io(seg(p, 0.365, 0.46))));
        op(nums[i], f);
        op(labs[i], f);
        tf(nums[i], `scale(1,${(1 / Math.max(g, 0.25)).toFixed(3)})`);
      });
      op(h, Math.min(seg(p, 0.01, 0.06), 1 - seg(p, 0.35, 0.4)));
      tf(
        h,
        `translate3d(0,${((1 - E.out5(seg(p, 0.01, 0.1))) * 40 - seg(p, 0.06, 0.36) * 7 - E.in2(seg(p, 0.35, 0.4)) * 50).toFixed(1)}px,0)`
      );
      const m = E.io(seg(p, 0.365, 0.56));
      X.band = wide * 50 > Math.hypot(P[0] - 90, P[1] - 30) && p < 0.4; // white header as soon as the colour has reached the brand
      X.covered = intro > 0.92 && p < 0.365;
      tf(
        bands,
        `translate3d(${lerp(0, T.x, m).toFixed(1)}px,${lerp(0, T.y, m).toFixed(1)}px,0) scale(${lerp(1, T.w / vw, m).toFixed(4)},${lerp(1, T.h / vh, m).toFixed(4)})`
      );
      op(sbar, p > 0.565 ? 1 : 0);
      const lay = E.in2(outro),
        cr = E.io(seg(p, 0.6, 0.95));
      tf(hw, `translate3d(${x.toFixed(1)}px,${(y + lay * vh * 0.5).toFixed(1)}px,0) scale(${(s * lerp(1, 1.05, cr)).toFixed(4)})`);
      tf(
        home,
        `translate3d(${(-HW * 0.025 * cr).toFixed(1)}px,0,0) rotateX(${(lay * 58).toFixed(2)}deg) rotateY(${lerp(7, 0, cr).toFixed(2)}deg)`
      );
      cards.forEach((c, i) => {
        const a = seg(p, 0.43 + [0, 0.045, 0.05][i], 0.56 + [0, 0.045, 0.05][i]);
        op(c, a * (1 - outro * 3.3));
        tf(c, `translate3d(0,${((1 - E.out5(a)) * 50).toFixed(1)}px,0)`);
      });
      pb.forEach(b => tf(b, `scaleX(${+b.style.getPropertyValue('--w') * E.out5(seg(p, 0.66, 0.8))})`));
      const a = seg(p, 0.78, 0.86);
      op(after, a * (1 - outro * 4));
      tf(after, `translate3d(0,${((1 - E.out(a)) * 24).toFixed(1)}px,0)`);
    }
  });
})();

/* ============ 4. wiki: 書いて、読まれる ============
   One sheet, written in 「並べて表示」 (source | live preview), saved with ⌘+Enter, then read. On narrow and upright
   screens the theme hides the split view, so there the same story plays with the 編集 / プレビュー tabs.
   While editing, the editor is a window of the screen's height: both panes are clipped to it and scrolled to the
   line being worked on; once saved, the clip opens and the preview is the whole page. */
(() => {
  const el = $('#wiki'),
    wrap = $('.sheetwrap', el),
    wk = $('.wk', el),
    bg = $('.wk__bg', el),
    bar = $('.wk__bar', el),
    body = $('.wk__body', el),
    src = $('.wk__src', el),
    sheet = $('.sheet', el),
    st = $('.wk__st', el),
    ok = $('.wk__ok', el),
    foot = $('.wk__foot', el),
    meta = $('.wk__meta', el),
    tools = $('.wk__tools', el),
    hl = $('.wk__hl', el),
    mk = $('.mk i', el),
    h = $('.wiki__h', el),
    sub = $('.wiki__s', el),
    after = $('.wiki__after', el);
  const lines = $$('.tln', src),
    tys = $$('.ty', src),
    xs = $$('.x', src),
    ins = $$('.ins', src),
    carets = $$('.caret', src),
    pv = $$('.pv', sheet),
    cbs = $$('.tasks .cb', sheet).slice(0, 2),
    go = $('.wk__go', el),
    keys = $$('kbd', foot);
  const TYPE = ['c0', 'c1', 'c2', 'c7'];
  let two, stack, sr, SHh, SRH, vis, srcOff, shOff, sA, aX, aY, sB, bX, bY, travel;

  /* the moments of the edit. Split view: the panes scroll back to the top before the emphasis is added.
     Tabs: the preview opens at the top (emphasis), then scrolls down to the ticked tasks. */
  const at = k => 0.03 + k * 0.022;
  const T2 = { chk: [0.14, 0.165], tick: [0.155, 0.18], back: [0.19, 0.22], ins: [0.21, 0.235], mark: [0.25, 0.29], save: 0.3 };
  const T1 = {
    chk: [0.14, 0.155],
    ins: [0.17, 0.185],
    tab: 0.2,
    mark: [0.215, 0.25],
    down: [0.25, 0.28],
    tick: [0.275, 0.29],
    save: 0.3
  };

  const clip = (e, top, bottom) =>
    once(
      e,
      'clip',
      `${top.toFixed(1)},${bottom.toFixed(1)}`,
      () => (e.style.clipPath = `inset(${top.toFixed(1)}px 0 ${bottom.toFixed(1)}px 0)`)
    );

  scene('#wiki', {
    layout() {
      reset(wrap, wk, src, sheet);
      [src, sheet].forEach(e => (e.style.clipPath = memo(e).clip = ''));
      body.style.height = src.style.minHeight = '';
      stack = phone || tall;
      two = !stack && vw >= 1024;
      wk.classList.toggle('one', !two);
      const W = two ? 600 : phone ? 390 : stack ? Math.min(860, Math.max(640, vw - 72)) : 640;
      wk.style.width = two ? '' : W + 'px';
      const WK = wk.offsetWidth,
        chrome = bar.offsetHeight + foot.offsetHeight,
        pad = two ? 20 : 0;
      let top, winH;
      if (stack) {
        sA = sB = phone ? (vw - 20) / W : Math.min(1.1, (vw - 72) / W);
        sub.style.top = h.offsetTop + h.offsetHeight + 8 + 'px';
        top = sub.offsetTop + sub.offsetHeight + (phone ? 30 : 40);
        winH = vh - top - (phone ? 40 : 96);
      } else {
        sub.style.top = h.offsetTop + h.offsetHeight + 22 + 'px';
        const lim = Math.min(h.offsetLeft, sub.offsetLeft) - Math.max(28, vw * 0.034);
        sA = Math.min(1.1, (lim - 56) / WK);
        top = 96;
        winH = vh - 96 - 96;
        aX = Math.max(20, (lim - WK * sA) / 2 + 6);
        sB = Math.min(1.22, tablet ? 1 : (vw * 0.6) / W, (lim - 28) / W);
        bX = Math.max(20, (lim - W * sB) / 2 + 6);
        bY = Math.max(96, vh * 0.13);
      }
      const bodyH = Math.max(240, winH / sA - chrome);
      body.style.height = bodyH + 'px';
      vis = bodyH - pad * 2;
      src.style.minHeight = vis + 'px';
      sr = rect(sheet, wk.getBoundingClientRect());
      SHh = sheet.offsetHeight;
      SRH = src.offsetHeight;
      /* scroll each pane so that the line being written sits in the lower part of the window */
      srcOff = clamp(lines[3].offsetTop + 30 - vis * 0.72, 0, Math.max(0, SRH - vis));
      shOff = clamp(pv[3].offsetTop + pv[3].offsetHeight + 24 - vis * 0.86, 0, Math.max(0, SHh - vis));
      if (stack) {
        aX = (vw - WK * sA) / 2 + sr.x * sA;
        aY = bY = top + sr.y * sA;
        bX = aX;
        /* the page keeps the scroll it had in the preview; the reading then goes on to its foot */
        const t0 = aY - shOff * sA;
        travel = Math.max(0, t0 + SHh * sA - vh + 72);
        if (SHh * sA <= vh - 98) travel = Math.max(travel, t0 - 84);
      } else {
        aX += sr.x * sA;
        aY = top + sr.y * sA;
        travel = Math.max(0, SHh * sB - (vh - bY) + 56, bY - 84, bY + SHh * sB - vh * 0.62);
      }
    },
    leave() {
      X.readY = 0.45;
    },
    update(p, intro, outro) {
      const T = two ? T2 : T1,
        i = E.out5(seg(intro, 0.25, 1)),
        o = E.in2(outro);

      /* camera: the position of the preview sheet on screen, and its scale */
      const cam = stack ? 0 : E.io(seg(p, 0.33, 0.5)),
        rel = two ? cam : seg(p, 0.31, 0.38),
        read = E.io(stack ? seg(p, 0.3, 1) : seg(p, 0.5, 1)),
        s = lerp(sA, sB, cam),
        px = lerp(aX, bX, cam),
        py = lerp(aY, bY, cam) - travel * read;
      tf(
        wrap,
        `translate3d(${(px - sr.x * s).toFixed(1)}px,${(py - sr.y * s + (1 - i) * vh * 0.7 + o * vh * 0.25).toFixed(1)}px,0) scale(${s.toFixed(4)})`
      );
      tf(wk, `rotateX(${((1 - i) * 38 - o * 46).toFixed(2)}deg)`);
      op(wk, Math.min(seg(intro, 0.3, 0.6), 1 - seg(outro, 0.05, 0.43)));

      /* typing: the new section and its three tasks */
      lines.forEach((l, k) => {
        op(l, seg(p, at(k) - 0.002, at(k)));
        typed(tys[k], seg(p, at(k), at(k) + 0.02));
      });
      xs.forEach((x, k) => once(x, 'v', p >= T.chk[k], v => (x.style.visibility = v ? '' : 'hidden')));
      ins.forEach((x, k) => once(x, 'v', p >= T.ins[k], v => (x.style.visibility = v ? '' : 'hidden')));
      let c = '';
      lines.forEach((l, k) => {
        if (p >= at(k) - 0.002 && p < at(k) + 0.026) c = TYPE[k];
      });
      if (p >= T.chk[0] - 0.015 && p < T.chk[0] + 0.01) c = 'c3';
      else if (p >= T.chk[1] - 0.012 && p < T.chk[1] + 0.01) c = 'c4';
      else if (p >= T.ins[0] - 0.012 && p < T.ins[0] + 0.008) c = 'c5';
      else if (p >= T.ins[1] - 0.01 && p < T.ins[1] + 0.012) c = 'c6';
      once(src, 'c', c, v => carets.forEach(e => (e.style.display = v && e.classList.contains(v) ? '' : 'none')));

      /* the window onto both panes */
      let so,
        ho,
        sx = 0,
        hx = 0;
      if (two) {
        const back = 1 - E.io(seg(p, T.back[0], T.back[1]));
        so = srcOff * back;
        ho = shOff * back;
      } else {
        const sw = E.out(seg(p, T.tab + 0.004, T.tab + 0.022));
        so = srcOff;
        ho = shOff * E.io(seg(p, T.down[0], T.down[1]));
        cls(bar, 'pvw', p >= T.tab);
        op(src, 1 - sw);
        op(sheet, sw);
        sx = -10 * sw;
        hx = 10 * (1 - sw);
      }
      const shut = 1 - rel;
      clip(src, so, Math.max(0, SRH - so - vis));
      clip(sheet, ho * shut, Math.max(0, SHh - ho - vis) * shut);
      if (two) {
        const gone = seg(p, 0.33, 0.42);
        op(src, 1 - gone);
        sx = -40 * E.in2(gone);
      }
      tf(src, `translate3d(${sx.toFixed(1)}px,${(-so).toFixed(1)}px,0)`);
      tf(sheet, `translate3d(${hx.toFixed(1)}px,${(-ho).toFixed(1)}px,0)`);

      /* preview: follows a beat behind, as the theme's live preview does */
      let busy = false;
      if (two) {
        pv.forEach((e, k) => {
          const d = at(k) + 0.035,
            a = seg(p, d, d + 0.012);
          op(e, a);
          tf(e, `translate3d(0,${((1 - E.out(a)) * 6).toFixed(1)}px,0)`);
          if (p > at(k) + 0.004 && p < d + 0.006) busy = true;
        });
        T.ins.forEach(t => (busy = busy || (p > t && p < t + 0.018)));
      }
      op(st, busy ? 1 : 0);
      cbs.forEach((b, k) => cls(b, 'on', p >= T.tick[k]));
      tf(mk, `scaleX(${E.out(seg(p, T.mark[0], T.mark[1])).toFixed(3)})`);

      /* ⌘+Enter, then 「更新しました。」 */
      cls(keys[0], 'down', p > T.save && p < T.save + 0.03);
      cls(keys[1], 'down', p > T.save + 0.01 && p < T.save + 0.03);
      cls(go, 'down', p > T.save + 0.015 && p < T.save + 0.035);
      op(ok, Math.min(seg(p, T.save + 0.035, T.save + 0.05), 1 - (two ? seg(p, 0.44, 0.46) : seg(p, 0.37, 0.39))));

      /* the editor falls away; the preview stays as the page */
      const gone = two ? seg(p, 0.36, 0.44) : seg(p, 0.35, 0.4);
      [bg, bar, foot].forEach(e => op(e, 1 - gone));
      once(sheet, 'sh', (two ? seg(p, 0.38, 0.5) : gone).toFixed(2), v => sheet.style.setProperty('--sh', v));
      op(meta, two ? seg(p, 0.46, 0.5) : seg(p, 0.36, 0.4));
      const t = two ? Math.min(seg(p, 0.6, 0.64), 1 - seg(p, 0.76, 0.8)) : 0;
      op(tools, t);
      op(hl, t);

      /* words */
      const out = stack ? seg(p, 0.3, 0.4) : seg(p, 0.48, 0.52);
      op(h, Math.min(seg(intro, 0.5, 1), 1 - out, 1 - outro * 3));
      tf(h, `translate3d(0,${((1 - E.out(seg(intro, 0.5, 1))) * 30).toFixed(1)}px,0)`);
      op(sub, Math.min(seg(intro, 0.8, 1), 1 - out, 1 - outro * 3));
      const a = stack ? (tall ? seg(p, 0.72, 0.8) : seg(p, 0.84, 0.92)) : seg(p, 0.54, 0.6);
      op(after, Math.min(a, 1 - outro * 3));
      tf(after, `translate3d(0,${((1 - E.out(a)) * 24).toFixed(1)}px,0)`);

      /* light: what passes behind the header dissolves only once the top of the page has left the screen */
      const pageTop = py - (stack ? ho * s : 0);
      X.haze = seg(60 - pageTop, 0, 100);
      if (tablet && bX < 150) X.low = seg(intro, 0.6, 1) * (1 - outro) * seg(pageTop + SHh * s, vh - 60, vh - 20);
      if (stack && a > 0) X.low = Math.max(X.low, a * (1 - outro));
      const r0 = phone ? 0.42 : 0.3;
      X.readY = lerp(p < 0.5 && !stack ? 0.34 : lerp(r0, phone ? 0.74 : 0.7, read), 0.76, o);
    }
  });
})();

/* ============ 5. train: 帰りの電車 ============ */
(() => {
  const el = $('#train'),
    glass = $('.glass', el),
    pw = $('.phonewrap', el),
    ph = $('.phone', el),
    cols = $('.mcols', el),
    touch = $('.touch', el),
    glare = $('.glare', el),
    ta = $('.train__a', el),
    tb = $('.train__b', el),
    sub = $('.train__s', el);
  let s,
    x,
    y,
    boxes = [];
  const union = bs => [
    Math.min(...bs.map(b => b[0])),
    Math.min(...bs.map(b => b[1])),
    Math.max(...bs.map(b => b[2])),
    Math.max(...bs.map(b => b[3]))
  ];
  const box = e => [e.offsetLeft / vw, e.offsetTop / vh, (e.offsetLeft + e.offsetWidth) / vw, (e.offsetTop + e.offsetHeight) / vh];
  scene('#train', {
    layout() {
      reset(pw, ph, glass);
      if (phone) {
        s = Math.min(1.2, (vh - 250) / 560);
        x = (vw - 300 * s) / 2;
        y = 270;
      } else {
        s = Math.min(1.6, (vh + 70) / 610, tablet ? (vw * 0.56) / 300 : 9);
        x = vw * 0.5 - 150 * s;
        y = vh * 0.1;
      }
      boxes = [[ta, tb].map(box), [box(sub)]];
    },
    leave() {
      X.shift = 0;
    },
    update(p, intro, outro) {
      const i = E.out5(intro),
        o = E.in2(outro),
        a = E.io(seg(p, 0.14, 0.34)),
        b = E.io(seg(p, 0.5, 0.7));
      op(glass, seg(intro, 0.1, 0.7) * (1 - o));
      tf(glass, `scale(${(lerp(1.25, 1, i) + o * 0.8).toFixed(4)})`);
      tf(pw, `translate3d(${x.toFixed(1)}px,${(y + (1 - i) * vh * 0.9 + o * vh * 0.9).toFixed(1)}px,0) scale(${s.toFixed(4)})`);
      tf(
        ph,
        `rotateY(${lerp(phone ? 10 : 16, phone ? -6 : -12, E.io(p)).toFixed(2)}deg) rotateX(${lerp(9, 2, p).toFixed(2)}deg) rotateZ(${lerp(-2.5, 1.5, p).toFixed(2)}deg)`
      );
      tf(cols, `translate3d(${(-(a + b) * 340).toFixed(1)}px,0,0)`);
      X.shift = (a + b) * 1.6 + p * 0.8; // the swipe carries the whole city with it
      glare.style.translate = `${lerp(-70, 70, (p * 1.7 + (a + b) * 0.45) % 1).toFixed(1)}% 0`;
      const g = p < 0.44 ? seg(p, 0.14, 0.34) : seg(p, 0.5, 0.7),
        on = g > 0 && g < 1;
      op(touch, on ? Math.min(seg(g, 0, 0.15), 1 - seg(g, 0.8, 1)) * 0.9 : 0);
      tf(touch, `translate3d(${lerp(235, 60, E.io(g)).toFixed(1)}px,${(330 - Math.sin(g * Math.PI) * 14).toFixed(1)}px,0)`);
      const ti = E.out(seg(p, 0.03, 0.14)),
        f = Math.min(seg(p, 0.035, 0.1), 1 - outro * 2);
      op(ta, f);
      tf(ta, `translate3d(${((1 - ti) * -40).toFixed(1)}px,0,0)`);
      op(tb, Math.min(seg(p, 0.07, 0.135), 1 - outro * 2));
      tf(tb, `translate3d(${((1 - E.out(seg(p, 0.065, 0.17))) * 40).toFixed(1)}px,0,0)`);
      op(sub, Math.min(seg(p, 0.14, 0.2), 1 - outro * 2));
      X.boxes = phone ? [union(boxes[0]), boxes[1][0]] : [...boxes[0], boxes[1][0]];
      X.boxK = f;
    }
  });
})();

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

/* ============ 7. end (normal flow): the sun comes up ============ */
const sun = $('.sun');
let sunTop = 0,
  sunR = 1;
function sunUnderHeader() {
  if (G < 6) return false;
  const edge = sunTop - sy + sunR - Math.sqrt(Math.max(0, sunR * sunR - Math.max(0, vw / 2 - 140) ** 2));
  return edge < 40;
}
function sunrise() {
  const t = clamp((sy - dawn + vh * 0.2) / (vh * 1.05));
  tf(sun, `translate3d(-50%,${lerp(phone ? 190 : 320, 0, E.out(t)).toFixed(1)}px,0)`);
}

/* ================= start: film or static page =================
   The film needs room and the visitor's consent to motion; otherwise the same page is a plain document.
   Both can change while the page is open (resize, zoom, system setting), so switching has to leave no traces. */
const pristine = $$('main, main *')
  .filter(el => !el.matches('.wcol,.said,.said *'))
  .map(el => [el, el.getAttribute('style'), el.getAttribute('class')]);
const words = $$('[data-text],.cnt,.band__n,.trk__v,.clock b').map(el => [el, el.dataset.text || el.textContent]);

function enter() {
  R.classList.add('motion');
  $$('.winwrap,.formwrap,.threadwrap,.homewrap').forEach(w => {
    w.style.height = '';
    w.firstElementChild.removeAttribute('style');
  });
  $$('.scene > .stage').forEach(s => s.setAttribute('aria-hidden', 'true'));
  live = true;
  last = performance.now();
  glChanged();
  measure();
}
function leave() {
  const at = live && place();
  live = false;
  cancelAnimationFrame(raf);
  raf = 0;
  R.classList.remove('motion', 'in', 'calm');
  for (const [el, style, name] of pristine) {
    el.getAnimations().forEach(a => a.cancel());
    el._c = null;
    if (style === null) el.removeAttribute('style');
    else el.setAttribute('style', style);
    if (el.matches('[data-rv]')) continue;
    if (name === null) el.removeAttribute('class');
    else el.setAttribute('class', name);
  }
  words.forEach(([el, s]) => (el.textContent = s));
  [hdr, tools, clock, clockB, leafWrap, leafN, leafF, litCv, R].forEach(el => (el._c = null));
  $('.trk').dataset.t = '1';
  $$('.scene > .stage').forEach(s => s.removeAttribute('aria-hidden'));
  fitStatic();
  if (!at) return;
  here = at.i;
  (scenes[here] ? scenes[here].el : endEl).scrollIntoView();
}
function begin() {
  if (!live) return;
  T0 = performance.now();
  busyUntil = T0 + 4500;
  R.classList.add('in');
  wake();
}
/* the static page remembers the section in view, because a resize moves everything before we hear of it */
let here = 0;
let resizing = 0;
function noteSection() {
  if (live || resizing) return;
  here = scenes.findIndex(s => s.el.getBoundingClientRect().bottom > 80);
  if (here < 0) here = scenes.length;
}
function choose() {
  const want = wantsMotion();
  if (want === live) return;
  if (want) {
    /* come back to the scene that was being read */
    const at = scenes[here];
    enter();
    if (here > 0) scrollTo(0, at ? at.top + at.h * 0.3 : endTop);
    begin();
  } else leave();
  controls();
}

/* ---- stop / start ---- */
const still = $('.still'),
  modeLink = $('.foot__m');
function controls() {
  still.hidden = !live;
  still.setAttribute('aria-pressed', String(stopped));
  still.title = stopped ? '動かす' : '動きを止める';
  R.classList.toggle('stopped', live && stopped);
  modeLink.hidden = reducedMotion.matches || !roomy.matches;
  modeLink.href = QUERY.get('static') === '1' ? './' : '?static=1';
  modeLink.textContent = QUERY.get('static') === '1' ? '動きのあるページで見る' : '動きのないページで見る';
}
try {
  stopped = sessionStorage.getItem('gb-motion') === 'off';
} catch (e) {
  stopped = false;
}
still.addEventListener('click', () => {
  stopped = !stopped;
  try {
    sessionStorage.setItem('gb-motion', stopped ? 'off' : 'on');
  } catch (e) {
    /* storage can be refused; the button still works for this page view */
  }
  controls();
  wake();
});

/* ---- events ---- */
addEventListener('scroll', () => (live ? wake() : noteSection()), { passive: true });
addEventListener('keydown', wake, { passive: true });
D.addEventListener('visibilitychange', () => {
  last = performance.now();
  if (!D.hidden) wake();
});
addEventListener('pageshow', e => e.persisted && wake());
addEventListener('resize', () => {
  clearTimeout(resizing);
  resizing = setTimeout(() => {
    resizing = 0;
    choose();
    if (!live) return fitStatic();
    /* a collapsing browser toolbar changes neither the width nor the large viewport: nothing to do */
    if (R.clientWidth !== vw || scenes[0].stage.clientHeight !== vh) measure();
  }, 140);
});
reducedMotion.addEventListener('change', choose);

/* ---- warm-up: while the visitor is on the hero, show each later stage once, almost transparent, so that its
        layers are rasterised before it is needed ---- */
function warm() {
  if (SNAP || stopped) return;
  const queue = scenes.slice(1);
  const step = () => {
    const s = queue.shift();
    if (!s || !live || scrollY > vh * 0.5) return;
    if (s.vis) return step();
    s.stage.style.opacity = '.012';
    s.stage.style.visibility = 'visible';
    s.update(0.5, 1, 0, performance.now(), 16);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!s.vis) s.stage.style.visibility = 'hidden';
        s.stage.style.opacity = '';
        s.vis = undefined;
        (window.requestIdleCallback || setTimeout)(step, { timeout: 600 });
      })
    );
  };
  setTimeout(step, 1200);
}

if (wantsMotion()) enter();
else leave();
controls();
const fonts = D.fonts && D.fonts.ready ? Promise.race([D.fonts.ready, new Promise(r => setTimeout(r, 1500))]) : Promise.resolve();
fonts.then(() => {
  if (!live) return fitStatic();
  measure();
  begin();
  warm();
});
addEventListener('load', () => (live ? measure() : fitStatic()));
})();
