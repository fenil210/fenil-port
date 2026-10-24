import { cmdToString, render, type Cmd, type Frame } from '../lib/axo';
import { figures, type FigureName } from '../lib/scenes';
import { initGlobe } from './globe';
import { initTrace } from './trace';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── theme ───────── */

const themeBtn = document.querySelector<HTMLButtonElement>('.theme');
themeBtn?.addEventListener('click', () => {
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  const next = dark ? 'light' : 'dark';
  const apply = () => {
    root.dataset.theme = next;
    try {
      localStorage.setItem('theme', next);
    } catch {}
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !reduced) doc.startViewTransition(apply);
  else apply();
});

/* ───────── masthead ───────── */

const masthead = document.querySelector<HTMLElement>('.masthead');
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.masthead nav a')];

const onScroll = () => masthead?.classList.toggle('is-scrolled', scrollY > 8);
// the bottom edge of the masthead is the trace of this visit, one span per section (see trace.ts)
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const sectionIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const id = (e.target as HTMLElement).id;
      navLinks.forEach((a) => a.classList.toggle('is-current', a.hash === `#${id}`));
    }
  },
  { rootMargin: '-50% 0px -50% 0px' },
);
document.querySelectorAll('main > section[id]').forEach((s) => sectionIO.observe(s));

/* ───────── figures ───────── */

interface Fig {
  svg: SVGSVGElement;
  name: FigureName;
  box: Frame['box'];
  drawn: boolean;
  /** drawing units per screen pixel */
  k: number;
}

const figs = new Map<SVGSVGElement, Fig>();

const sizeIO = new ResizeObserver((entries) => {
  for (const e of entries) {
    const svg = e.target as SVGSVGElement;
    const w = e.contentRect.width;
    const vb = svg.viewBox.baseVal;
    if (!(w > 0 && vb.width > 0)) continue;
    const f = figs.get(svg);
    if (f) f.k = vb.width / w;
    svg.style.setProperty('--k', String(vb.width / w));
  }
});

function draw(f: Fig) {
  if (f.drawn) return;
  f.drawn = true;
  const svg = f.svg;
  if (reduced) {
    svg.classList.remove('pre');
    return;
  }
  svg.classList.remove('pre');
  svg.classList.add('drawing');
  const n = svg.querySelectorAll('path[pathLength]').length;
  setTimeout(() => svg.classList.remove('drawing'), n * 5 + 1700);
}

const drawIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const f = figs.get(e.target as SVGSVGElement);
      if (f && !f.svg.closest('.stage-fig:not(.on)')) draw(f);
    }
  },
  { threshold: 0.25 },
);

document.querySelectorAll<SVGSVGElement>('svg.axo').forEach((svg) => {
  const f: Fig = {
    svg,
    name: svg.dataset.scene as FigureName,
    box: (svg.dataset.box ?? '').split(' ').map(Number) as Frame['box'],
    drawn: false,
    k: parseFloat(svg.style.getPropertyValue('--k')) || 1,
  };
  figs.set(svg, f);
  svg.classList.add('pre');
  sizeIO.observe(svg);
  drawIO.observe(svg);
});

/* reference chips ↔ figure parts */

function figureFor(el: Element): SVGSVGElement | null {
  const own = el.closest('figure')?.querySelector<SVGSVGElement>('svg.axo');
  if (own) return own;
  const system = el.closest<HTMLElement>('.system');
  if (system) return document.querySelector<SVGSVGElement>(`svg.axo[data-scene="${system.dataset.fig}"]`);
  return el.closest('section')?.querySelector<SVGSVGElement>('svg.axo') ?? null;
}

function highlight(svg: SVGSVGElement | null, ref: string | null) {
  if (!svg) return;
  svg.querySelectorAll('.is-hl').forEach((n) => n.classList.remove('is-hl'));
  svg.classList.toggle('has-hl', !!ref);
  svg.dataset.hl = ref ?? '';
  lift(svg, ref);
  if (!ref) return;
  svg.querySelectorAll<SVGElement>('[data-tag]').forEach((n) => {
    if (n.dataset.tag!.split(' ').includes(ref)) n.classList.add('is-hl');
  });
}

