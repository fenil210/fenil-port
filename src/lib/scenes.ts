// Figure definitions. Every figure is a function of the camera so it can be
// re-projected live in the browser. Numerals follow patent-drawing convention
// and are referenced from the copy.

import {
  box,
  boxItems,
  cylinder,
  dot,
  g,
  label,
  line,
  plate,
  ring,
  rng,
  textLines,
  type Cam,
  type Group,
  type Item,
  type Layer,
  type Style,
  type V3,
} from './axo';

export interface FigureDef {
  cam: Cam;
  build: (cam: Cam) => Layer[];
}

const T = 0.25;

/** cubic bezier through 3D control points */
function curve(a: V3, b: V3, c: V3, d: V3, n = 28): V3[] {
  const out: V3[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const w = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    out.push([0, 1, 2].map((k) => w[0] * a[k] + w[1] * b[k] + w[2] * c[k] + w[3] * d[k]) as unknown as V3);
  }
  return out;
}

const rect = (x: number, y: number, w: number, d: number, z: number, s: Style = {}): Item =>
  ({ t: 'line', pts: [[x, y, z], [x + w, y, z], [x + w, y + d, z], [x, y + d, z]], s, closed: true });

/** flat sheet of paper with ruled text, lying on z */
function sheet(x: number, y: number, z: number, w: number, d: number, seed: number, st: Style = {}, rows?: number): Group {
  const top = z + 0.05;
  const n = rows ?? Math.floor((d - 0.6) / 0.32);
  return box([x, y, z], [w, d, 0.05], st, textLines([x + 0.3, y + d - 0.4, top], w - 0.6, n, 0.32, seed, { stroke: 'muted', w: 0.8, tag: st.tag }));
}

/** upright panel facing -y, with ruled lines on its face */
function panel(x: number, y: number, z: number, w: number, h: number, st: Style = {}, extra: Item[] = []): Group {
  return box([x, y, z], [w, 0.22, h], st, extra);
}

/** lines drawn on the front (-y) face of an upright panel */
function faceLines(x: number, y: number, z: number, w: number, rows: number, gap: number, seed: number, s: Style): Item[] {
  const rnd = rng(seed);
  const out: Item[] = [];
  for (let i = 0; i < rows; i++) {
    const len = w * (0.55 + rnd() * 0.45);
    out.push(line([[x, y, z - i * gap], [x + len, y, z - i * gap]], s));
  }
  return out;
}

/** vertical dashed alignment guides between two plates */
function guides(half: number, z0: number, z1: number, cx = 0, cy = 0): Group {
  const items: Item[] = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    items.push(line([[cx + sx * half, cy + sy * half, z0], [cx + sx * half, cy + sy * half, z1]], { stroke: 'muted', dash: true, w: 0.7 }));
  }
  return g([cx, cy, (z0 + z1) / 2], items);
}

const acc = (tag: string, comet?: number): Style => ({ stroke: 'accent', tag, comet, w: 1.2 });

/* ───────────────────────── FIG. 1 · hero ───────────────────────── */

