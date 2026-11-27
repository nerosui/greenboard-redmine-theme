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
  [hdr, tools, clock, clockB, play, leafWrap, leafN, leafF, litCv, R].forEach(el => (el._c = null));
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

/* ---- play: the day runs by itself until the visitor takes the scroll back ---- */
const play = $('.play'),
  playT = $('.play__t'),
  modeLink = $('.foot__m');
const SPEED = 0.5; // screens a second
let auto = false,
  ay = 0,
  aLast = 0;
const atEnd = () => scrollY >= dawn - 4;
const LABEL = {
  off: ['<span class="play__w">時間を</span>進める', 'スクロールしなくても、時間が進みます'],
  on: ['止める', '時間を止める'],
  end: ['<span class="play__w">朝から</span>もう一度', '朝から、もう一度時間を進める']
};
/* called every frame by chrome(); the label only changes when the state does */
function playMark() {
  const st = auto ? 'on' : atEnd() ? 'end' : 'off';
  once(play, 's', st, v => {
    play.dataset.s = v;
    playT.innerHTML = LABEL[v][0];
    play.title = LABEL[v][1];
  });
}
function controls() {
  play.hidden = !live;
  if (!live) auto = false;
  modeLink.hidden = reducedMotion.matches || !roomy.matches;
  modeLink.href = QUERY.get('static') === '1' ? './' : '?static=1';
  modeLink.textContent = QUERY.get('static') === '1' ? '動きのあるページで見る' : '動きのないページで見る';
}
function halt() {
  auto = false;
  playMark();
}
function tick(now) {
  if (!auto || !live) return;
  /* a slow frame still moves the day at its pace; a long gap (a hidden tab) does not jump it */
  const dt = Math.min(now - aLast, 200);
  aLast = now;
  /* the scrollbar was dragged, or the page was moved some other way */
  if (Math.abs(scrollY - Math.round(ay)) > 3) return halt();
  ay = Math.min(dawn, ay + (vh * SPEED * dt) / 1000);
  scrollTo(0, ay);
  if (ay >= dawn) return halt();
  requestAnimationFrame(tick);
}
play.addEventListener('click', () => {
  if (auto) return halt();
  if (atEnd()) scrollTo(0, 0);
  ay = scrollY;
  aLast = performance.now();
  auto = true;
  playMark();
  wake();
  requestAnimationFrame(tick);
});
/* any scrolling of the visitor's own stops the day where it is */
for (const t of ['wheel', 'touchstart', 'keydown'])
  addEventListener(
    t,
    e => {
      if (auto && !(e.target instanceof Node && play.contains(e.target))) halt();
    },
    { passive: true }
  );

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