/* the highlighted part lifts out of the drawing on a spring; labels and leaders stay put */

const LIFT = 7; // screen px
const STIFF = 190;
const DAMP = 15; // a little under critical, so the part overshoots and settles
interface Spring {
  y: number;
  v: number;
  t: number;
}
const lifts = new Map<SVGSVGElement, Map<string, Spring>>();
let liftFrame = 0;
let liftLast = 0;

function lift(svg: SVGSVGElement, ref: string | null) {
  if (reduced) return;
  let parts = lifts.get(svg);
  if (!parts) lifts.set(svg, (parts = new Map()));
  parts.forEach((s, r) => (s.t = r === ref ? LIFT : 0));
  if (ref && !parts.has(ref)) parts.set(ref, { y: 0, v: 0, t: LIFT });
  if (!liftFrame) liftFrame = requestAnimationFrame(stepLifts);
}

function applyLift(svg: SVGSVGElement) {
  const parts = lifts.get(svg);
  const k = figs.get(svg)?.k ?? 1;
  svg.querySelectorAll<SVGElement>('[data-tag]:not(.leader):not(text)').forEach((el) => {
    let y = 0;
    for (const t of el.dataset.tag!.split(' ')) y = Math.max(y, parts?.get(t)?.y ?? 0);
    el.style.transform = y > 0.01 ? `translate(0px, ${(-y * k).toFixed(3)}px)` : '';
  });
}

function stepLifts(now: number) {
  const dt = liftLast ? Math.min(0.034, (now - liftLast) / 1000) : 1 / 60;
  liftLast = now;
  let moving = false;
  lifts.forEach((parts, svg) => {
    parts.forEach((s, ref) => {
      for (let i = 0; i < 4; i++) {
        s.v += (-STIFF * (s.y - s.t) - DAMP * s.v) * (dt / 4);
        s.y += s.v * (dt / 4);
      }
      if (Math.abs(s.y - s.t) > 0.02 || Math.abs(s.v) > 0.02) moving = true;
      else {
        s.y = s.t;
        s.v = 0;
        if (!s.t) parts.delete(ref);
      }
    });
    applyLift(svg);
    if (!parts.size) lifts.delete(svg);
  });
  liftFrame = moving ? requestAnimationFrame(stepLifts) : 0;
  if (!moving) liftLast = 0;
}

/** the tagged part whose face is under the pointer, tested against resting geometry so a lifted part never slips out from under it */
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
  const scope = svg.closest('section');
  scope?.querySelectorAll<HTMLElement>('.ref').forEach((c) => {
    const near = figureFor(c) === svg;
    c.classList.toggle('is-hl', !!ref && near && c.dataset.ref === ref);
  });
}