const hero: FigureDef = {
  cam: { yaw: 36, pitch: 27 },
  build(cam) {
    const P = 8.4;
    const H = P / 2;
    const zI = 0,
      zT = 3.4,
      zA = 6.8,
      zD = 10.4;
    const C = 2.775; // grid pitch shared by pods, tools and agents so the request path runs straight
    const rnd = rng(11);

    // infrastructure: a plate of pods
    const infra: Group[] = [];
    for (const x of [-C, -C / 3, C / 3, C])
      for (const y of [-C, -C / 3, C / 3, C]) {
        const h = 0.3 + rnd() * 0.75;
        const onPath = x === -C && y === -C;
        infra.push(box([x - 0.65, y - 0.65, zI + T], [1.3, 1.3, onPath ? 0.95 : h], { tag: '30', fill: onPath ? 'tint' : 'paper' }));
      }

    // tools
    const tools: Group[] = [];
    tools.push(cylinder([-C, -C, zT + T], 1.0, 1.2, { tag: '20 22', fill: 'tint' }, cam));
    // citation cards
    for (let i = 0; i < 4; i++) {
      tools.push(
        box([C - 1.2 + i * 0.12, -C - 0.9 - i * 0.1, zT + T + i * 0.2], [2.2, 1.6, 0.05], { tag: '20 24' }, i === 3
          ? [
              line([[C - 0.75, -C + 0.35, zT + T + 0.67], [C - 0.95, -C + 0.35, zT + T + 0.67], [C - 0.95, -C - 0.45, zT + T + 0.67], [C - 0.75, -C - 0.45, zT + T + 0.67]], { stroke: 'ink', tag: '20 24' }),
              line([[C + 0.45, -C + 0.35, zT + T + 0.67], [C + 0.65, -C + 0.35, zT + T + 0.67], [C + 0.65, -C - 0.45, zT + T + 0.67], [C + 0.45, -C - 0.45, zT + T + 0.67]], { stroke: 'ink', tag: '20 24' }),
              ...textLines([C - 0.6, -C + 0.2, zT + T + 0.67], 0.9, 3, 0.28, 3, { stroke: 'muted', w: 0.8, tag: '20 24' }),
            ]
          : []),
      );
    }
    // checks engine with slots
    tools.push(
      box([-C - 1.1, C - 0.8, zT + T], [2.2, 1.6, 0.8], { tag: '20' }, [0, 1, 2].map((i) =>
        line([[-C - 0.7, C - 0.4 + i * 0.4, zT + T + 0.8], [-C + 0.7, C - 0.4 + i * 0.4, zT + T + 0.8]], { stroke: 'ink', tag: '20' }))),
    );
    // journal-fit dial
    tools.push(
      cylinder([C, C, zT + T], 1.0, 0.3, { tag: '20' }, undefined, [
        line(ring([C, C, zT + T + 0.3], 0.62, 36, Math.PI * 0.15, Math.PI * 0.85), { stroke: 'muted', tag: '20' }),
        line([[C, C, zT + T + 0.3], [C + 0.38, C + 0.5, zT + T + 0.3]], { stroke: 'ink', tag: '20', w: 1.3 }),
      ]),
    );

    // agents
    const agents: Group[] = [];
    const zs = zA + T;
    const traces: Item[] = [
      line([[-1.2, 0, zs], [-C, 0, zs], [-C, -C + 0.55, zs]], acc('12', 1.0)),
      line([[1.2, 0, zs], [C, 0, zs], [C, -C + 0.55, zs]], { stroke: 'muted', tag: '12' }),
      line([[0, 1.2, zs], [0, C, zs], [-C + 0.55, C, zs]], { stroke: 'muted', tag: '12' }),
      line([[0, 1.2, zs], [0, C, zs], [C - 0.55, C, zs]], { stroke: 'muted', tag: '12' }),
    ];
    agents.push(
      box([-1.2, -1.2, zs], [2.4, 2.4, 1.5], { tag: '10' }, [
        ...boxItems([-0.45, -0.45, zs + 1.5], [0.9, 0.9, 0.18], { fill: 'accent', stroke: 'accent', tag: '10 50' }),
      ]),
    );
    for (const [x, y] of [[-C, -C], [C, -C], [-C, C], [C, C]])
      agents.push(box([x - 0.55, y - 0.55, zs], [1.1, 1.1, 1.1], { tag: '12', fill: x === -C && y === -C ? 'tint' : 'paper' }));

    // the request
    const doc: Group[] = [
      sheet(-1.9, -2.3, zD - 0.16, 3.6, 4.6, 5, { tag: '40' }),
      sheet(-1.7, -2.5, zD, 3.6, 4.6, 9, { tag: '40' }),
    ];
    doc.push(g([0, 0, zD + 0.1], [line([[-1.4, 1.1, zD + 0.06], [0.9, 1.1, zD + 0.06]], { stroke: 'accent', tag: '40', w: 1.4 })]));

    // the request path, travelling down through the stack
    const path = (z0: number, z1: number, x: number, y: number, delay: number): Group =>
      g([x, y, (z0 + z1) / 2], [line([[x, y, z0], [x, y, z1]], { stroke: 'accent', w: 0.9, comet: delay })]);

    const L = (at: V3, n: string, dx: number, dy: number) => label(at, n, dx, dy);

    // dashed drop lines from the request's corners to where it lands
    const drops = g([0, 0, (zs + zD) / 2], [[-1.7, -2.5], [1.9, -2.5], [-1.7, 2.1], [1.9, 2.1]].map(([x, y]) =>
      line([[x, y, zD - 0.16], [x, y, zs]], { stroke: 'muted', dash: true, w: 0.7 })));

    return [
      [plate(0, 0, zI, P, P, T, { tag: '30' })],
      infra,
      [guides(H, zI + T, zT), path(zT, zI + T + 0.95, -C, -C, 2.0)],
      [plate(0, 0, zT, P, P, T, { tag: '20' })],
      tools,
      [guides(H, zT + T, zA), path(zA, zT + T + 1.2, -C, -C, 1.5)],
      [plate(0, 0, zA, P, P, T, { tag: '10 12' })],
      [g([0, 0, zs], traces)],
      agents,
      [drops, path(zD - 0.16, zs + 1.5 + 0.18, 0, 0, 0.5)],
      doc,
      [
        g([0, 0, 99], [
          L([1.7, 0.5, zD + 0.05], '40', 2.4, -0.9),
          L([0.45, -0.2, zs + 1.6], '50', 4.4, -0.5),
          L([-1.2, -0.6, zs + 1.0], '10', -3.2, -1.6),
          L([C + 0.55, -C, zs + 0.6], '12', 2.2, 1.1),
          L([-C - 1.0, -C, zT + T + 0.7], '22', -2.4, 0.4),
          L([H, -H, zT + 0.1], '20', 2.0, 0.8),
          L([-H, -H, zI + 0.1], '30', -2.2, 0.9),
        ]),
      ],
    ];
  },
};

