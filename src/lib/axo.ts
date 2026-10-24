// A tiny axonometric line renderer.
// Scenes are described in 3D (z up), projected orthographically, depth-sorted
// with a painter's algorithm and emitted as SVG paths styled like patent drawings.
// Runs at build time (static SVG) and in the browser (live re-projection).

export type V3 = readonly [number, number, number];
export type Fill = 'paper' | 'shade' | 'tint' | 'accent' | 'ink' | 'none';
export type Stroke = 'ink' | 'muted' | 'accent' | 'none';

export interface Style {
  fill?: Fill;
  stroke?: Stroke;
  dash?: boolean;
  /** reference numeral(s) this element belongs to, space separated */
  tag?: string;
  /** travelling accent pulse along the line; value is the delay in seconds */
  comet?: number;
  /** stroke weight multiplier */
  w?: number;
}

export type Item =
  | { t: 'face'; pts: V3[]; s: Style; n: V3 }
  | { t: 'hull'; pts: V3[]; s: Style }
  | { t: 'line'; pts: V3[]; s: Style; closed?: boolean }
  | { t: 'dot'; at: V3; r: number; s: Style }
  | { t: 'label'; at: V3; text: string; dx: number; dy: number; s: Style };

export interface Group {
  items: Item[];
  /** sort anchor */
  at: V3;
}
export type Layer = Group[];

export interface Cam {
  yaw: number;
  pitch: number;
}

export interface Cmd {
  k: string;
  el: 'path' | 'circle' | 'text';
  d?: string;
  cx?: number;
  cy?: number;
  r?: number;
  x?: number;
  y?: number;
  text?: string;
  anchor?: 'start' | 'end';
  cls: string;
  tag?: string;
  comet?: number;
  draw?: boolean;
}

export interface Frame {
  cmds: Cmd[];
  box: [number, number, number, number];
}

const DEG = Math.PI / 180;
const r3 = (n: number) => Math.round(n * 1000) / 1000;

interface Proj {
  cy: number;
  sy: number;
  cp: number;
  sp: number;
}

const toProj = (c: Cam): Proj => ({
  cy: Math.cos(c.yaw * DEG),
  sy: Math.sin(c.yaw * DEG),
  cp: Math.cos(c.pitch * DEG),
  sp: Math.sin(c.pitch * DEG),
});

/** returns [screenX, screenY (down), depth (larger = farther)] */
function project(p: V3, c: Proj): [number, number, number] {
  const x1 = p[0] * c.cy - p[1] * c.sy;
  const y1 = p[0] * c.sy + p[1] * c.cy;
  const up = y1 * c.sp + p[2] * c.cp;
  const depth = y1 * c.cp - p[2] * c.sp;
  return [x1, -up, depth];
}

function rotN(n: V3, c: Proj): V3 {
  return [n[0] * c.cy - n[1] * c.sy, n[0] * c.sy + n[1] * c.cy, n[2]];
}

// light comes from the viewer's upper left, fixed to the camera so shading is stable
const LIGHT: V3 = (() => {
  const l: V3 = [-0.55, -0.45, 0.85];
  const m = Math.hypot(...l);
  return [l[0] / m, l[1] / m, l[2] / m];
})();