document.querySelectorAll<HTMLElement>('.ref').forEach((chip) => {
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
  chip.addEventListener('pointerleave', off);
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

/* live re-projection for the hero drawing */

function patch(svg: SVGSVGElement, cmds: Cmd[]) {
  const kids = svg.children;
  let same = kids.length === cmds.length;
  for (let i = 0; same && i < cmds.length; i++) if ((kids[i] as SVGElement).dataset.k !== cmds[i].k) same = false;
  if (!same) {
    const hl = svg.dataset.hl || null;
    svg.innerHTML = cmds.map(cmdToString).join('');
    if (hl) highlight(svg, hl);
    if (lifts.has(svg)) applyLift(svg);
    return;
  }
  for (let i = 0; i < cmds.length; i++) {
    const c = cmds[i];
    const el = kids[i];
    if (c.el === 'path') el.setAttribute('d', c.d!);
    else if (c.el === 'circle') {
      el.setAttribute('cx', String(c.cx));
      el.setAttribute('cy', String(c.cy));
    } else {
      el.setAttribute('x', String(c.x));
      el.setAttribute('y', String(c.y));
    }
  }
}

const live = document.querySelector<SVGSVGElement>('svg.axo[data-live]');
if (live && !reduced) {
  const f = figs.get(live)!;
  const def = figures[f.name];
  const base = def.cam;
  const cam = { ...base };
  const target = { yaw: 0, pitch: 0 };
  let visible = true;
  let pointerActive = false;
  const host = live.closest('section') ?? live;

  host.addEventListener('pointermove', (e) => {
    const r = live.getBoundingClientRect();
    const nx = ((e as PointerEvent).clientX - (r.left + r.width / 2)) / innerWidth;
    const ny = ((e as PointerEvent).clientY - (r.top + r.height / 2)) / innerHeight;
    target.yaw = Math.max(-1, Math.min(1, nx * 1.6)) * 9;
    target.pitch = Math.max(-1, Math.min(1, ny * 1.6)) * -4;
    pointerActive = true;
  });
  host.addEventListener('pointerleave', () => {
    pointerActive = false;
    target.yaw = 0;
    target.pitch = 0;
  });

  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(live);

  let last = 0;
  const t0 = performance.now();
  const tick = (now: number) => {
    requestAnimationFrame(tick);
    if (!visible || !f.drawn || live.classList.contains('drawing') || now - last < 33) return;
    last = now;
    const t = (now - t0) / 1000;
    const sway = pointerActive ? 0 : Math.sin(t * 0.35) * 3;
    const ty = base.yaw + target.yaw + sway;
    const tp = base.pitch + target.pitch;
    const dy = ty - cam.yaw;
    const dp = tp - cam.pitch;
    if (Math.abs(dy) < 0.01 && Math.abs(dp) < 0.01) return;
    cam.yaw += dy * 0.08;
    cam.pitch += dp * 0.08;
    patch(live, render(def.build(cam), cam, f.box).cmds);
  };
  requestAnimationFrame(tick);
}

/* ───────── work: sticky stage ───────── */

const systems = [...document.querySelectorAll<HTMLElement>('.system')];
const stageFigs = new Map<string, HTMLElement>();
document.querySelectorAll<HTMLElement>('.stage-fig').forEach((el) => stageFigs.set(el.dataset.fig!, el));
const stageHome = document.querySelector<HTMLElement>('.stage-inner');

function activate(sys: HTMLElement) {
  systems.forEach((s) => s.classList.toggle('is-active', s === sys));
  stageFigs.forEach((el, name) => {
    const on = name === sys.dataset.fig;
    el.classList.toggle('on', on);
    if (on) {
      const svg = el.querySelector<SVGSVGElement>('svg.axo');
      const f = svg && figs.get(svg);
      if (f) draw(f);
    }
  });
}

const sysIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) if (e.isIntersecting) activate(e.target as HTMLElement);
  },
  { rootMargin: '-45% 0px -45% 0px' },
);
systems.forEach((s) => sysIO.observe(s));
if (systems[0]) systems[0].classList.add('is-active');

// on narrow screens each figure moves into its own entry
const narrow = matchMedia('(max-width: 1100px)');
function place() {
  for (const sys of systems) {
    const fig = stageFigs.get(sys.dataset.fig!);
    if (!fig) continue;
    if (narrow.matches) {
      sys.querySelector('.fig-slot')?.append(fig);
      fig.classList.add('on');
    } else stageHome?.append(fig);
  }
  if (!narrow.matches) {
    const active = systems.find((s) => s.classList.contains('is-active')) ?? systems[0];
    if (active) activate(active);
  }
}
narrow.addEventListener('change', place);
place();

/* ───────── fig. 7: paper matrix ───────── */