/* ───────────────────────── FIG. 2 · agent runtime ───────────────────────── */

const runtime: FigureDef = {
  cam: { yaw: 32, pitch: 26 },
  build(cam) {
    const z = T;
    const base: Group[] = [plate(0, 0, 0, 13, 8.4, T)];
    const top: Group[] = [];

    // context the run works from
    for (let i = 0; i < 3; i++) top.push(sheet(-6 + i * 0.35, -2.6 + i * 0.5, z + i * 0.12, 2.6, 3.4, 20 + i, { tag: '60' }));

    // planner board, upright, behind the supervisor
    const pz = z + 3.6;
    const plan: Item[] = [];
    for (let i = 0; i < 5; i++) {
      const zz = pz - 0.55 - i * 0.6;
      const done = i < 2;
      plan.push(rect(-2.5, 1.98, 0.32, 0, zz - 0.16, { stroke: done ? 'accent' : 'ink', tag: '61' }));
      plan.push(line([[-2.5, 1.98, zz + 0.16], [-2.18, 1.98, zz + 0.16]], { stroke: done ? 'accent' : 'ink', tag: '61' }));
      plan.push(line([[-2.5, 1.98, zz - 0.16], [-2.5, 1.98, zz + 0.16]], { stroke: done ? 'accent' : 'ink', tag: '61' }));
      plan.push(line([[-2.18, 1.98, zz - 0.16], [-2.18, 1.98, zz + 0.16]], { stroke: done ? 'accent' : 'ink', tag: '61' }));
      plan.push(line([[-1.9, 1.98, zz], [-1.9 + 1.3 + (i % 2) * 0.5, 1.98, zz]], { stroke: 'muted', tag: '61' }));
    }
    top.push(panel(-2.8, 2.0, z, 2.8, 3.6, { tag: '61' }, plan));

    // supervisor
    top.push(box([-1.2, -1.0, z], [2.2, 2.2, 1.9], { tag: '62' }, boxItems([-0.4, -0.2, z + 1.9], [0.6, 0.6, 0.16], { fill: 'accent', stroke: 'accent', tag: '62' })));

    // specialist sub-agents and skills
    const subs: [number, number][] = [[2.2, 2.4], [3.6, 2.4], [5.0, 2.4]];
    top.push(g([0, 0, z], [
      line([[1.0, 0.6, z], [1.6, 0.6, z], [1.6, 1.6, z], [2.6, 1.6, z], [2.6, 1.9, z]], acc('64', 0.6)),
      line([[1.6, 1.6, z], [4.0, 1.6, z], [4.0, 1.9, z]], { stroke: 'muted', tag: '64' }),
      line([[4.0, 1.6, z], [5.4, 1.6, z], [5.4, 1.9, z]], { stroke: 'muted', tag: '64' }),
    ]));
    subs.forEach(([x, y], i) => top.push(box([x, y - 0.5, z], [0.8, 0.8, 0.8 + (i === 0 ? 0.2 : 0)], { tag: '64', fill: i === 0 ? 'tint' : 'paper' })));

    // sandbox tray with a running task inside
    top.push(box([2.4, -3.6, z], [3.0, 2.2, 0.35], { tag: '68' }, [
      rect(2.6, -3.4, 2.6, 1.8, z + 0.35, { stroke: 'muted', tag: '68' }),
    ]));
    top.push(box([3.3, -3.0, z + 0.35], [0.8, 0.8, 0.8], { tag: '68' }));
    top.push(box([4.3, -2.9, z + 0.35], [0.6, 0.6, 0.5], { tag: '68' }));

    // checkpoint store: every step is written here before the next one runs
    top.push(g([0, 0, z], [line([[-2.85, 2.3, z], [-4.55, 2.3, z], [-4.55, 2.6, z]], { stroke: 'muted', dash: true, w: 0.7, tag: '69' })]));
    top.push(cylinder([-5.0, 3.1, z], 0.7, 1.0, { tag: '69' }, cam));

    // streamed answer panel with citations
    const ax = -0.4,
      ay = -3.9,
      ah = 3.4;
    const face = ay - 0.005;
    const ans: Item[] = [
      rect(ax + 0.3, face, 2.0, 0, z + ah - 0.9, { stroke: 'ink', tag: '66' }),
      ...faceLines(ax + 0.3, face, z + ah - 1.25, 2.3, 4, 0.32, 4, { stroke: 'muted', tag: '66' }),
      line([[ax + 0.3, face, z + 0.75], [ax + 1.4, face, z + 0.75]], { stroke: 'muted', tag: '66' }),
      ...boxItems([ax + 1.5, ay - 0.06, z + 0.62], [0.16, 0.06, 0.26], { fill: 'accent', stroke: 'accent', tag: '66' }),
    ];
    // bubble on top line: a quoted question
    ans.push(line([[ax + 0.3, face, z + ah - 0.9], [ax + 0.3, face, z + ah - 0.35], [ax + 2.3, face, z + ah - 0.35], [ax + 2.3, face, z + ah - 0.9]], { stroke: 'ink', tag: '66' }));
    top.push(box([ax, ay, z], [2.7, 0.22, ah], { tag: '66' }, ans));

    // threads from the output back into its context
    const threads: Group = g([-3, -2, z + 1], [
      line(curve([ax + 0.2, ay, z + 1.9], [-2.5, ay - 0.4, z + 2.4], [-4, -1.6, z + 1.2], [-4.6, -1.0, z + 0.3]), { stroke: 'accent', w: 0.9, tag: '66 60', comet: 1.4 }),
      dot([-4.6, -1.0, z + 0.3], 0.07, { fill: 'accent', tag: '60' }),
    ]);

    return [
      base,
      top,
      [threads],
      [
        g([0, 0, 99], [
          label([-5.2, -1.4, z + 0.3], '60', -1.8, 1.6),
          label([-1.4, 2.1, z + 3.2], '61', -2.0, -0.6),
          label([1.0, -1.0, z + 1.5], '62', 2.6, -2.8),
          label([5.8, 2.4, z + 0.6], '64', 1.4, -0.6),
          label([ax + 2.7, ay, z + 2.6], '66', 2.0, 1.4),
          label([5.4, -3.6, z + 0.2], '68', 1.6, 0.6),
          label([-5.7, 3.1, z + 0.8], '69', -1.6, -1.0),
        ]),
      ],
    ];
  },
};

