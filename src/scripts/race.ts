/* Fig. 1: four optimizers race down a loss surface.

   The surface is written in its own numbers: each cell of a fine character grid shows a digit of
   the loss at the point of the surface nearest the eye there, so up close it is all digits and from
   a step back it is lit terrain. Tone comes from opacity, not from the shape of the characters:
   light from the surface normal, haze with depth, colour from the loss (the low ground takes the
   accent), and a brighter band wherever the loss crosses a contour level. A blurred copy underneath
   gives the glow.

   Each surface runs one race and holds; then the next surface grows out of it in a ripple that
   starts at the new minimum, flipping the digits as it passes. A click or tap starts the race
   again from that point. On wide screens the digits keep clear of the hero's text. */

import { newOpt, optNames, step, surfaces, type Opt, type OptName, type Surface, type Vec } from './descent';

export const GLYPH: Record<OptName, string> = { sgd: '○', momentum: '◇', rmsprop: '△', adam: '●' };
export const LABEL: Record<OptName, string> = { sgd: 'SGD', momentum: 'Momentum', rmsprop: 'RMSProp', adam: 'Adam' };

const SHADES = 12; // colours from the accent (low loss) to the ink (high)
const LEVELS = 14; // contour levels across the surface's range
const HS = 1; // height of the surface against its half-width
const PITCH = 0.75; // camera elevation, radians
const BASE_YAW = -0.5;
const CAMD = 3.2; // camera distance; also the focal length, so the middle draws at scale 1
const LIGHT = norm([-0.45, 0.6, 0.66]);
const INTRO = 2600;
const RACE = 8500;
const HOLD = 2600;
const MORPH = 2800;
const WAVE = 0.4; // width of the ripple front, as a share of the surface
const RIPPLE = 0.09; // how far the front lifts the ground as it passes

