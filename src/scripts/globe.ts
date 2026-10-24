// Fig. 9 and 10 in the browser: the globe turns, follows the legend and the pointer,
// keeps its night side current, and the legend keeps each place's local time.

import { drawGlobe, HOME_VIEW, SIZE, type Atlas } from '../lib/globe';

const SVG_NS = 'http://www.w3.org/2000/svg';

export function initGlobe(reduced: boolean) {
  const fig = document.querySelector<HTMLElement>('.globe');
  if (fig) globe(fig, reduced);
  const map = document.querySelector<HTMLElement>('.india');
  if (map) india(map);
  clocks();
}

function globe(fig: HTMLElement, reduced: boolean) {
  const svg = fig.querySelector<SVGSVGElement>('.globe-svg')!;
  const body = svg.querySelector<SVGGElement>('.globe-body')!;
  const chips = [...fig.querySelectorAll<HTMLElement>('.ref[data-id]')];
  const scratch = document.createElementNS(SVG_NS, 'g');

  let atlas: Atlas | null = null;
  const rot: [number, number] = [...HOME_VIEW];
  let aim: [number, number] | null = null;
  let hot: string | null = null;
  let visible = false;
  let drag: { x: number; y: number; id: number } | null = null;
  const spin = [0, 0];
  let lastInput = -1e9;
  let frame = 0;
  let last = 0;
  const t0 = performance.now();

  // swap in new geometry without recreating nodes, so the pulses on the arcs keep running
  function patch(markup: string) {
    scratch.innerHTML = markup;
    const next = scratch.children;
    const live = body.children;
    const same = next.length === live.length && [...next].every((n, i) => n.tagName === live[i].tagName && n.childElementCount === live[i].childElementCount);
    if (!same) {
      body.replaceChildren(...next);
      return;
    }
    const copy = (from: Element, to: Element) => {
      for (const a of from.attributes) if (to.getAttribute(a.name) !== a.value) to.setAttribute(a.name, a.value);
      if (from.tagName === 'text' && to.textContent !== from.textContent) to.textContent = from.textContent;
      for (let i = 0; i < from.children.length; i++) copy(from.children[i], to.children[i]);
    };
    for (let i = 0; i < next.length; i++) copy(next[i], live[i]);
  }

  const paint = () => {
    if (atlas) patch(drawGlobe(atlas, { rotate: rot, now: new Date(), hot }));
  };

  const centre = (id: string): [number, number] | null => {
    const p = atlas?.places.find((x) => x.id === id);
    return p ? [-p.at[0], Math.max(-40, Math.min(40, -p.at[1]))] : null;
  };

  const tick = (now: number) => {
    frame = 0;
    if (!visible || !atlas) return;
    frame = requestAnimationFrame(tick);
    if (now - last < 33) return;
    last = now;
    if (drag) return;
    const idle = now - lastInput > 4000;
    if (aim) {
      rot[0] += (aim[0] - rot[0]) * 0.09;
      rot[1] += (aim[1] - rot[1]) * 0.09;
    } else if (Math.abs(spin[0]) + Math.abs(spin[1]) > 0.02) {
      rot[0] += spin[0];
      rot[1] = Math.max(-70, Math.min(70, rot[1] + spin[1]));
      spin[0] *= 0.93;
      spin[1] *= 0.93;
    } else if (idle) {
      // drift home, then sway slowly about it
      const sway = reduced ? 0 : Math.sin(((now - t0) / 1000) * 0.12) * 16;
      let d = HOME_VIEW[0] + sway - rot[0];
      d = ((d + 540) % 360) - 180;
      rot[0] += d * 0.03;
      rot[1] += (HOME_VIEW[1] - rot[1]) * 0.03;
    }
    paint();
  };
  const run = () => {
    if (!frame && visible && atlas) frame = requestAnimationFrame(tick);
  };

  // outlines arrive once the section is near
  new IntersectionObserver(
    ([e], io) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      fetch('/geo.json')
        .then((r) => r.json())
        .then((a: Atlas) => {
          atlas = a;
          paint();
          run();
        })
        .catch(() => {});
    },
    { rootMargin: '800px 0px' },
  ).observe(fig);

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    run();
  }).observe(svg);

  // the night side moves even when nothing else does
  setInterval(() => visible && !frame && paint(), 60_000);

  /* pointing */

  const light = (id: string | null) => {
    if (id === hot) return;
    hot = id;
    chips.forEach((c) => c.classList.toggle('is-hl', c.dataset.id === id));
    paint();
  };

  const scale = () => SIZE / svg.getBoundingClientRect().width;
  svg.addEventListener('pointerdown', (e) => {
    if (!atlas) return;
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    aim = null;
    spin[0] = spin[1] = 0;
    svg.setPointerCapture(e.pointerId);
    svg.classList.add('is-dragging');
  });
  svg.addEventListener('pointermove', (e) => {
    if (drag && e.pointerId === drag.id) {
      // degrees per pixel so the surface roughly follows the pointer
      const k = (scale() / 268) * (180 / Math.PI) * 0.8;
      const dx = (e.clientX - drag.x) * k;
      const dy = (e.clientY - drag.y) * k;
      drag.x = e.clientX;
      drag.y = e.clientY;
      rot[0] += dx;
      rot[1] = Math.max(-70, Math.min(70, rot[1] - dy));
      spin[0] = dx;
      spin[1] = -dy;
      lastInput = performance.now();
      paint();
      return;
    }
    if (e.pointerType !== 'mouse') return;
    const t = (e.target as Element).closest('[data-id]') as SVGElement | null;
    light(t?.dataset.id ?? null);
  });
  const release = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    lastInput = performance.now();
    svg.classList.remove('is-dragging');
    run();
  };
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('pointerleave', () => !drag && light(null));

  chips.forEach((chip) => {
    const on = () => {
      light(chip.dataset.id!);
      aim = centre(chip.dataset.id!);
      lastInput = performance.now();
      run();
    };
    const off = () => {
      light(null);
      aim = null;
      lastInput = performance.now() - 2500;
    };
    chip.addEventListener('pointerenter', on);
    chip.addEventListener('pointerleave', off);
    chip.addEventListener('click', on);
  });
}