/* ───────────────────────── FIG. 3 · parallel agents ───────────────────────── */

const fanout: FigureDef = {
  cam: { yaw: 34, pitch: 27 },
  build() {
    const z = T;
    const base: Group[] = [plate(0, 0, 0, 12.5, 9, T)];
    const top: Group[] = [];

    // the task
    top.push(sheet(-1.9, -2.6, z, 3.4, 4.4, 31, { tag: '70' }));
    top.push(sheet(-1.7, -2.8, z + 0.1, 3.4, 4.4, 32, { tag: '70' }));

    // orchestrator at the back
    top.push(box([-0.9, 2.6, z], [1.8, 1.4, 1.5], { tag: '72' }, boxItems([-0.25, 3.0, z + 1.5], [0.5, 0.5, 0.14], { fill: 'accent', stroke: 'accent', tag: '72' })));

    // specialists in an arc, each working the task in parallel
    const specialists: [number, number][] = [[-5.2, 1.2], [-4.6, 3.2], [3.8, 3.2], [4.6, 1.2], [4.2, -1.0]];
    const beams: Item[] = [];
    specialists.forEach(([x, y], i) => {
      top.push(box([x - 0.5, y - 0.5, z], [1.0, 1.0, 1.0], { tag: '74', fill: i === 1 ? 'tint' : 'paper' }));
      const src: V3 = [x, y, z + 1.0];
      beams.push(line([src, [-1.5, -2.5, z + 0.16]], { stroke: i === 1 ? 'accent' : 'muted', w: 0.7, dash: i !== 1, tag: '74' }));
      beams.push(line([src, [1.5, 1.4, z + 0.16]], { stroke: i === 1 ? 'accent' : 'muted', w: 0.7, dash: i !== 1, tag: '74' }));
    });
    // fan-out from the orchestrator
    const fan: Item[] = specialists.map(([x, y], i) =>
      line(curve([0, 2.6, z + 1.2], [0, 1.8, z + 2.8], [x * 0.7, y + 0.6, z + 2.6], [x, y, z + 1.0], 20), i === 1 ? acc('72', 0.4) : { stroke: 'ink', w: 0.7, tag: '72' }),
    );

    // the merged result
    const rx = 2.0,
      ry = -4.1,
      rz = z;
    const marks: Item[] = [];
    for (let i = 0; i < 4; i++) {
      const yy = ry + 2.7 - i * 0.62;
      marks.push(line([[rx + 0.3, yy - 0.1, rz + 0.06], [rx + 0.45, yy - 0.25, rz + 0.06], [rx + 0.75, yy + 0.08, rz + 0.06]], { stroke: i === 2 ? 'accent' : 'ink', tag: '76' }));
      marks.push(line([[rx + 1.0, yy - 0.08, rz + 0.06], [rx + 1.0 + 1.3 + (i % 2) * 0.4, yy - 0.08, rz + 0.06]], { stroke: 'muted', tag: '76' }));
    }
    top.push(box([rx, ry, rz], [3.0, 3.2, 0.05], { tag: '76' }, marks));

    return [
      base,
      top,
      [g([0, 0, 5], [...beams, ...fan])],
      [
        g([0, 0, 99], [
          label([-1.0, -2.8, z + 0.1], '70', -2.6, 1.2),
          label([0.9, 3.4, z + 1.2], '72', 2.4, -2.2),
          label([-5.6, 0.9, z + 0.4], '74', -1.6, 1.4),
          label([5.0, -4.1, z], '76', 1.6, 0.8),
        ]),
      ],
    ];
  },
};