function norm(v: number[]) {
  const l = Math.hypot(...v);
  return v.map((x) => x / l);
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (p: number) => p * p * (3 - 2 * p);

function fmt(v: number) {
  const a = Math.abs(v);
  if (a !== 0 && a < 0.001) return v.toExponential(1);
  return a >= 100 ? v.toFixed(0) : v.toFixed(3);
}

function rgb(css: string): [number, number, number] | null {
  const m = css.trim().match(/^#([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}

/** a digit of v that changes quickly across the surface: its third significant figure */
function digit(v: number) {
  const a = Math.abs(v);
  if (!a || !Number.isFinite(a)) return 0;
  return Math.floor((a / 10 ** Math.floor(Math.log10(a))) * 100) % 10;
}

export function initRace(reduced: boolean) {
  const fig = document.querySelector<HTMLElement>('.race');
  const box = fig?.querySelector<HTMLElement>('.race-art');
  const canvas = box?.querySelector<HTMLCanvasElement>('canvas.race-sharp');
  const glow = box?.querySelector<HTMLCanvasElement>('canvas.race-glow');
  if (!fig || !box || !canvas || !glow) return;
  const ctx = canvas.getContext('2d')!;
  const gctx = glow.getContext('2d')!;
  const nameEl = fig.querySelector<HTMLElement>('.race-name')!;
  const stepEl = fig.querySelector<HTMLElement>('.race-step')!;
  const lossEl = new Map(optNames.map((n) => [n, fig.querySelector<HTMLElement>(`[data-opt="${n}"] .race-loss`)!]));
  const narrow = matchMedia('(max-width: 1100px)');
  const N = narrow.matches ? 181 : 261; // samples per side
  const NN = N * N;

  // canvas and cells, in device pixels
  let W = 0;
  let H = 0;
  let dpr = 1;
  let px = 6;
  let cw = 0;
  let tw = 0;
  let ch = 0;
  let cols = 0;
  let rows = 0;
  let mono = 'monospace';
  let atlas: HTMLCanvasElement | null = null;
  let ink = '#fff';
  let accent = '#88f';
  let paper = '#000';

  // per cell: nearest depth, the sample that won it, and how far it is from the hero's text
  let depth = new Float32Array(0);
  let pick = new Int32Array(0);
  let keep = new Float32Array(0);

  // the surface on an N×N grid: heights in [0, 1] before (A) and after (B) the ripple, what is
  // drawn now, the digit each sample shows, and each sample's distance from where the ripple starts
  let sf: Surface = surfaces[0];
  let si = 0;
  const hA = new Float32Array(NN).fill(0.5);
  const hB = new Float32Array(NN).fill(0.5);
  const cur = new Float32Array(NN).fill(0.5);
  const prog = new Float32Array(NN).fill(1);
  const digA = new Uint8Array(NN);
  const digB = new Uint8Array(NN);
  const dist = new Float32Array(NN);
  let m = 1; // ripple progress, 1 once the surface has settled
  let settled = false;
  let lo = 0;
  let hi = 1;
  const tf = (f: number) => (sf.log ? Math.log1p(Math.max(0, f) / sf.log) : f);

  // projection for the current frame
  let cyw = 1;
  let syw = 0;
  let cx = 0;
  let cy = 0;
  let S = 1;
  let fade = 0;
  let trail = 0;

  // the race
  let opts: Opt[] = [];
  let done = 0;
  let owed = 0;
  let phase: 'intro' | 'race' | 'hold' | 'morph' = 'intro';
  let since = 0;
  let pointer: [number, number] | null = null;
  let probe: Vec | null = null;
  let seen = false;
  let raf = 0;
  let last = 0;
  let shown = 0;
  // where each optimizer's name is drawn, gliding toward its place, and which pairs share a label
  const labelAt = new Map<OptName, [number, number]>();
  let together = new Set<string>();

  const toWorld = (x: number, y: number): [number, number] => {
    const [x0, x1, y0, y1] = sf.box;
    return [-1 + (2 * (x - x0)) / (x1 - x0), -1 + (2 * (y - y0)) / (y1 - y0)];
  };

  /** the next surface becomes the target; what is drawn now is where the ripple starts from */
  function load(i: number) {
    hA.set(cur);
    digA.set(digB);
    si = i;
    sf = surfaces[i];
    const [x0, x1, y0, y1] = sf.box;
    const vals = new Float32Array(NN);
    for (let j = 0; j < N; j++)
      for (let k = 0; k < N; k++) {
        const f = sf.f(x0 + ((x1 - x0) * k) / (N - 1), y0 + ((y1 - y0) * j) / (N - 1));
        digB[j * N + k] = digit(f);
        vals[j * N + k] = hB[j * N + k] = tf(f);
      }
    // the highest ground is corner walls that would dwarf everything else; it is cut flat
    vals.sort();
    lo = vals[0];
    hi = vals[Math.floor(NN * (sf.top ?? (sf.log ? 0.995 : 1))) - 1];
    for (let k = 0; k < NN; k++) hB[k] = Math.min(1, (hB[k] - lo) / (hi - lo));
    const [ox, oy] = toWorld(sf.mins[0][0], sf.mins[0][1]);
    let far = 0;
    for (let j = 0; j < N; j++)
      for (let k = 0; k < N; k++) far = Math.max(far, (dist[j * N + k] = Math.hypot(-1 + (2 * k) / (N - 1) - ox, -1 + (2 * j) / (N - 1) - oy)));
    for (let k = 0; k < NN; k++) dist[k] /= far;
    nameEl.textContent = sf.name;
    m = 0;
    settled = false;
  }

  /** heights for ripple progress m: each sample turns from A to B as the front passes it */
  function blend() {
    if (m >= 1) {
      if (!settled) {
        cur.set(hB);
        prog.fill(1);
        settled = true;
      }
      return;
    }
    const span = 1 + WAVE;
    for (let k = 0; k < NN; k++) {
      const p = clamp((m * span - dist[k]) / WAVE);
      prog[k] = p;
      cur[k] = hA[k] + (hB[k] - hA[k]) * smooth(p) + RIPPLE * Math.sin(Math.PI * p);
    }
  }

  function start(from = sf.start) {
    opts = optNames.map((n) => newOpt(n, from));
    done = 0;
    owed = 0;
    labelAt.clear();
    together = new Set();
  }

  function run(n: number) {
    for (let k = 0; k < n && done < sf.steps; k++, done++) for (const o of opts) step(o, sf);
  }

  const cp = Math.cos(PITCH);
  const sp = Math.sin(PITCH);
  /** world point to device pixels and depth */
  function project(X: number, Y: number, Z: number): [number, number, number] {
    const x1 = X * cyw - Y * syw;
    const y1 = X * syw + Y * cyw;
    const d = y1 * cp - Z * sp;
    const k = (CAMD / (CAMD + d)) * S;
    return [cx + x1 * k, cy - (Z * cp + y1 * sp) * k, d];
  }

  /** grid position of a surface point, clamped inside the grid */
  function grid(x: number, y: number): [number, number] {
    const [x0, x1, y0, y1] = sf.box;
    return [clamp(((x - x0) / (x1 - x0)) * (N - 1), 0, N - 1.001), clamp(((y - y0) / (y1 - y0)) * (N - 1), 0, N - 1.001)];
  }

  /** the drawn height under a surface point, interpolated, so paths sit on the digits */
  function hAt(x: number, y: number) {
    const [u, v] = grid(x, y);
    const i = u | 0;
    const j = v | 0;
    const fu = u - i;
    const fv = v - j;
    const q = j * N + i;
    return (cur[q] * (1 - fu) + cur[q + 1] * fu) * (1 - fv) + (cur[q + N] * (1 - fu) + cur[q + N + 1] * fu) * fv;
  }

  /** how far the ripple has reached a surface point, 0 to 1 */
  function reached(x: number, y: number) {
    const [u, v] = grid(x, y);
    return smooth(prog[Math.round(v) * N + Math.round(u)]);
  }

  function at(x: number, y: number, lift = 0.012) {
    const [X, Y] = toWorld(x, y);
    return project(X, Y, (hAt(x, y) - 0.5) * HS + lift);
  }

  function cell(sx: number, sy: number) {
    const c = Math.floor(sx / cw);
    const r = Math.floor(sy / ch);
    return c >= 0 && r >= 0 && c < cols && r < rows ? r * cols + c : -1;
  }

  function measure() {
    dpr = Math.min(2, devicePixelRatio || 1);
    const r = box!.getBoundingClientRect();
    W = Math.round(r.width * dpr);
    H = Math.round(r.height * dpr);
    if (!W || !H) return false;
    canvas!.width = W;
    canvas!.height = H;
    glow!.width = Math.round(W / 4);
    glow!.height = Math.round(H / 4);
    const wide = !narrow.matches;
    px = wide ? 6.5 : 5.5;
    mono = getComputedStyle(document.documentElement).getPropertyValue('--mono').trim() || 'monospace';
    ctx.font = `${px * dpr}px ${mono}`;
    cw = ctx.measureText('0').width;
    tw = Math.ceil(cw);
    ch = Math.round(px * 1.15 * dpr);
    cols = Math.floor(W / cw);
    rows = Math.floor(H / ch);
    depth = new Float32Array(cols * rows);
    pick = new Int32Array(cols * rows);
    // right of the copy on wide screens, in the middle on narrow ones
    cx = W * (wide ? 0.743 : 0.5);
    cy = H * (wide ? 0.4 : 0.5);
    S = Math.min(W * (wide ? 0.188 : 0.37), H * (wide ? 0.325 : 0.42));
    keepOut(r, wide);
    paint();
    return true;
  }

  /** per cell, 0 on the hero's text and rising to 1 a little way off it, so no digit sits under a word */
  function keepOut(base: DOMRect, wide: boolean) {
    keep = new Float32Array(cols * rows).fill(1);
    if (!wide) return;
    const pad = 56 * dpr;
    const range = document.createRange();
    for (const el of document.querySelectorAll('.hero-copy > *, .race figcaption')) {
      range.selectNodeContents(el);
      for (const t of range.getClientRects()) {
        const x0 = (t.left - base.left) * dpr;
        const x1 = (t.right - base.left) * dpr;
        const y0 = (t.top - base.top) * dpr;
        const y1 = (t.bottom - base.top) * dpr;
        const c1 = Math.min(cols - 1, Math.ceil((x1 + pad) / cw));
        const r1 = Math.min(rows - 1, Math.ceil((y1 + pad) / ch));
        for (let r = Math.max(0, Math.floor((y0 - pad) / ch)); r <= r1; r++)
          for (let c = Math.max(0, Math.floor((x0 - pad) / cw)); c <= c1; c++) {
            const sx = (c + 0.5) * cw;
            const sy = (r + 0.5) * ch;
            const v = clamp(Math.hypot(Math.max(x0 - sx, 0, sx - x1), Math.max(y0 - sy, 0, sy - y1)) / pad);
            keep[r * cols + c] = Math.min(keep[r * cols + c], smooth(v));
          }
      }
    }
  }

  /** the glyph atlas: every digit in every shade from the accent to the ink */
  function paint() {
    const cs = getComputedStyle(document.documentElement);
    ink = cs.getPropertyValue('--ink').trim();
    accent = cs.getPropertyValue('--accent').trim();
    paper = cs.getPropertyValue('--paper').trim();
    const a0 = rgb(accent);
    const a1 = rgb(cs.getPropertyValue('--ink-2'));
    atlas = document.createElement('canvas');
    atlas.width = tw * 10;
    atlas.height = ch * SHADES;
    const a = atlas.getContext('2d')!;
    a.font = `${px * dpr}px ${mono}`;
    a.textAlign = 'center';
    a.textBaseline = 'middle';
    for (let s = 0; s < SHADES; s++) {
      const t = s / (SHADES - 1);
      a.fillStyle = a0 && a1 ? `rgb(${a0.map((v, i) => Math.round(v + (a1[i] - v) * t)).join(',')})` : t < 0.5 ? accent : ink;
      for (let d = 0; d < 10; d++) a.fillText(String(d), d * tw + tw / 2, s * ch + ch / 2);
    }
  }

  function advance(now: number, dt: number) {
    const t = now - since;
    if (phase === 'intro' || phase === 'morph') {
      m = Math.min(1, t / (phase === 'intro' ? INTRO : MORPH));
      if (phase === 'intro') fade = Math.min(1, t / 500);
      trail = clamp((m - 0.7) / 0.3);
      if (m >= 1) (phase = 'race'), (since = now);
    } else if (phase === 'race') {
      trail = 1;
      owed += (dt * sf.steps) / RACE;
      const n = Math.floor(owed);
      owed -= n;
      run(n);
      if (done >= sf.steps) (phase = 'hold'), (since = now);
    } else {
      trail = clamp((HOLD - t) / 600);
      if (t >= HOLD) {
        load((si + 1) % surfaces.length);
        start();
        phase = 'morph';
        since = now;
        trail = 0;
      }
    }
  }

  function frame(now: number, dt: number) {
    if (!reduced) advance(now, dt);
    blend();
    const yaw = BASE_YAW + (reduced ? 0 : Math.sin(now / 8000) * 0.24);
    cyw = Math.cos(yaw);
    syw = Math.sin(yaw);
    draw(now, dt);
    if (now - shown > 120 || reduced) {
      shown = now;
      readout();
    }
  }

  function draw(now: number, dt: number) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, W, H);
    if (!atlas || !cols) return;
    depth.fill(Infinity);
    pick.fill(-1);

    // splat the surface: the sample nearest the eye wins each cell
    for (let j = 0; j < N; j++) {
      const Y = -1 + (2 * j) / (N - 1);
      for (let i = 0; i < N; i++) {
        const k = j * N + i;
        const [sx, sy, d] = project(-1 + (2 * i) / (N - 1), Y, (cur[k] - 0.5) * HS);
        const q = cell(sx, sy);
        if (q >= 0 && d < depth[q]) {
          depth[q] = d;
          pick[q] = k;
        }
      }
    }

    // shade every covered cell
    const lx = LIGHT[0] * cyw + LIGHT[1] * syw;
    const ly = -LIGHT[0] * syw + LIGHT[1] * cyw;
    const gap = 4 / (N - 1);
    for (let q = 0; q < cols * rows; q++) {
      const k = pick[q];
      if (k < 0 || keep[q] < 0.02) continue;
      const i = k % N;
      const j = (k / N) | 0;
      const h = cur[k];
      const dx = ((cur[j * N + Math.min(N - 1, i + 1)] - cur[j * N + Math.max(0, i - 1)]) * HS) / gap;
      const dy = ((cur[Math.min(N - 1, j + 1) * N + i] - cur[Math.max(0, j - 1) * N + i]) * HS) / gap;
      const lam = Math.max(0, (-dx * lx - dy * ly + LIGHT[2]) / Math.hypot(dx, dy, 1));
      const lum = 0.05 + 0.75 * lam + 0.5 * lam ** 18;
      const fog = 1 - 0.62 * clamp((depth[q] + 1.3) / 2.6);
      // a contour level crossing between this cell and the next one right or down
      const c = q % cols;
      const right = c + 1 < cols ? pick[q + 1] : -1;
      const down = q + cols < cols * rows ? pick[q + cols] : -1;
      const f = Math.floor(h * LEVELS);
      const line = h < 1 && ((right >= 0 && Math.floor(cur[right] * LEVELS) !== f) || (down >= 0 && Math.floor(cur[down] * LEVELS) !== f));
      // a thin ring in the middle of the ripple burns bright in the accent, where the digits flip
      const p = prog[k];
      const front = p > 0 && p < 1 ? Math.exp(-(((p - 0.5) / 0.13) ** 2)) : 0;
      const alpha = Math.min(1, (0.12 + 0.88 * lum) * fog + (line ? 0.32 * fog : 0) + 0.8 * front) * fade * keep[q];
      if (alpha < 0.03) continue;
      const shade = front > 0.4 ? 0 : Math.round(clamp(h / 0.7) ** 0.75 * (SHADES - 1));
      ctx.globalAlpha = alpha;
      ctx.drawImage(atlas, (p < 0.5 ? digA[k] : digB[k]) * tw, shade * ch, tw, ch, Math.round(c * cw), ((q / cols) | 0) * ch, tw, ch);
    }

    // marks and paths add light
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const ring = (x: number, y: number, r: number) => {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    };
    const keepAt = (sx: number, sy: number) => {
      const q = cell(sx, sy);
      return q < 0 ? 0 : keep[q];
    };
    // labels for marks; one whose mark an optimizer is sitting on fades, as the name says it already
    const tags: { text: string; x: number; y: number; col: string; a: number; mark?: [number, number] }[] = [];

    // each global minimum: a ring with a slow pulse going out from it
    const beat = reduced ? 0.45 : (now % 2400) / 2400;
    for (const [mx, my] of sf.mins) {
      const [sx, sy] = at(mx, my, 0.004);
      const a = fade * reached(mx, my) * keepAt(sx, sy);
      if (a < 0.05) continue;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2 * dpr;
      ctx.globalAlpha = a;
      ring(sx, sy, 3.5 * dpr);
      ctx.globalAlpha = a * (1 - beat) * 0.9;
      ring(sx, sy, (3.5 + 16 * beat) * dpr);
      tags.push({ text: 'min', x: sx + 9 * dpr, y: sy + 9 * dpr, col: accent, a, mark: [sx, sy] });
    }

    // the optimizers: a streak of light along each path, brighter toward the head
    const heads: { o: Opt; x: number; y: number; a: number }[] = [];
    if (trail > 0.01) {
      const [s0, s1] = at(opts[0].path[0][0], opts[0].path[0][1]);
      const sa = trail * fade * keepAt(s0, s1);
      ctx.strokeStyle = ink;
      ctx.lineWidth = dpr;
      ctx.globalAlpha = sa * 0.8;
      ring(s0, s1, 3 * dpr);
      tags.push({ text: 'start', x: s0 - 9 * dpr, y: s1 + 11 * dpr, col: ink, a: sa, mark: [s0, s1] });
      // each path is stroked in a few runs, brighter toward the head and dimmer where the surface
      // hides it; one stroke per run, so dense stretches do not pile up into a bar of light
      ctx.globalCompositeOperation = 'source-over';
      ctx.lineWidth = 1.3 * dpr;
      for (const o of opts) {
        ctx.strokeStyle = o.name === 'adam' ? accent : ink;
        const path = o.path;
        const runs = 14;
        let key = -1;
        let prev: [number, number] | null = null;
        for (let p = 0; p < path.length; p++) {
          const [sx, sy, d] = at(path[p][0], path[p][1]);
          const q = cell(sx, sy);
          const dim = q < 0 || depth[q] < d - 0.05 || keep[q] < 0.5;
          const run = Math.floor((p / path.length) * runs);
          const k = run * 2 + (dim ? 1 : 0);
          if (k !== key) {
            if (key >= 0) ctx.stroke();
            key = k;
            ctx.globalAlpha = trail * fade * (0.2 + 0.8 * ((run + 1) / runs) ** 2) * (dim ? 0.3 : 1);
            ctx.beginPath();
            if (prev) ctx.moveTo(prev[0], prev[1]);
            else ctx.moveTo(sx, sy);
          }
          ctx.lineTo(sx, sy);
          prev = [sx, sy];
        }
        if (key >= 0) ctx.stroke();
      }
      ctx.globalCompositeOperation = 'lighter';
      for (const o of opts) {
        const col = o.name === 'adam' ? accent : ink;
        const [hx, hy] = at(o.p[0], o.p[1]);
        const a = trail * fade * keepAt(hx, hy);
        heads.push({ o, x: hx, y: hy, a });
        // the lamp; the optimizer's own mark from the legend goes on top later
        const g = ctx.createRadialGradient(hx, hy, 0, hx, hy, 11 * dpr);
        g.addColorStop(0, col);
        g.addColorStop(1, 'transparent');
        ctx.globalAlpha = a * 0.55;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(hx, hy, 11 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // the glow: the whole frame, small and blurred by CSS, under the sharp one
    gctx.clearRect(0, 0, glow!.width, glow!.height);
    gctx.drawImage(canvas!, 0, 0, glow!.width, glow!.height);

    // marks and labels go on after the glow is taken, so they stay crisp
    ctx.globalCompositeOperation = 'source-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${11 * dpr}px ${mono}`;
    for (const h of heads) {
      ctx.globalAlpha = h.a;
      ctx.fillStyle = h.o.name === 'adam' ? accent : ink;
      ctx.fillText(GLYPH[h.o.name], h.x, h.y);
    }

    // optimizers close together share one block of names, always in legend order, centred on them;
    // a pair joins at 22px and parts at 34px, so one hovering at the edge does not flicker in and out
    const LH = 13 * dpr;
    const root = heads.map((_, i) => i);
    const find = (i: number): number => (root[i] === i ? i : (root[i] = find(root[i])));
    const near = new Set<string>();
    for (let i = 0; i < heads.length; i++)
      for (let j = i + 1; j < heads.length; j++) {
        const key = heads[i].o.name + heads[j].o.name;
        if (Math.hypot(heads[i].x - heads[j].x, heads[i].y - heads[j].y) < (together.has(key) ? 34 : 22) * dpr) {
          near.add(key);
          root[find(j)] = find(i);
        }
      }
    together = near;
    const groups = new Map<number, typeof heads>();
    heads.forEach((h, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), h]));
    const glide = reduced ? 1 : 1 - Math.exp(-dt / 70);
    for (const g of groups.values()) {
      const x = Math.max(...g.map((h) => h.x)) + 11 * dpr;
      const y = g.reduce((s, h) => s + h.y, 0) / g.length - ((g.length - 1) * LH) / 2;
      g.forEach((h, i) => {
        const p = labelAt.get(h.o.name);
        if (!p) labelAt.set(h.o.name, [x, y + i * LH]);
        else (p[0] += (x - p[0]) * glide), (p[1] += (y + i * LH - p[1]) * glide);
      });
    }

    probe = null;
    if (pointer && fade > 0.9) {
      probe = pickAt(pointer[0], pointer[1]);
      if (probe) {
        const [mx, my] = pointer;
        ctx.globalAlpha = 1;
        ctx.strokeStyle = accent;
        ctx.lineWidth = dpr;
        ctx.beginPath();
        ctx.moveTo(mx - 6 * dpr, my);
        ctx.lineTo(mx + 6 * dpr, my);
        ctx.moveTo(mx, my - 6 * dpr);
        ctx.lineTo(mx, my + 6 * dpr);
        ctx.stroke();
        tags.push({ text: `loss ${fmt(sf.f(probe[0], probe[1]))} · click to start here`, x: mx + 12 * dpr, y: my, col: accent, a: 1 });
      }
    }
    canvas!.style.cursor = probe ? 'none' : '';

    ctx.textAlign = 'left';
    ctx.font = `${10 * dpr}px ${mono}`;
    const placed: [number, number, number, number][] = [];
    const label = (text: string, x: number, y: number, col: string, a: number) => {
      const w = ctx.measureText(text).width;
      placed.push([x - 3 * dpr, y - 7 * dpr, x + w + 3 * dpr, y + 7 * dpr]);
      ctx.globalAlpha = a * 0.8;
      ctx.fillStyle = paper;
      ctx.fillRect(x - 3 * dpr, y - 7 * dpr, w + 6 * dpr, 14 * dpr);
      ctx.globalAlpha = a;
      ctx.fillStyle = col;
      ctx.fillText(text, x, y);
    };
    // the names hold their places; other labels step down out of their way
    for (const h of heads) if (h.a >= 0.05) label(LABEL[h.o.name], ...labelAt.get(h.o.name)!, h.o.name === 'adam' ? accent : ink, h.a);
    for (const t of tags) {
      const nearest = t.mark ? Math.min(Infinity, ...heads.map((h) => Math.hypot(h.x - t.mark![0], h.y - t.mark![1]))) : Infinity;
      const a = t.a * clamp((nearest - 12 * dpr) / (24 * dpr));
      if (a < 0.05) continue;
      const w = ctx.measureText(t.text).width;
      let y = t.y;
      const hit = () => placed.some(([x0, y0, x1, y1]) => t.x - 3 * dpr < x1 && t.x + w + 3 * dpr > x0 && y - 7 * dpr < y1 && y + 7 * dpr > y0);
      for (let n = 0; n < 12 && hit(); n++) y += LH;
      label(t.text, t.x, y, t.col, a);
    }
    ctx.globalAlpha = 1;
  }

  /** the surface point drawn at a pixel, if there is one and it is not under the text */
  function pickAt(sx: number, sy: number): Vec | null {
    const q = cell(sx, sy);
    const k = q < 0 ? -1 : pick[q];
    if (k < 0 || keep[q] < 0.5) return null;
    const [x0, x1, y0, y1] = sf.box;
    return [x0 + ((x1 - x0) * (k % N)) / (N - 1), y0 + ((y1 - y0) * ((k / N) | 0)) / (N - 1)];
  }

  function readout() {
    stepEl.textContent = `step ${done}`;
    for (const o of opts) lossEl.get(o.name)!.textContent = fmt(sf.f(o.p[0], o.p[1]));
  }

  function loop(now: number) {
    raf = 0;
    if (!seen) return;
    const dt = Math.min(100, now - last);
    if (dt >= 15) {
      last = now;
      frame(now, dt);
    }
    raf = requestAnimationFrame(loop);
  }

  function kick() {
    if (reduced) frame(performance.now(), 0);
    else if (!raf && seen) {
      last = performance.now();
      raf = requestAnimationFrame(loop);
    }
  }

  const family = getComputedStyle(document.documentElement).getPropertyValue('--mono');
  (document.fonts?.load(`10px ${family}`) ?? Promise.resolve()).then(() => {
    load(0);
    start();
    if (reduced) {
      run(sf.steps);
      m = fade = trail = 1;
      phase = 'hold';
    }
    since = performance.now();
    if (!measure()) return;

    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      kick();
    }).observe(box);

    let size = `${box.clientWidth}x${box.clientHeight}`;
    new ResizeObserver(() => {
      const now = `${box.clientWidth}x${box.clientHeight}`;
      if (now === size) return;
      size = now;
      if (measure()) kick();
    }).observe(box);

    // the theme can change from the toggle or from the system
    const repaint = () => {
      paint();
      kick();
    };
    new MutationObserver(repaint).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', repaint);

    canvas.addEventListener('pointermove', (e) => {
      pointer = e.pointerType === 'mouse' ? [e.offsetX * dpr, e.offsetY * dpr] : null;
      if (reduced) frame(performance.now(), 0);
    });
    canvas.addEventListener('pointerleave', () => {
      pointer = null;
      if (reduced) frame(performance.now(), 0);
    });
    canvas.addEventListener('click', (e) => {
      const p = pickAt(e.offsetX * dpr, e.offsetY * dpr);
      if (!p) return;
      start(p);
      if (reduced) run(sf.steps);
      phase = 'race';
      since = performance.now();
      m = fade = trail = 1;
      kick();
    });
  });
}
