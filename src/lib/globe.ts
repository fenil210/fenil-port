// Fig. 9: an orthographic globe drawn like the other figures. The night side is
// hatched from where the sun actually is, and arcs lift off the surface to each country,
// which carries its number from the legend. Runs at build time (first paint) and in the
// browser (rotation).

import { geoCircle, geoGraticule, geoInterpolate, geoOrthographic, geoPath, geoRotation } from 'd3-geo';
import type { MultiLineString, MultiPolygon } from 'geojson';

export interface Place {
  id: string;
  shape: MultiPolygon;
  /** lon, lat the arc lands on */
  at: [number, number];
}

export interface Atlas {
  land: MultiPolygon;
  india: { fill: MultiPolygon; edge: MultiLineString };
  places: Place[];
}

export const SIZE = 600;
const R = 268;
const C = SIZE / 2;
/** the arcs leave from Mumbai */
const FROM: [number, number] = [72.88, 19.08];
/** the view that shows every place at once */
export const VIEW: [number, number] = [-38, -16];

const DEG = Math.PI / 180;
const r1 = (n: number) => Math.round(n * 10) / 10;
const grid = geoGraticule().step([15, 15])();

/** where the sun is overhead: lon, lat in degrees */
export function subsolar(d: Date): [number, number] {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const day = (d.getTime() - start) / 864e5;
  const decl = -23.44 * Math.cos(((2 * Math.PI) / 365) * (day + 10));
  const b = ((2 * Math.PI) / 365) * (day - 81);
  const eot = 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b); // minutes
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  let lon = -15 * (hours - 12 + eot / 60);
  lon = ((lon + 540) % 360) - 180;
  return [lon, decl];
}

/** whether the sun is down at a place right now */
export function isNight(at: [number, number], d: Date): boolean {
  const [slon, slat] = subsolar(d);
  const [lon, lat] = at;
  return Math.sin(lat * DEG) * Math.sin(slat * DEG) + Math.cos(lat * DEG) * Math.cos(slat * DEG) * Math.cos((lon - slon) * DEG) < 0;
}

/** a great circle from a to b, lifted off the surface in the middle, as visible screen runs */
function arc(a: [number, number], b: [number, number], rotate: [number, number]): string {
  const along = geoInterpolate(a, b);
  const turn = geoRotation(rotate);
  // longer flights fly higher; distance is in radians
  const lift = 0.04 + 0.1 * (along as unknown as { distance: number }).distance;
  const out: string[] = [];
  let pen = false;
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const [lon, lat] = turn(along(t));
    const x = Math.cos(lat * DEG) * Math.sin(lon * DEG);
    const y = Math.sin(lat * DEG);
    const z = Math.cos(lat * DEG) * Math.cos(lon * DEG);
    const h = 1 + lift * Math.sin(Math.PI * t);
    const seen = z > 0 || (x * x + y * y) * h * h > 1;
    if (!seen) {
      pen = false;
      continue;
    }
    out.push(`${pen ? 'L' : 'M'}${r1(C + R * x * h)} ${r1(C - R * y * h)}`);
    pen = true;
  }
  return out.join('');
}

export interface View {
  rotate: [number, number];
  now: Date;
  /** id of the place being pointed at */
  hot?: string | null;
}

export function drawGlobe(atlas: Atlas, view: View): string {
  const proj = geoOrthographic().scale(R).translate([C, C]).rotate(view.rotate).clipAngle(90).precision(0.4);
  const path = geoPath(proj).digits(1);
  const [slon, slat] = subsolar(view.now);
  const night = geoCircle().center([slon + 180, -slat]).radius(90)();
  const sphere = path({ type: 'Sphere' }) ?? '';
  const front = (p: [number, number]) => {
    const [lon, lat] = geoRotation(view.rotate)(p);
    return Math.cos(lat * DEG) * Math.cos(lon * DEG) > 0.05;
  };
  const hot = (id: string) => (view.hot === id ? ' is-hot' : '');

  const parts: string[] = [
    `<path class="g-sea" d="${sphere}"/>`,
    `<path class="g-grat" d="${path(grid) ?? ''}"/>`,
    `<path class="g-land" d="${path(atlas.land) ?? ''}"/>`,
    `<path class="g-india" d="${path(atlas.india.fill) ?? ''}"/>`,
    `<path class="g-india-edge" d="${path(atlas.india.edge) ?? ''}"/>`,
  ];
  atlas.places.forEach((p) => {
    parts.push(`<path class="g-place${hot(p.id)}" data-id="${p.id}" d="${path(p.shape) ?? ''}"/>`);
  });
  parts.push(`<path class="g-night" d="${path(night) ?? ''}"/>`);
  parts.push(`<path class="g-limb" d="${sphere}"/>`);

  atlas.places.forEach((p, i) => {
    const d = arc(FROM, p.at, view.rotate);
    if (!d) return;
    parts.push(`<path class="g-arc${hot(p.id)}" pathLength="1" d="${d}"/>`);
    parts.push(`<path class="g-comet" pathLength="1" d="${d}" style="animation-delay:${(i * 0.7).toFixed(1)}s"/>`);
  });

  // each place carries its number where its arc lands
  atlas.places.forEach((p, i) => {
    if (!front(p.at)) return;
    const [x, y] = proj(p.at)!;
    parts.push(
      `<g class="g-pin${hot(p.id)}" data-id="${p.id}">` +
        `<rect x="${r1(x - 9)}" y="${r1(y - 9)}" width="18" height="18" rx="3"/>` +
        `<text x="${r1(x)}" y="${r1(y + 0.5)}" text-anchor="middle" dominant-baseline="central">${i + 1}</text>` +
        `</g>`,
    );
  });
  return parts.join('');
}