/* ───────────────────────── FIG. 4 · MCP server ───────────────────────── */

const protocol: FigureDef = {
  cam: { yaw: 30, pitch: 27 },
  build() {
    const z = T;
    const base: Group[] = [plate(0, 0, 0, 14, 8, T)];
    const top: Group[] = [];

    // assistant on a laptop
    const lx = -6.4,
      ly = -1.6;
    top.push(box([lx, ly, z], [3.4, 2.4, 0.14], { tag: '80' }, [rect(lx + 0.3, ly + 0.5, 2.8, 1.4, z + 0.14, { stroke: 'muted', tag: '80' })]));
    const sy = ly + 2.4,
      face = sy - 0.005;
    const screen: Item[] = [
      ...faceLines(lx + 0.35, face, z + 1.85, 1.6, 3, 0.3, 7, { stroke: 'muted', tag: '80' }),
    ];
    top.push(box([lx, sy, z + 0.14], [3.4, 0.14, 2.4], { tag: '80' }, screen));
    // embedded report widget floating off the screen
    const wx = lx + 1.5,
      wy = sy - 1.1,
      wz = z + 1.0;
    const widget: Item[] = [
      line(ring([wx + 0.6, wy - 0.005, wz + 0.55], 0.32, 36), { stroke: 'muted', tag: '86' }),
    ];
    const arc: V3[] = [];
    for (let i = 0; i <= 28; i++) {
      const a = Math.PI / 2 - (i / 28) * Math.PI * 1.45;
      arc.push([wx + 0.6 + Math.cos(a) * 0.32, wy - 0.006, wz + 0.55 + Math.sin(a) * 0.32]);
    }
    widget.push(line(arc, { stroke: 'accent', w: 1.6, tag: '86' }));
    widget.push(line([[wx + 1.1, wy - 0.005, wz + 0.75], [wx + 1.7, wy - 0.005, wz + 0.75]], { stroke: 'ink', tag: '86' }));
    widget.push(line([[wx + 1.1, wy - 0.005, wz + 0.45], [wx + 1.55, wy - 0.005, wz + 0.45]], { stroke: 'muted', tag: '86' }));
    top.push(box([wx, wy, wz], [2.0, 0.1, 1.1], { tag: '86' }, widget));

    // MCP server with exposed tools as ports
    const mx = -1.2,
      my = -1.2;
    const portsFace: Item[] = [];
    for (let i = 0; i < 6; i++) {
      const px = mx + 0.3 + i * 0.36;
      portsFace.push({ t: 'line', closed: true, pts: [[px, my - 0.005, z + 0.4], [px + 0.2, my - 0.005, z + 0.4], [px + 0.2, my - 0.005, z + 0.65], [px, my - 0.005, z + 0.65]], s: { stroke: 'ink', tag: '82' } });
    }
    const dial: Item[] = [
      line(ring([mx + 1.2, my + 1.2, z + 1.8], 0.55, 40), { stroke: 'ink', tag: '88' }),
      line([[mx + 1.2, my + 1.2, z + 1.8], [mx + 1.2 + 0.32, my + 1.2 + 0.25, z + 1.8]], { stroke: 'accent', w: 1.4, tag: '88' }),
      line([[mx + 1.2, my + 1.2, z + 1.8], [mx + 1.2, my + 1.2 + 0.4, z + 1.8]], { stroke: 'ink', tag: '88' }),
    ];
    top.push(box([mx, my, z], [2.4, 2.4, 1.8], { tag: '82' }, [...portsFace, ...dial]));

    // checks
    const zc = z + 0.5;
    const cx0 = 3.0;
    const rowsY = [1.6, -0.3, -2.2];
    const glyphs = (x: number, y: number, i: number): Item[] => {
      const s: Style = { stroke: i === 2 ? 'accent' : 'ink', tag: '84' };
      if (i === 0) return [0, 1, 2].map((k) => line([[x + 0.3, y + 0.4 + k * 0.28, zc], [x + 1.3 - k * 0.2, y + 0.4 + k * 0.28, zc]], s));
      if (i === 1) return [rect(x + 0.3, y + 0.35, 0.7, 0.6, zc, s), rect(x + 0.65, y + 0.6, 0.7, 0.6, zc, s)];
      if (i === 2)
        return [
          line([[x + 0.55, y + 1.2, zc], [x + 0.35, y + 1.2, zc], [x + 0.35, y + 0.35, zc], [x + 0.55, y + 0.35, zc]], s),
          line([[x + 1.05, y + 1.2, zc], [x + 1.25, y + 1.2, zc], [x + 1.25, y + 0.35, zc], [x + 1.05, y + 0.35, zc]], s),
        ];
      return [line(ring([x + 0.8, y + 0.78, zc], 0.45, 36), s), line(ring([x + 0.8, y + 0.78, zc], 0.22, 28), s), dot([x + 0.8, y + 0.78, zc], 0.05, { fill: 'ink', tag: '84' })];
    };
    const spots: [number, number][] = [[cx0, rowsY[0]], [cx0 + 2.2, rowsY[0] - 0.4], [cx0, rowsY[2]], [cx0 + 2.2, rowsY[2] - 0.4]];
    spots.forEach(([x, y], i) => {
      top.push(box([x, y, z], [1.6, 1.6, 0.5], { tag: '84', fill: i === 2 ? 'tint' : 'paper' }, glyphs(x, y, i)));
    });

    // cables: protocol from the assistant, and fan-out to checks
    const cables: Item[] = [
      line(curve([lx + 3.4, ly + 1.0, z + 0.07], [lx + 4.4, ly + 1.0, z], [mx - 1.2, my + 0.6, z], [mx, my + 0.6, z + 0.3], 24), { ...acc('81', 0.2), w: 1.3 }),
    ];
    spots.forEach(([x, y], i) => {
      cables.push(line(curve([mx + 2.4, my + 1.2, z + 0.3], [mx + 3.4, my + 1.2, z], [x - 1.0, y + 0.8, z], [x, y + 0.8, z + 0.25], 22), i === 2 ? acc('84', 1.0) : { stroke: 'ink', w: 0.8, tag: '84' }));
    });

    return [
      base,
      [g([0, 0, z], cables)],
      top,
      [
        g([0, 0, 99], [
          label([lx + 0.4, ly, z + 0.1], '80', -1.6, 1.2),
          label([lx + 4.2, ly + 1.0, z], '81', -0.4, 2.2),
          label([mx + 2.4, my, z + 1.2], '82', 1.4, 1.8),
          label([wx + 2.0, wy, wz + 0.9], '86', 1.4, -2.4),
          label([mx + 1.75, my + 1.2, z + 1.8], '88', 1.2, -2.2),
          label([cx0 + 3.8, rowsY[0] - 0.4, z + 0.3], '84', 1.6, -0.8),
        ]),
      ],
    ];
  },
};

