// Fig. 0: the page, assembling. Each section read seats a module on a small board
// in the corner; the board doubles as a map of the page and powers up when it is complete.

import { cmdToString, render, type Cmd, type Frame } from '../lib/axo';
import { assembly, boardCam, type Glyph, type Slot } from '../lib/scenes';

const STIFF = 150;
const DAMP = 11; // underdamped: a module lands, dips into its socket and settles
const SWAY = 7; // degrees of yaw either side while idle

export function initAssembly(reduced: boolean) {
  const aside = document.querySelector<HTMLElement>('.assembly');
  const hero = document.querySelector<HTMLElement>('#top');
  if (!aside || !hero) return;

  const svg = aside.querySelector<SVGSVGElement>('svg.mini')!;
  const board = aside.querySelector<HTMLButtonElement>('.asm-board')!;
  const links = [...aside.querySelectorAll<HTMLAnchorElement>('.asm-list a')];
  const count = aside.querySelector<HTMLElement>('.asm-count b')!;
  const note = aside.querySelector<HTMLElement>('.asm-note')!;
  const glyphs = aside.dataset.glyphs!.split(' ') as Glyph[];
  const sections = links.map((a) => document.querySelector<HTMLElement>(a.hash));
  const names = links.map((a) => a.textContent!.replace(/^\s*\d+/, '').trim());

  const slots: Slot[] = glyphs.map((glyph) => ({ glyph, p: 0 }));
  const vel = slots.map(() => 0);
  const seated = slots.map(() => false);
  let here = -1;
  let pointing = -1;
  let shown = false;
  const cam = { ...boardCam };

  // a fixed frame around the finished board at both ends of the sway, so nothing rescales while it moves
  const full = glyphs.map((glyph) => ({ glyph, p: 1 }));
  const boxes = [-SWAY, 0, SWAY].map((d) => {
    const c = { ...boardCam, yaw: boardCam.yaw + d };
    return render(assembly(c, full), c).box;
  });
  const x0 = Math.min(...boxes.map((b) => b[0]));
  const y0 = Math.min(...boxes.map((b) => b[1]));
  const x1 = Math.max(...boxes.map((b) => b[0] + b[2]));
  const y1 = Math.max(...boxes.map((b) => b[1] + b[3]));
  const box: Frame['box'] = [x0, y0, x1 - x0, y1 - y0];
  svg.setAttribute('viewBox', box.join(' '));
  svg.style.aspectRatio = `${box[2]} / ${box[3]}`;
  new ResizeObserver(([e]) => {
    if (e.contentRect.width > 0) svg.style.setProperty('--k', String(box[2] / e.contentRect.width));
  }).observe(svg);

  /* drawing */

  function patch(cmds: Cmd[]) {
    const kids = svg.children;
    let same = kids.length === cmds.length;
    for (let i = 0; same && i < cmds.length; i++) if ((kids[i] as SVGElement).dataset.k !== cmds[i].k) same = false;
    if (!same) {
      svg.innerHTML = cmds.map(cmdToString).join('');
      return;
    }
    cmds.forEach((c, i) => {
      const el = kids[i];
      if (c.el === 'path') el.setAttribute('d', c.d!);
      else if (c.el === 'circle') {
        el.setAttribute('cx', String(c.cx));
        el.setAttribute('cy', String(c.cy));
      }
      if (el.getAttribute('class') !== c.cls) el.setAttribute('class', c.cls);
    });
  }

  const paint = () => {
    const lit = pointing >= 0 ? pointing : here;
    patch(render(assembly(cam, slots.map((s, i) => ({ ...s, here: i === lit }))), cam, box).cmds);
  };

  /* list state */

  const sync = () => {
    const lit = pointing >= 0 ? pointing : here;
    links.forEach((a, i) => {
      a.classList.toggle('is-seated', seated[i]);
      a.classList.toggle('is-here', i === lit);
    });
    count.textContent = String(seated.filter(Boolean).length);
  };

  let noteTimer = 0;
  const say = (text: string, ms = 2600) => {
    note.textContent = text;
    aside.classList.add('has-note');
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => aside.classList.remove('has-note'), ms);
  };

  /* motion: springs for seating, a slow sway so the board is never quite still */

  let frame = 0;
  let last = 0;
  let lastPaint = 0;
  const t0 = performance.now();
  const settling = () => slots.some((s, i) => Math.abs(s.p - (seated[i] ? 1 : 0)) > 0.002 || Math.abs(vel[i]) > 0.002);

  const tick = (now: number) => {
    frame = 0;
    const dt = last ? Math.min(0.034, (now - last) / 1000) : 1 / 60;
    last = now;
    slots.forEach((s, i) => {
      const target = seated[i] ? 1 : 0;
      for (let k = 0; k < 4; k++) {
        vel[i] += (-STIFF * (s.p - target) - DAMP * vel[i]) * (dt / 4);
        s.p += vel[i] * (dt / 4);
      }
      if (Math.abs(s.p - target) < 0.002 && Math.abs(vel[i]) < 0.002) {
        s.p = target;
        vel[i] = 0;
      }
    });
    const moving = settling();
    // the sway alone only needs a frame every 50ms
    if (moving || now - lastPaint > 50) {
      cam.yaw = boardCam.yaw + Math.sin(((now - t0) / 1000) * 0.45) * SWAY;
      paint();
      lastPaint = now;
    }
    if (shown && !document.hidden) frame = requestAnimationFrame(tick);
    else last = 0;
  };
  const run = () => {
    if (reduced) {
      slots.forEach((s, i) => (s.p = seated[i] ? 1 : 0));
      paint();
      return;
    }
    if (!frame && shown) frame = requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', run);

  /* seating */

  const seat = (i: number) => {
    if (seated[i]) return;
    seated[i] = true;
    sync();
    run();
    const n = seated.filter(Boolean).length;
    if (n < slots.length) {
      say(`${names[i]} placed`);
      return;
    }
    say('Every part placed', 3200);
    window.setTimeout(() => aside.classList.add('is-done'), 3200);
    // a wave across the board, in reading order
    if (!reduced) slots.forEach((_, k) => window.setTimeout(() => ((vel[k] = -3.2), run()), 900 + k * 90));
  };

  // a section counts as read once enough of it has held the screen for a moment
  const timers = new Map<number, number>();
  const readIO = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = sections.indexOf(e.target as HTMLElement);
        if (i < 0 || seated[i]) continue;
        const enough = e.intersectionRect.height >= Math.min(innerHeight * 0.45, e.boundingClientRect.height * 0.6);
        clearTimeout(timers.get(i));
        if (enough) timers.set(i, window.setTimeout(() => seat(i), 500));
      }
    },
    { threshold: Array.from({ length: 21 }, (_, i) => i / 20) },
  );

  // the section at the middle of the screen is lit on the board
  const hereIO = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const i = sections.indexOf(e.target as HTMLElement);
        if (e.isIntersecting) here = i;
        else if (here === i) here = -1;
      }
      sync();
      if (reduced) paint();
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  sections.forEach((s) => {
    if (!s) return;
    readIO.observe(s);
    hereIO.observe(s);
  });

  /* the board appears once the hero drawing has had the stage */

  new IntersectionObserver(
    ([e]) => {
      const show = e.intersectionRatio < 0.35;
      if (show === shown) return;
      shown = show;
      aside.classList.toggle('is-on', show);
      if (!show) {
        close();
        return;
      }
      if (!svg.childElementCount) {
        paint();
        if (!reduced) {
          svg.classList.add('drawing');
          window.setTimeout(() => svg.classList.remove('drawing'), 1800);
        }
        say('Built as you read', 5200);
      }
      run();
    },
    { threshold: [0, 0.35, 0.6, 1] },
  ).observe(hero);

  /* pointing at the board or the list */

  const point = (i: number) => {
    if (i === pointing) return;
    pointing = i;
    svg.style.cursor = i >= 0 ? 'pointer' : '';
    sync();
    paint();
  };

  const partAt = (x: number, y: number) => {
    const m = svg.getScreenCTM();
    if (!m) return -1;
    const p = new DOMPoint(x, y).matrixTransform(m.inverse());
    const kids = svg.children;
    for (let k = kids.length - 1; k >= 0; k--) {
      const el = kids[k];
      if (!(el instanceof SVGPathElement) || !el.dataset.tag?.startsWith('m')) continue;
      const filled = /\bf-(paper|shade|tint|accent)\b/.test(el.getAttribute('class') ?? '');
      if (filled ? el.isPointInFill(p) : el.isPointInStroke(p)) return Number(el.dataset.tag.slice(1));
    }
    return -1;
  };

  board.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') point(partAt(e.clientX, e.clientY));
  });
  board.addEventListener('pointerleave', () => point(-1));
  links.forEach((a, i) => {
    a.addEventListener('pointerenter', () => point(i));
    a.addEventListener('pointerleave', () => point(-1));
    a.addEventListener('focus', () => point(i));
    a.addEventListener('blur', () => point(-1));
    a.addEventListener('click', () => close());
  });

  const close = () => {
    aside.classList.remove('is-open');
    board.setAttribute('aria-expanded', 'false');
  };
  board.addEventListener('click', (e) => {
    // a module under a mouse pointer goes straight to its section; otherwise the board opens the list
    if ((e as PointerEvent).pointerType === 'mouse' && pointing >= 0) {
      sections[pointing]?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      return;
    }
    const open = !aside.classList.contains('is-open');
    aside.classList.toggle('is-open', open);
    board.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('pointerdown', (e) => {
    if (!aside.contains(e.target as Node)) close();
  });
  aside.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      close();
      board.focus();
    }
  });

  sync();
}
