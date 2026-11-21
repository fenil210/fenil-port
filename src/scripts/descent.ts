/* The maths behind Fig. 1: five classic test surfaces and four optimizers with their usual
   update rules. Kept free of the DOM so it can be run and tuned on its own. */

export type Vec = [number, number];

export interface Surface {
  name: string;
  f: (x: number, y: number) => number;
  g: (x: number, y: number) => Vec;
  /** x range, y range */
  box: [number, number, number, number];
  start: Vec;
  /** the global minima */
  mins: Vec[];
  /** draw height as log(1 + f / log) instead of f, for surfaces whose values span many decades; 0 for f itself */
  log: number;
  /** share of the surface drawn below the cut; ground above it is drawn flat (default all, or 99.5% on a log scale) */
  top?: number;
  /** learning rate per optimizer, tuned so each one shows its usual behaviour here */
  lr: Record<OptName, number>;
  /** how many updates one race runs */
  steps: number;
}

export const surfaces: Surface[] = [
  {
    name: 'Rosenbrock function',
    f: (x, y) => (1 - x) ** 2 + 100 * (y - x * x) ** 2,
    g: (x, y) => [-2 * (1 - x) - 400 * x * (y - x * x), 200 * (y - x * x)],
    box: [-2, 2, -1, 3],
    start: [-1.6, 2.4],
    mins: [[1, 1]],
    log: 1,
    lr: { sgd: 0.0009, momentum: 0.0008, rmsprop: 0.01, adam: 0.08 },
    steps: 720,
  },
  {
    // four equal minima; from one start the optimizers end in three of them
    name: 'Himmelblau function',
    f: (x, y) => (x * x + y - 11) ** 2 + (x + y * y - 7) ** 2,
    g: (x, y) => [4 * x * (x * x + y - 11) + 2 * (x + y * y - 7), 2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)],
    box: [-5, 5, -5, 5],
    start: [-0.2, -1.4],
    mins: [
      [3, 2],
      [-2.805118, 3.131312],
      [-3.77931, -3.283186],
      [3.584428, -1.848126],
    ],
    log: 30,
    top: 0.98,
    lr: { sgd: 0.004, momentum: 0.0015, rmsprop: 0.02, adam: 0.1 },
    steps: 280,
  },
  {
    // a funnel ringed with local minima; only momentum carries through them to the centre
    name: 'Ackley function',
    f: (x, y) =>
      -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x * x + y * y))) - Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y))) + Math.E + 20,
    g: (x, y) => {
      const r = Math.sqrt(0.5 * (x * x + y * y));
      const a = r ? (2 * Math.exp(-0.2 * r)) / r : 0;
      const e = Math.PI * Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y)));
      return [x * a + e * Math.sin(2 * Math.PI * x), y * a + e * Math.sin(2 * Math.PI * y)];
    },
    box: [-3, 3, -3, 3],
    start: [2.5, 1.4],
    mins: [[0, 0]],
    log: 0,
    lr: { sgd: 0.02, momentum: 0.006, rmsprop: 0.02, adam: 0.05 },
    steps: 240,
  },
  {
    name: 'Saddle point',
    f: (x, y) => x * x - y * y + 0.25 * y ** 4,
    g: (x, y) => [2 * x, -2 * y + y ** 3],
    box: [-1.8, 1.8, -2.1, 2.1],
    start: [-1.6, 0.002],
    mins: [
      [0, Math.SQRT2],
      [0, -Math.SQRT2],
    ],
    log: 0,
    lr: { sgd: 0.03, momentum: 0.005, rmsprop: 0.015, adam: 0.04 },
    steps: 240,
  },
  {
    name: 'Beale function',
    f: (x, y) => (1.5 - x + x * y) ** 2 + (2.25 - x + x * y * y) ** 2 + (2.625 - x + x * y ** 3) ** 2,
    g: (x, y) => {
      const a = 1.5 - x + x * y;
      const b = 2.25 - x + x * y * y;
      const c = 2.625 - x + x * y ** 3;
      return [2 * a * (y - 1) + 2 * b * (y * y - 1) + 2 * c * (y ** 3 - 1), 2 * a * x + 4 * b * x * y + 6 * c * x * y * y];
    },
    box: [-4.5, 4.5, -4.5, 4.5],
    start: [0.7, 1.4],
    mins: [[3, 0.5]],
    log: 1,
    lr: { sgd: 0.002, momentum: 0.0008, rmsprop: 0.01, adam: 0.08 },
    steps: 460,
  },
];

export type OptName = 'sgd' | 'momentum' | 'rmsprop' | 'adam';
export const optNames: OptName[] = ['sgd', 'momentum', 'rmsprop', 'adam'];

export interface Opt {
  name: OptName;
  p: Vec;
  m: Vec;
  v: Vec;
  t: number;
  path: Vec[];
  done: boolean;
}

export const newOpt = (name: OptName, start: Vec): Opt => ({ name, p: [...start], m: [0, 0], v: [0, 0], t: 0, path: [[...start]], done: false });

/** one update, clipped to 3% of the surface's width the way training clips gradients, so a start on
    a steep wall does not throw an optimizer off the surface; stops one that leaves or settles */
export function step(o: Opt, s: Surface) {
  if (o.done) return;
  const lr = s.lr[o.name];
  const g = s.g(o.p[0], o.p[1]);
  const d: Vec = [0, 0];
  o.t++;
  for (let i = 0; i < 2; i++) {
    if (o.name === 'sgd') d[i] = lr * g[i];
    else if (o.name === 'momentum') {
      o.m[i] = 0.9 * o.m[i] + g[i];
      d[i] = lr * o.m[i];
    } else if (o.name === 'rmsprop') {
      o.v[i] = 0.9 * o.v[i] + 0.1 * g[i] * g[i];
      d[i] = (lr * g[i]) / (Math.sqrt(o.v[i]) + 1e-8);
    } else {
      o.m[i] = 0.9 * o.m[i] + 0.1 * g[i];
      o.v[i] = 0.999 * o.v[i] + 0.001 * g[i] * g[i];
      const mh = o.m[i] / (1 - 0.9 ** o.t);
      const vh = o.v[i] / (1 - 0.999 ** o.t);
      d[i] = (lr * mh) / (Math.sqrt(vh) + 1e-8);
    }
  }
  const [x0, x1, y0, y1] = s.box;
  const cap = 0.03 * (x1 - x0);
  const n = Math.hypot(d[0], d[1]);
  const k = n > cap ? cap / n : 1;
  o.p[0] -= d[0] * k;
  o.p[1] -= d[1] * k;
  const out = !(o.p[0] >= x0 && o.p[0] <= x1 && o.p[1] >= y0 && o.p[1] <= y1);
  if (out) {
    o.p[0] = Math.min(x1, Math.max(x0, o.p[0]));
    o.p[1] = Math.min(y1, Math.max(y0, o.p[1]));
  }
  const last = o.path[o.path.length - 1];
  if (Math.hypot(o.p[0] - last[0], o.p[1] - last[1]) > 1e-4 || out) o.path.push([o.p[0], o.p[1]]);
  const moved = n * k;
  if (out || (o.t > 20 && moved < 1e-6) || o.t >= 2000) o.done = true;
}
