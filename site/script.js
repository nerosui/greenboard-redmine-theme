(() => {
  'use strict';

  // Captures swap at 768px, so their alternative text has to follow.
  const wide = window.matchMedia('(min-width: 768px)');
  const captures = [...document.querySelectorAll('img[data-alt-phone]')];
  captures.forEach((img) => { img.dataset.altWide = img.alt; });
  const syncAlt = () => captures.forEach((img) => {
    img.alt = wide.matches ? img.dataset.altWide : img.dataset.altPhone;
  });
  syncAlt();
  wide.addEventListener('change', syncAlt);

  // The double strike draws itself once, when a third of the table is in view.
  const table = document.querySelector('.revision');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (table && !still && 'IntersectionObserver' in window) {
    const draw = () => table.classList.add('is-drawn');
    const fallback = setTimeout(draw, 2000);
    table.classList.add('is-armed');
    const observer = new IntersectionObserver((entries) => {
      clearTimeout(fallback);
      if (!entries.some((entry) => entry.intersectionRatio >= 0.35)) return;
      observer.disconnect();
      draw();
    }, { threshold: 0.35 });
    observer.observe(table);
  }

  // Specimen: one slider sets the width of both cards.
  const specimen = document.querySelector('.specimen');
  if (specimen) {
    const control = specimen.querySelector('.specimen-control');
    const range = control.querySelector('input');
    const readout = control.querySelector('.readout');
    const update = () => {
      specimen.style.setProperty('--w', `${range.value}px`);
      readout.textContent = `${range.value}px`;
      range.setAttribute('aria-valuetext', `${range.value}ピクセル`);
    };
    const fit = () => {
      range.max = Math.min(330, Math.floor(specimen.clientWidth));
      update();
    };
    control.hidden = false;
    specimen.querySelector('.specimen-hint').hidden = false;
    range.addEventListener('input', update);
    window.addEventListener('resize', fit);
    fit();
  }

  // Copy button of the code block.
  const copy = document.querySelector('.copy');
  if (copy && navigator.clipboard) {
    const label = copy.firstElementChild;
    const code = document.querySelector('.code code');
    let timer;
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      await navigator.clipboard.writeText(code.textContent);
      label.textContent = 'コピーしました';
      clearTimeout(timer);
      timer = setTimeout(() => { label.textContent = 'コピー'; }, 2000);
    });
  }
})();
