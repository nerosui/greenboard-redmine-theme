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
