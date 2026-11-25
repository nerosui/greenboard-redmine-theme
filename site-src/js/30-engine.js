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
