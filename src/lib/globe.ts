// Fig. 9: an orthographic globe drawn like the other figures. The night side is
// hatched from where the sun actually is, and arcs lift off the surface from home
// to each country. Runs at build time (first paint) and in the browser (rotation).

import { geoCircle, geoGraticule10, geoInterpolate, geoOrthographic, geoPath, geoRotation } from 'd3-geo';
import type { MultiPolygon, Polygon } from 'geojson';

export interface Place {
  id: string;
  shape: Polygon | MultiPolygon;
  /** lon, lat the arc lands on */
  at: [number, number];
}

export interface Atlas {
  land: MultiPolygon;
  home: Place;
  places: Place[];
}

export const SIZE = 600;
const R = 268;
const C = SIZE / 2;
/** Mumbai */
export const HOME_AT: [number, number] = [72.88, 19.08];
/** the view that shows home and every place at once */
export const HOME_VIEW: [number, number] = [-50, -22];

const DEG = Math.PI / 180;
const r1 = (n: number) => Math.round(n * 10) / 10;

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

  const parts: string[] = [
    `<path class="g-sea" d="${sphere}"/>`,
    `<path class="g-grat" d="${path(geoGraticule10()) ?? ''}"/>`,
    `<path class="g-land" d="${path(atlas.land) ?? ''}"/>`,
    `<path class="g-home" d="${path(atlas.home.shape) ?? ''}"/>`,
  ];
  atlas.places.forEach((p) => {
    parts.push(`<path class="g-place${view.hot === p.id ? ' is-hot' : ''}" data-id="${p.id}" d="${path(p.shape) ?? ''}"/>`);
  });
  parts.push(`<path class="g-night" d="${path(night) ?? ''}"/>`);
  parts.push(`<path class="g-limb" d="${sphere}"/>`);

  atlas.places.forEach((p, i) => {
    const d = arc(HOME_AT, p.at, view.rotate);
    if (!d) return;
    const hot = view.hot === p.id ? ' is-hot' : '';
    parts.push(`<path class="g-arc${hot}" pathLength="1" d="${d}"/>`);
    parts.push(`<path class="g-comet" pathLength="1" d="${d}" style="animation-delay:${(i * 0.7).toFixed(1)}s"/>`);
  });

  // reference numerals, pushed out from the centre of the globe like leader labels
  atlas.places.forEach((p, i) => {
    if (!front(p.at)) return;
    const [x, y] = proj(p.at)!;
    const dx = x - C;
    const dy = y - C;
    const len = Math.hypot(dx, dy) || 1;
    const ux = len > 8 ? dx / len : 0.7;
    const uy = len > 8 ? dy / len : -0.7;
    const hot = view.hot === p.id ? ' is-hot' : '';
    parts.push(
      `<g class="g-ref${hot}" data-id="${p.id}">` +
        `<circle cx="${r1(x)}" cy="${r1(y)}" r="3.5"/>` +
        `<path d="M${r1(x + ux * 7)} ${r1(y + uy * 7)}L${r1(x + ux * 22)} ${r1(y + uy * 22)}"/>` +
        `<text x="${r1(x + ux * 31)}" y="${r1(y + uy * 31)}" text-anchor="middle" dominant-baseline="middle">${i + 1}</text>` +
        `</g>`,
    );
  });

  if (front(HOME_AT)) {
    const [x, y] = proj(HOME_AT)!;
    parts.push(`<circle class="g-here-ring" cx="${r1(x)}" cy="${r1(y)}" r="5"/><circle class="g-here" cx="${r1(x)}" cy="${r1(y)}" r="4"/>`);
  }
  return parts.join('');
}
