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
