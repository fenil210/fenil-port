// The trace figure in the colophon and the masthead's bottom edge: this visit as a trace. Each
// section is a span that runs while it is the one being read; a hidden tab pauses it. Nothing
// leaves the page.

type Seg = [start: number, end: number | null];

const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200]; // seconds

const clock = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 1) return '<1s';
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
};
const tickLabel = (s: number) => (s < 60 ? `${s}s` : s % 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s / 60}m`);

export function initTrace() {
  const fig = document.querySelector<HTMLElement>('.trace');
  const edge = [...document.querySelectorAll<HTMLElement>('.spans li')];
  const rows = [...document.querySelectorAll<HTMLElement>('.trace .span[data-id]')];
  const sections = rows.map((r) => document.getElementById(r.dataset.id!)).filter((s): s is HTMLElement => !!s);
  if (!fig || !sections.length) return;
  // an article's contents list follows along like the edge does
  const followers = sections.map((s) => [...document.querySelectorAll<HTMLElement>(`.spans li[data-id="${s.id}"], .toc li[data-id="${s.id}"]`)]);

  const axis = fig.querySelector<HTMLElement>('.trace-axis')!;
  const rootDur = fig.querySelector<HTMLElement>('.root .span-dur')!;
  const segs = new Map<string, Seg[]>(sections.map((s) => [s.id, []]));
  let current: string | null = null;

  const stop = () => {
    const last = current ? segs.get(current)!.at(-1) : undefined;
    if (last && last[1] === null) last[1] = performance.now();
  };
  const start = () => {
    if (current && !document.hidden) segs.get(current)!.push([performance.now(), null]);
  };
  const read = (id: string | null) => {
    if (id === current) return;
    stop();
    current = id;
    start();
  };
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  /* which section is being read: the one under a line 40% down the window, which slides
     to the bottom over the last stretch of the page so the final sections still get read */

  let frame = 0;
  const measure = () => {
    frame = 0;
    const left = document.documentElement.scrollHeight - innerHeight - scrollY;
    const near = Math.max(0, Math.min(1, 1 - left / (innerHeight * 0.6)));
    const y = innerHeight * (0.4 + 0.6 * near);
    let here: string | null = null;
    sections.forEach((s, i) => {
      const r = s.getBoundingClientRect();
      if (r.top <= y && r.bottom > y) here = s.id;
      const p = Math.max(0, Math.min(1, (y - r.top) / r.height)).toFixed(4);
      followers[i].forEach((el) => {
        el.style.setProperty('--p', p);
        el.classList.toggle('is-here', here === s.id);
      });
    });
    read(here);
  };
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);

  // each span on the edge is as wide as its section is tall
  new ResizeObserver(() => {
    sections.forEach((s, i) => edge[i]?.style.setProperty('flex-grow', String(Math.round(s.offsetHeight))));
    queue();
  }).observe(document.body);

  /* fig. 11 */

  const render = () => {
    const T = performance.now();
    const step = STEPS.find((s) => T / 1000 / s <= 5) ?? STEPS.at(-1)!;
    const pct = (t: number) => ((t / T) * 100).toFixed(3);
    fig.style.setProperty('--step', pct(step * 1000));

    const marks: string[] = [];
    for (let s = 0; s * 1000 <= T * 0.9; s += step) marks.push(`<span style="--x:${pct(s * 1000)}">${tickLabel(s)}</span>`);
    axis.innerHTML = marks.join('');
    rootDur.textContent = clock(T);

    rows.forEach((row) => {
      const list = segs.get(row.dataset.id!) ?? [];
      const track = row.querySelector<HTMLElement>('.track')!;
      while (track.children.length < list.length) track.append(document.createElement('span'));
      let total = 0;
      list.forEach(([a, b], i) => {
        const el = track.children[i] as HTMLElement;
        el.className = b === null ? 'seg is-live' : 'seg';
        el.style.setProperty('--a', pct(a));
        el.style.setProperty('--b', pct(b ?? T));
        total += (b ?? T) - a;
      });
      row.classList.toggle('is-read', total > 0);
      row.querySelector('.span-dur')!.textContent = total > 0 ? clock(total) : '';
    });
  };

  let timer = 0;
  new IntersectionObserver(
    ([e]) => {
      clearInterval(timer);
      if (!e.isIntersecting) return;
      render();
      timer = window.setInterval(render, 1000);
    },
    { rootMargin: '200px 0px' },
  ).observe(fig);

  measure();
}