function india(fig: HTMLElement) {
  const svg = fig.querySelector<SVGSVGElement>('.india-svg');
  const readout = fig.querySelector<HTMLElement>('.matrix-readout');
  if (!svg || !readout) return;
  const title = readout.querySelector<HTMLElement>('.readout-title')!;
  const meta = readout.querySelector<HTMLElement>('.readout-meta')!;
  let on: SVGPathElement | null = null;
  const show = (el: SVGPathElement | null) => {
    if (el === on) return;
    on?.classList.remove('is-on');
    on = el;
    readout.classList.toggle('is-on', !!el);
    if (!el) return;
    // lift it to the top so its outline reads over its neighbours
    el.parentNode!.insertBefore(el, svg.querySelector('.here-ring'));
    el.classList.add('is-on');
    title.textContent = el.dataset.name ?? '';
    meta.textContent = el.dataset.note ?? '';
  };
  svg.addEventListener('pointermove', (e) => show((e.target as Element).closest<SVGPathElement>('path.region')));
  svg.addEventListener('pointerleave', () => show(null));
}

/* local time in every place on the legend, and how far it sits from Mumbai */

function clocks() {
  const els = [...document.querySelectorAll<HTMLTimeElement>('time.tz[data-tz]')];
  if (!els.length) return;
  const minutes = (tz: string, d: Date) => {
    const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(d);
    const v = (t: string) => Number(p.find((x) => x.type === t)?.value);
    return Date.UTC(v('year'), v('month') - 1, v('day'), v('hour'), v('minute')) / 60000;
  };
  const set = () => {
    const d = new Date();
    const home = minutes('Asia/Kolkata', d);
    els.forEach((el) => {
      const tz = el.dataset.tz!;
      el.textContent = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
      const diff = minutes(tz, d) - home;
      const h = Math.floor(Math.abs(diff) / 60);
      const m = Math.abs(diff) % 60;
      el.title = `${diff < 0 ? '−' : '+'}${h}:${String(m).padStart(2, '0')} from Mumbai`;
      el.dateTime = new Date(d.getTime()).toISOString();
    });
  };
  set();
  setInterval(set, 30_000);
}