function hull2d(pts: [number, number][]): [number, number][] {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const cross = (o: number[], a: number[], b: number[]) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: [number, number][] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: [number, number][] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

const pathOf = (pts: [number, number][], closed: boolean) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${r3(p[0])} ${r3(p[1])}`).join('') + (closed ? 'Z' : '');

function classes(s: Style, kind: 'face' | 'line' | 'dot'): string {
  const out: string[] = [];
  if (kind !== 'line') out.push(`f-${s.fill ?? 'paper'}`);
  const stroke = s.stroke ?? (kind === 'dot' ? 'none' : 'ink');
  out.push(`s-${stroke}`);
  if (s.dash) out.push('dash');
  if (s.w && s.w !== 1) out.push(s.w > 1 ? 'heavy' : 'light');
  return out.join(' ');
}

export function render(layers: Layer[], cam: Cam, fixedBox?: Frame['box']): Frame {
  const c = toProj(cam);
  const cmds: Cmd[] = [];
  const labels: Cmd[] = [];
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const grow = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };
  const p2 = (p: V3) => {
    const q = project(p, c);
    grow(q[0], q[1]);
    return [q[0], q[1]] as [number, number];
  };

  layers.forEach((layer, li) => {
    const order = layer
      .map((g, gi) => ({ g, gi, depth: project(g.at, c)[2] }))
      .sort((a, b) => b.depth - a.depth);
    for (const { g, gi } of order) {
      g.items.forEach((it, ii) => {
        const k = `${li}.${gi}.${ii}`;
        switch (it.t) {
          case 'face': {
            const n = rotN(it.n, c);
            if (-n[1] * c.cp + n[2] * c.sp <= 1e-6) return;
            let s = it.s;
            if ((s.fill ?? 'paper') === 'paper') {
              const lambert = n[0] * LIGHT[0] + n[1] * LIGHT[1] + n[2] * LIGHT[2];
              if (lambert < 0.25) s = { ...s, fill: 'shade' };
            }
            cmds.push({ k, el: 'path', d: pathOf(it.pts.map(p2), true), cls: classes(s, 'face'), tag: s.tag, draw: true });
            return;
          }
          case 'hull': {
            const h = hull2d(it.pts.map(p2));
            cmds.push({ k, el: 'path', d: pathOf(h, true), cls: classes(it.s, 'face'), tag: it.s.tag, draw: true });
            return;
          }
          case 'line': {
            const d = pathOf(it.pts.map(p2), !!it.closed);
            cmds.push({ k, el: 'path', d, cls: classes(it.s, 'line'), tag: it.s.tag, draw: !it.s.dash });
            if (it.s.comet !== undefined) {
              cmds.push({ k: k + 'c', el: 'path', d, cls: 'comet', tag: it.s.tag, comet: it.s.comet });
            }
            return;
          }
          case 'dot': {
            const [x, y] = p2(it.at);
            cmds.push({ k, el: 'circle', cx: r3(x), cy: r3(y), r: it.r, cls: classes(it.s, 'dot'), tag: it.s.tag });
            return;
          }
          case 'label': {
            const [ax, ay] = p2(it.at);
            const lx = ax + it.dx;
            const ly = ay + it.dy;
            grow(lx + Math.sign(it.dx) * 1.1, ly);
            // a soft leader, bowed slightly like a hand-drawn patent lead line
            const mx = (ax + lx) / 2;
            const my = (ay + ly) / 2;
            const len = Math.hypot(lx - ax, ly - ay) || 1;
            const bow = 0.12 * len;
            const qx = mx + (-(ly - ay) / len) * bow;
            const qy = my + ((lx - ax) / len) * bow;
            labels.push({
              k: k + 'l',
              el: 'path',
              d: `M${r3(lx)} ${r3(ly)}Q${r3(qx)} ${r3(qy)} ${r3(ax)} ${r3(ay)}`,
              cls: 'leader',
              tag: it.s.tag ?? it.text,
              draw: true,
            });
            labels.push({
              k: k + 't',
              el: 'text',
              x: r3(lx + (it.dx < 0 ? -0.12 : 0.12)),
              y: r3(ly),
              text: it.text,
              anchor: it.dx < 0 ? 'end' : 'start',
              cls: 'num',
              tag: it.s.tag ?? it.text,
            });
            return;
          }
        }
      });
    }
  });

  const pad = 0.6;
  const box: Frame['box'] = fixedBox ?? [
    r3(minX - pad),
    r3(minY - pad),
    r3(maxX - minX + pad * 2),
    r3(maxY - minY + pad * 2),
  ];
  return { cmds: cmds.concat(labels), box };
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export function cmdToString(c: Cmd, i: number): string {
  const tag = c.tag ? ` data-tag="${c.tag}"` : '';
  const k = ` data-k="${c.k}"`;
  if (c.el === 'circle') return `<circle${k} class="${c.cls}" cx="${c.cx}" cy="${c.cy}" r="${c.r}"${tag}/>`;
  if (c.el === 'text')
    return `<text${k} class="${c.cls}" x="${c.x}" y="${c.y}" text-anchor="${c.anchor}" dominant-baseline="middle"${tag}>${esc(c.text ?? '')}</text>`;
  const style = c.comet !== undefined ? ` style="animation-delay:${c.comet}s"` : c.draw ? ` style="--i:${i}"` : '';
  const len = c.draw || c.comet !== undefined ? ' pathLength="1"' : '';
  return `<path${k} class="${c.cls}" d="${c.d}"${len}${tag}${style}/>`;
}

export const frameToString = (f: Frame) => f.cmds.map(cmdToString).join('');

/* ───────────────────────── primitives ───────────────────────── */

export const g = (at: V3, ...items: (Item | Item[])[]): Group => ({ at, items: items.flat() });

export function boxItems(o: V3, s: V3, st: Style = {}): Item[] {
  const [x, y, z] = o;
  const X = x + s[0],
    Y = y + s[1],
    Z = z + s[2];
  return [
    { t: 'face', pts: [[x, y, z], [X, y, z], [X, y, Z], [x, y, Z]], n: [0, -1, 0], s: st },
    { t: 'face', pts: [[X, y, z], [X, Y, z], [X, Y, Z], [X, y, Z]], n: [1, 0, 0], s: st },
    { t: 'face', pts: [[X, Y, z], [x, Y, z], [x, Y, Z], [X, Y, Z]], n: [0, 1, 0], s: st },
    { t: 'face', pts: [[x, Y, z], [x, y, z], [x, y, Z], [x, Y, Z]], n: [-1, 0, 0], s: st },
    { t: 'face', pts: [[x, y, Z], [X, y, Z], [X, Y, Z], [x, Y, Z]], n: [0, 0, 1], s: { ...st, fill: st.fill === 'shade' ? 'paper' : st.fill } },
  ];
}

export const box = (o: V3, s: V3, st: Style = {}, extra: Item[] = []): Group =>
  g([o[0] + s[0] / 2, o[1] + s[1] / 2, o[2] + s[2] / 2], boxItems(o, s, st), extra);

export function ring(c: V3, r: number, n = 40, a0 = 0, a1 = Math.PI * 2): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r, c[2]]);
  }
  return out;
}

/** vertical cylinder standing on c */
export function cylinder(c: V3, r: number, h: number, st: Style = {}, cam?: Cam, extra: Item[] = []): Group {
  const top: V3 = [c[0], c[1], c[2] + h];
  const items: Item[] = [
    { t: 'hull', pts: [...ring(c, r, 48), ...ring(top, r, 48)], s: { ...st, fill: st.fill ?? 'paper' } },
  ];
  if (cam) {
    // engraving-style shading strokes on the side away from the light
    const base = (-90 + cam.yaw) * DEG;
    for (const off of [28, 44, 58, 70]) {
      const a = base + off * DEG;
      const px = c[0] + Math.cos(a) * r;
      const py = c[1] + Math.sin(a) * r;
      items.push({ t: 'line', pts: [[px, py, c[2] + h * 0.08], [px, py, c[2] + h * 0.92]], s: { stroke: 'muted', w: 0.6, tag: st.tag } });
    }
  }
  items.push({ t: 'face', pts: ring(top, r, 48).slice(0, -1), n: [0, 0, 1], s: { ...st, fill: st.fill === 'shade' ? 'paper' : st.fill } });
  return g([c[0], c[1], c[2] + h / 2], items, extra);
}

export const line = (pts: V3[], s: Style = {}): Item => ({ t: 'line', pts, s });
export const label = (at: V3, text: string, dx: number, dy: number, tag?: string): Item => ({
  t: 'label',
  at,
  text,
  dx,
  dy,
  s: { tag: tag ?? text },
});
export const dot = (at: V3, r: number, s: Style = {}): Item => ({ t: 'dot', at, r, s });

/** deterministic pseudo-random */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** ruled text lines lying on a horizontal plane */
export function textLines(o: V3, w: number, rows: number, gap: number, seed: number, s: Style = { stroke: 'muted', w: 0.8 }): Item[] {
  const rnd = rng(seed);
  const out: Item[] = [];
  for (let i = 0; i < rows; i++) {
    const y = o[1] - i * gap;
    const len = i === rows - 1 ? w * (0.35 + rnd() * 0.3) : w * (0.78 + rnd() * 0.22);
    out.push(line([[o[0], y, o[2]], [o[0] + len, y, o[2]]], s));
  }
  return out;
}

/** thin rectangular plate, origin at its centre */
export const plate = (cx: number, cy: number, z: number, w: number, d: number, t: number, st: Style = {}, extra: Item[] = []) =>
  box([cx - w / 2, cy - d / 2, z], [w, d, t], st, extra);
