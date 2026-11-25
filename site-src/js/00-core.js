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
