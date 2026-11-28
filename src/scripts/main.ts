import { initMatrix } from './matrix';
import { initRace } from './race';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

initRace(reduced);

/* ───────── figures ───────── */

const sizeIO = new ResizeObserver((entries) => {
  for (const e of entries) {
    const svg = e.target as SVGSVGElement;
    const w = e.contentRect.width;
    const vb = svg.viewBox.baseVal;
    if (!(w > 0 && vb.width > 0)) continue;
    svg.style.setProperty('--k', String(vb.width / w));
  }
});

document.querySelectorAll<SVGSVGElement>('svg.axo').forEach((svg) => sizeIO.observe(svg));

/* ───────── work: sticky diagrams and draw-on ───────── */

if (!reduced) initSystemMotion();

function initSystemMotion() {
  const systems = document.querySelector<HTMLElement>('.systems');
  const stage = systems?.querySelector<HTMLElement>('.stage-inner');
  if (!systems || !stage) return;

  const panels = [...systems.querySelectorAll<HTMLElement>('.system')].flatMap((system) => {
    const figure = system.querySelector('figure');
    const svg = figure?.querySelector<SVGSVGElement>('svg.axo');
    return figure && svg ? [{ system, figure, svg }] : [];
  });
  if (!panels.length) return;

  const wide = matchMedia('(min-width: 1101px)');
  let current = panels[0];

  function draw(svg: SVGSVGElement) {
    if (!svg.classList.contains('pre')) return;
    svg.classList.replace('pre', 'drawing');
    const strokes = svg.querySelectorAll('path[pathLength]').length;
    setTimeout(() => svg.classList.remove('drawing'), strokes * 5 + 1700);
  }

  function showCurrent() {
    for (const panel of panels) {
      const on = panel === current;
      panel.system.classList.toggle('is-active', on);
      panel.figure.classList.toggle('on', on);
    }
  }

  const drawObserver = new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting && !target.closest('.stage-fig:not(.on)')) draw(target as SVGSVGElement);
    }
  }, { threshold: 0.25 });

  const sectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.findLast((entry) => entry.isIntersecting);
    const panel = panels.find((entry) => entry.system === visible?.target);
    if (!panel) return;
    current = panel;
    if (!wide.matches) return;
    showCurrent();
    draw(panel.svg);
  }, { rootMargin: '-45% 0px -45% 0px' });

  // Keep the figures with their entries on narrow screens and without JavaScript.
  const place = () => {
    const staged = wide.matches;
    systems.classList.toggle('has-stage', staged);
    for (const panel of panels) {
      panel.figure.classList.toggle('stage-fig', staged);
      (staged ? stage : panel.system).append(panel.figure);
    }
    if (staged) showCurrent();
  };

  place();
  for (const { system, svg } of panels) {
    svg.classList.add('pre');
    drawObserver.observe(svg);
    sectionObserver.observe(system);
  }
  wide.addEventListener('change', place);
}

/* reference chips ↔ figure parts */

function figureFor(el: Element): SVGSVGElement | null {
  return el.closest('figure')?.querySelector<SVGSVGElement>('svg.axo') ?? null;
}

function highlight(svg: SVGSVGElement | null, ref: string | null) {
  if (!svg) return;
  svg.querySelectorAll('.is-hl').forEach((n) => n.classList.remove('is-hl'));
  svg.classList.toggle('has-hl', !!ref);
  svg.dataset.hl = ref ?? '';
  if (!ref) return;
  svg.querySelectorAll<SVGElement>('[data-tag]').forEach((n) => {
    if (n.dataset.tag!.split(' ').includes(ref)) n.classList.add('is-hl');
  });
}

/** the tagged part whose face is under the pointer, tested against the filled SVG geometry */
function partAt(svg: SVGSVGElement, x: number, y: number): string | null {
  const m = svg.getScreenCTM();
  if (!m) return null;
  const p = new DOMPoint(x, y).matrixTransform(m.inverse());
  const kids = svg.children;
  for (let i = kids.length - 1; i >= 0; i--) {
    const el = kids[i];
    if (!(el instanceof SVGPathElement) || !/\bf-(paper|shade|tint|accent|ink)\b/.test(el.getAttribute('class') ?? '')) continue;
    if (!el.isPointInFill(p)) continue;
    return el.dataset.tag?.split(' ').at(-1) ?? null;
  }
  return null;
}