const matrix = document.querySelector<HTMLElement>('.matrix');
if (matrix) {
  const marks = [...matrix.querySelectorAll<HTMLButtonElement>('.mark')];
  const readout = matrix.querySelector<HTMLElement>('.matrix-readout')!;
  const title = readout.querySelector<HTMLElement>('.readout-title')!;
  const meta = readout.querySelector<HTMLElement>('.readout-meta')!;

  const show = (m: HTMLButtonElement | null) => {
    marks.forEach((x) => x.classList.toggle('is-on', x === m));
    readout.classList.toggle('is-on', !!m);
    if (!m) return;
    title.textContent = m.dataset.title ?? '';
    meta.textContent = m.dataset.meta ?? '';
  };
  marks.forEach((m) => {
    m.addEventListener('pointerenter', () => show(m));
    m.addEventListener('focus', () => show(m));
    m.addEventListener('click', () => show(m));
  });
  matrix.querySelector('.matrix-grid')?.addEventListener('pointerleave', () => show(null));
  matrix.addEventListener('focusout', (e) => {
    if (!matrix.contains((e as FocusEvent).relatedTarget as Node)) show(null);
  });

  if (!reduced) {
    // reveal column by column, the way the papers accumulated
    const order = [...marks].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    order.forEach((m, i) => m.style.setProperty('--i', String(i)));
    matrix.classList.add('pre');
    new IntersectionObserver(
      ([e], io) => {
        if (!e.isIntersecting) return;
        matrix.classList.add('drawing');
        requestAnimationFrame(() => matrix.classList.remove('pre'));
        setTimeout(() => matrix.classList.remove('drawing'), marks.length * 35 + 700);
        io.disconnect();
      },
      { threshold: 0.3 },
    ).observe(matrix);
  }
}

/* ───────── fig. 8: experience on a year scale ───────── */

const chart = document.querySelector<HTMLElement>('.chart');
if (chart) {
  // the page is built ahead of time; today is not
  const d = new Date();
  const t0 = Number(chart.dataset.t0);
  const t1 = Number(chart.dataset.t1);
  const today = d.getFullYear() + (d.getMonth() + (d.getDate() - 1) / 31) / 12;
  chart.style.setProperty('--now', String(Math.min(100, ((today - t0) / (t1 - t0)) * 100)));

  if (!reduced) {
    chart.classList.add('pre');
    new IntersectionObserver(
      ([e], io) => {
        if (!e.isIntersecting) return;
        chart.classList.add('drawing');
        requestAnimationFrame(() => chart.classList.remove('pre'));
        setTimeout(() => chart.classList.remove('drawing'), chart.querySelectorAll('.stint').length * 160 + 1600);
        io.disconnect();
      },
      { threshold: 0.35 },
    ).observe(chart);
  }
}

/* ───────── fig. 9 and 10: travel ───────── */

initGlobe(reduced);

/* ───────── fig. 11: this visit as a trace ───────── */

initTrace();

/* ───────── reveal ───────── */

if (!reduced) {
  const revealIO = new IntersectionObserver(
    (entries, io) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  const groups = ['.section-head', '.principles li', '.rows li', '.papers li', '.recognition li', '.stats > div', '.contact-links li'];
  document.querySelectorAll<HTMLElement>(groups.join(',')).forEach((el) => {
    const i = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    el.style.transitionDelay = `${Math.min(i, 8) * 60}ms`;
    el.classList.add('reveal');
    revealIO.observe(el);
  });
}

/* ───────── rules grow out from where the pointer enters ───────── */

document.querySelectorAll<HTMLElement>('.rows a, .contact-links a').forEach((a) => {
  a.addEventListener('pointerenter', (e) => {
    const r = a.getBoundingClientRect();
    a.style.setProperty('--ox', `${Math.round(e.clientX - r.left)}px`);
  });
});

document.querySelectorAll<HTMLElement>('.hero-links a:not(.btn), .masthead nav a, .more a').forEach((a) => {
  a.addEventListener('pointerenter', (e) => {
    const r = a.getBoundingClientRect();
    a.style.setProperty('--oxp', `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
  });
});

/* ───────── local time ───────── */

const clock = document.querySelector<HTMLElement>('.clock');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: clock.dataset.tz });
  const set = () => (clock.textContent = `It is ${fmt.format(new Date())} in Mumbai right now.`);
  set();
  setInterval(set, 30_000);
}