/* ───────────────────────── FIG. 5 · batch pipeline ───────────────────────── */

const batch: FigureDef = {
  cam: { yaw: 28, pitch: 28 },
  build(cam) {
    const z = T;
    const base: Group[] = [plate(0, 0, 0, 15, 7.5, T)];
    const top: Group[] = [];

    // incoming batch
    for (let i = 0; i < 9; i++) top.push(box([-7.0, -1.2, z + i * 0.16], [2.0, 2.4, 0.06], { tag: '90' }, i === 8 ? textLines([-6.75, 0.95, z + i * 0.16 + 0.06], 1.5, 6, 0.3, 41, { stroke: 'muted', w: 0.8, tag: '90' }) : []));

    // queue: a channel of messages
    const qx = -4.2;
    top.push(box([qx, -0.9, z], [4.2, 1.8, 0.3], { tag: '92' }, [rect(qx + 0.2, -0.7, 3.8, 1.4, z + 0.3, { stroke: 'muted', tag: '92' })]));
    for (let i = 0; i < 6; i++) top.push(box([qx + 0.35 + i * 0.62, -0.5, z + 0.3], [0.42, 1.0, 0.32], { tag: '92', fill: i === 5 ? 'tint' : 'paper' }));

    // autoscaling workers; the dashed one is capacity scaled to zero
    const wx = 1.0;
    const workers: [number, number, boolean][] = [[wx, 0.4, true], [wx + 1.5, 0.4, true], [wx, -1.4, true], [wx + 1.5, -1.4, false]];
    workers.forEach(([x, y, live], i) => {
      if (live) top.push(box([x, y, z], [1.1, 1.1, 1.1], { tag: '94', fill: i === 0 ? 'tint' : 'paper' }));
      else
        top.push(g([x + 0.55, y + 0.55, z + 0.5], boxItems([x, y, z], [1.1, 1.1, 1.1], { tag: '94', fill: 'none', dash: true, stroke: 'muted' })));
    });

    // scores: one column per item, rationale lines beneath
    const sx = 4.6;
    const heights = [0.8, 1.6, 0.5, 2.8, 1.1, 0.7];
    heights.forEach((h, i) => top.push(box([sx + i * 0.55, -0.9, z], [0.36, 0.36, h], { tag: '96', fill: h > 2 ? 'accent' : 'paper', stroke: h > 2 ? 'accent' : 'ink' })));
    top.push(g([sx + 1.5, -2.2, z], textLines([sx, -1.5, z], 3.0, 3, 0.32, 52, { stroke: 'muted', w: 0.8, tag: '96' })));

    // checkpoint store
    top.push(cylinder([2.1, 2.6, z], 0.9, 1.3, { tag: '98' }, cam));

    const flow: Item[] = [
      line([[-5.0, 0, z + 0.9], [qx - 0.1, 0, z + 0.9], [qx + 0.1, 0, z + 0.5]], acc('90', 0.2)),
      line([[qx + 4.2, 0, z + 0.4], [wx - 0.1, 0.95, z + 0.55]], acc('92', 0.9)),
      line([[wx + 2.7, 0.95, z + 0.55], [sx - 0.1, -0.7, z + 0.4]], acc('94', 1.6)),
      line([[wx + 0.55, 1.5, z + 1.1], [wx + 0.55, 2.6, z + 1.1], [1.2, 2.6, z + 1.1]], { stroke: 'ink', dash: true, w: 0.8, tag: '98' }),
    ];

    return [
      base,
      [g([0, 0, z], flow)],
      top,
      [
        g([0, 0, 99], [
          label([-7.0, -1.2, z + 0.8], '90', -1.6, 1.4),
          label([qx + 2.0, -0.9, z + 0.3], '92', -0.6, 2.2),
          label([wx + 2.0, -1.4, z + 0.3], '94', 0.4, 2.2),
          label([sx + 1.9, -0.6, z + 2.6], '96', 1.8, -1.6),
          label([2.1, 3.5, z + 1.3], '98', 2.2, -1.2),
        ]),
      ],
    ];
  },
};