document.querySelectorAll<SVGSVGElement>('svg.axo').forEach((svg) => {
  let at: [number, number] | null = null;
  let frame = 0;
  let clear = 0;
  const set = (ref: string | null) => {
    if (ref === (svg.dataset.hl || null)) return;
    highlight(svg, ref);
    chipsFor(svg, ref);
  };
  const test = () => {
    frame = 0;
    if (!at) return;
    const ref = partAt(svg, ...at);
    if (ref) {
      clearTimeout(clear);
      clear = 0;
      set(ref);
    } else if (svg.dataset.hl && !clear) {
      // crossing a gap between two parts should not flash the whole drawing
      clear = window.setTimeout(() => {
        clear = 0;
        set(null);
      }, 140);
    }
  };
  svg.addEventListener('pointermove', (e) => {
    // reference numerals have their own hover
    if (e.pointerType !== 'mouse' || (e.target as Element).matches('text.num')) return;
    at = [e.clientX, e.clientY];
    if (!frame) frame = requestAnimationFrame(test);
  });
  svg.addEventListener('pointerleave', () => {
    at = null;
    clearTimeout(clear);
    clear = 0;
    set(null);
  });
});

function chipsFor(svg: SVGSVGElement, ref: string | null) {
  svg.closest('figure')?.querySelectorAll<HTMLElement>('[data-ref]').forEach((c) => {
    c.classList.toggle('is-hl', !!ref && c.dataset.ref === ref);
  });
}

document.querySelectorAll<HTMLButtonElement>('.legend button[data-ref]').forEach((chip) => {
  const on = () => {
    const svg = figureFor(chip);
    highlight(svg, chip.dataset.ref ?? null);
    if (svg) chipsFor(svg, chip.dataset.ref ?? null);
  };
  const off = () => {
    const svg = figureFor(chip);
    highlight(svg, null);
    if (svg) chipsFor(svg, null);
  };
  chip.addEventListener('pointerenter', on);
  chip.addEventListener('pointerleave', () => {
    if (document.activeElement !== chip) off();
  });
  chip.addEventListener('focus', on);
  chip.addEventListener('blur', off);
  chip.addEventListener('click', on);
});

document.addEventListener('pointerover', (e) => {
  const t = e.target as Element;
  if (!(t instanceof SVGTextElement) || !t.classList.contains('num')) return;
  const svg = t.ownerSVGElement!;
  const ref = t.dataset.tag?.split(' ')[0] ?? null;
  highlight(svg, ref);
  chipsFor(svg, ref);
  t.addEventListener(
    'pointerleave',
    () => {
      highlight(svg, null);
      chipsFor(svg, null);
    },
    { once: true },
  );
});

/* ───────── fig. 7: paper matrix ───────── */

initMatrix();

/* ───────── fig. 8: experience on a year scale ───────── */

const chart = document.querySelector<HTMLElement>('.chart');
if (chart) {
  // the page is built ahead of time; today is not
  const d = new Date();
  const t0 = Number(chart.dataset.t0);
  const t1 = Number(chart.dataset.t1);
  const today = d.getFullYear() + (d.getMonth() + (d.getDate() - 1) / 31) / 12;
  chart.style.setProperty('--now', String(Math.min(100, ((today - t0) / (t1 - t0)) * 100)));
}

/* ───────── fig. 9 and 10: travel ───────── */

const travel = document.getElementById('travel');
if (travel) {
  const loadMaps = () => import('./globe').then(({ initTravelMaps }) => initTravelMaps(reduced));
  new IntersectionObserver(([entry], observer) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    loadMaps();
  }, { rootMargin: '1000px 0px' }).observe(travel);
}

/* ───────── local time ───────── */

const clock = document.querySelector<HTMLElement>('.clock');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: clock.dataset.tz });
  const set = () => (clock.textContent = `It’s ${fmt.format(new Date())} here.`);
  set();
  setInterval(set, 30_000);
}
