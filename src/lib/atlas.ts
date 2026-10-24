// Build-time map data. Land and country outlines come from Natural Earth via world-atlas;
// India and its states come from DataMeet, which follows India's official boundaries.

import { geoArea, geoCentroid } from 'd3-geo';
import type { Feature, MultiPolygon, Polygon, Position } from 'geojson';
import { feature, merge } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countries110 from 'world-atlas/countries-110m.json';
import land110 from 'world-atlas/land-110m.json';
import indiaTopo from '../data/india.topo.json';
import { travel } from './content';
import { HOME_AT, type Atlas } from './globe';

type Shape = Polygon | MultiPolygon;

const round = (s: Shape): Shape => {
  const pt = (p: Position) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
  return s.type === 'Polygon'
    ? { type: 'Polygon', coordinates: s.coordinates.map((ring) => ring.map(pt)) }
    : { type: 'MultiPolygon', coordinates: s.coordinates.map((poly) => poly.map((ring) => ring.map(pt))) };
};

/** Douglas–Peucker on a line or closed ring, keeping both ends; tol is in the points' own units */
export function thin<T extends number[]>(pts: T[], tol: number): T[] {
  if (pts.length < 5) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const [ax, ay] = pts[a];
    const dx = pts[b][0] - ax;
    const dy = pts[b][1] - ay;
    const len = Math.hypot(dx, dy);
    let far = 0;
    let at = -1;
    for (let i = a + 1; i < b; i++) {
      const px = pts[i][0] - ax;
      const py = pts[i][1] - ay;
      // a closed ring starts and ends on the same point, so measure from it instead of from a line
      const d = len > 1e-9 ? Math.abs(px * dy - py * dx) / len : Math.hypot(px, py);
      if (d > far) {
        far = d;
        at = i;
      }
    }
    if (at > 0 && far > tol) {
      keep[at] = 1;
      stack.push([a, at], [at, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

// d3 reads a ring's winding to decide which side is inside; DataMeet's rings run the
// other way (RFC 7946), so each polygon that claims more than half the sphere is turned round
const rewind = (s: Shape): Shape => {
  const fix = (poly: Position[][]) => (geoArea({ type: 'Polygon', coordinates: poly }) > 2 * Math.PI ? poly.map((r) => [...r].reverse()) : poly);
  return s.type === 'Polygon' ? { type: 'Polygon', coordinates: fix(s.coordinates) } : { type: 'MultiPolygon', coordinates: s.coordinates.map(fix) };
};

/** India at globe scale: a degree is a few pixels, so drop the islands and most of the coastline detail */
const coarse = (s: Shape): MultiPolygon => {
  const polys = s.type === 'Polygon' ? [s.coordinates] : s.coordinates;
  return {
    type: 'MultiPolygon',
    coordinates: polys.filter((p) => geoArea({ type: 'Polygon', coordinates: p }) > 2e-5).map((p) => p.map((r) => thin(r, 0.08))),
  };
};

const world = countries110 as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const land = land110 as unknown as Topology<{ land: GeometryCollection }>;
const india = indiaTopo as unknown as Topology<{ states: GeometryCollection<{ ST_NM: string }> }>;

export const indiaStates = (feature(india, india.objects.states).features as Feature<Shape, { ST_NM: string }>[]).map((f) => ({
  ...f,
  geometry: rewind(f.geometry),
}));

const countries = feature(world, world.objects.countries).features as Feature<Shape, { name: string }>[];
const landShape = (feature(land, land.objects.land) as unknown as { features: Feature<Shape>[] }).features[0].geometry;

export const atlas: Atlas = {
  land: round(landShape) as MultiPolygon,
  home: { id: '356', shape: round(coarse(rewind(merge(india, india.objects.states.geometries as never)))), at: HOME_AT },
  places: travel.countries.map((c) => {
    const f = countries.find((x) => x.id === c.id);
    if (!f) throw new Error(`no outline for ${c.name}`);
    const [lon, lat] = geoCentroid(f);
    return { id: c.id, shape: round(f.geometry), at: [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100] };
  }),
};