/* ───────────────────────── FIG. 6 · model gateway ───────────────────────── */

const gateway: FigureDef = {
  cam: { yaw: 34, pitch: 27 },
  build(cam) {
    const z = T;
    const base: Group[] = [plate(0, 0, 0, 13, 9, T)];
    const top: Group[] = [];

    // gateway with an A/B split etched on top
    const gx = -3.4,
      gy = -2.6;
    const gz = z + 0.7;
    const split: Item[] = [
      line([[gx + 0.3, gy + 1.0, gz], [gx + 1.4, gy + 1.0, gz]], { stroke: 'ink', tag: '100' }),
      line([[gx + 1.4, gy + 1.0, gz], [gx + 2.6, gy + 1.55, gz], [gx + 3.6, gy + 1.55, gz]], { stroke: 'ink', tag: '108' }),
      line([[gx + 1.4, gy + 1.0, gz], [gx + 2.6, gy + 0.45, gz], [gx + 3.6, gy + 0.45, gz]], { stroke: 'accent', tag: '108' }),
      dot([gx + 1.4, gy + 1.0, gz], 0.07, { fill: 'ink', tag: '100' }),
    ];
    top.push(box([gx, gy, z], [4.0, 2.0, 0.7], { tag: '100' }, split));

    // prompt cache: thin stacked layers
    for (let i = 0; i < 6; i++) top.push(box([-5.6, 0.6, z + i * 0.22], [1.8, 1.8, 0.12], { tag: '102', fill: i === 5 ? 'tint' : 'paper' }));

    // providers
    const prov: [number, number, number][] = [[1.8, 2.4, 2.6], [4.0, 1.0, 1.9], [4.4, -2.0, 2.2]];
    prov.forEach(([x, y, h], i) => top.push(cylinder([x, y, z], 0.85, h, { tag: '104', fill: i === 0 ? 'tint' : 'paper' }, cam)));

    const routes: Item[] = [
      line([[-6.4, gy + 1.0, z + 0.35], [gx, gy + 1.0, z + 0.35]], acc('100', 0.1)),
      line(curve([gx + 0.6, gy + 2.0, z + 0.4], [gx + 0.6, gy + 2.8, z + 0.6], [-4.0, 1.3, z + 1.2], [-3.8, 1.5, z + 1.2], 16), acc('102', 0.6)),
      line(curve([gx + 4.0, gy + 1.55, z + 0.35], [0.4, 0.4, z + 0.4], [1.0, 2.4, z + 0.5], [1.0, 2.4, z + 1.2], 22), acc('104', 1.1)),
      line(curve([gx + 4.0, gy + 0.45, z + 0.35], [2.0, -1.6, z + 0.3], [3.0, 1.0, z + 0.4], [3.2, 1.0, z + 1.0], 22), { stroke: 'accent', dash: true, w: 0.9, tag: '106' }),
      line([[gx + 4.0, gy + 0.45, z + 0.35], [3.6, -2.0, z + 0.35]], { stroke: 'ink', w: 0.8, tag: '108' }),
    ];

    return [
      base,
      [g([0, 0, z], routes)],
      top,
      [
        g([0, 0, 99], [
          label([gx + 0.4, gy, z + 0.3], '100', -1.6, 1.4),
          label([-5.6, 1.5, z + 1.2], '102', -1.6, -1.4),
          label([1.8, 3.25, z + 2.2], '104', 1.8, -1.2),
          label([2.4, -0.6, z + 0.4], '106', 1.0, 2.6),
          label([gx + 3.0, gy + 1.55, z + 0.7], '108', 0.4, -2.4),
        ]),
      ],
    ];
  },
};

export const figures = { hero, runtime, fanout, protocol, batch, gateway } satisfies Record<string, FigureDef>;
export type FigureName = keyof typeof figures;

