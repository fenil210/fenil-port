// Build-time map data. Land and country outlines come from Natural Earth via world-atlas;
// India and its states come from DataMeet, which follows India's official boundaries.

import { geoArea, geoCentroid } from 'd3-geo';
import type { Feature, MultiLineString, MultiPolygon, Polygon, Position } from 'geojson';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import countries50 from 'world-atlas/countries-50m.json';
import land50 from 'world-atlas/land-50m.json';
import indiaTopo from '../data/india.topo.json';
import { travel } from './content';
import type { Atlas } from './globe';

type Shape = Polygon | MultiPolygon;

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

const r2 = (p: Position) => [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];

// d3 reads a ring's winding to decide which side is inside; DataMeet's rings run the
// other way (RFC 7946), so each polygon that claims more than half the sphere is turned round
const fix = (poly: Position[][]) => (geoArea({ type: 'Polygon', coordinates: poly }) > 2 * Math.PI ? poly.map((r) => [...r].reverse()) : poly);
const polys = (s: Shape) => (s.type === 'Polygon' ? [s.coordinates] : s.coordinates);
const rewind = (s: Shape): Shape => ({ type: 'MultiPolygon', coordinates: polys(s).map(fix) });

/** for the globe: thin to a tolerance in degrees, drop what would draw smaller than a pixel or two, round */
const globeScale = (shapes: Shape[], tol: number, minArea = 2e-5): MultiPolygon => ({
  type: 'MultiPolygon',
  coordinates: shapes
    .flatMap(polys)
    .filter((p) => geoArea({ type: 'Polygon', coordinates: p }) > minArea)
    .map((p) => fix(p.map((r) => thin(r, tol).map(r2)).filter((r) => r.length >= 4)))
    .filter((p) => p.length),
});

const world = countries50 as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const land = land50 as unknown as Topology<{ land: GeometryCollection }>;
const india = indiaTopo as unknown as Topology<{ states: GeometryCollection<{ ST_NM: string }> }>;

export const indiaStates = (feature(india, india.objects.states).features as Feature<Shape, { ST_NM: string }>[]).map((f) => ({
  ...f,
  geometry: rewind(f.geometry),
}));

const countries = feature(world, world.objects.countries).features as Feature<Shape, { name: string }>[];
const landShape = (feature(land, land.objects.land) as unknown as { features: Feature<Shape>[] }).features[0].geometry;

// India's edge is every border segment that belongs to one state only
const edge = mesh(india, india.objects.states, (a, b) => a === b) as MultiLineString;

// a degree is about 4.7px on the globe, so 0.1° keeps every bend wider than half a pixel
export const atlas: Atlas = {
  land: globeScale([landShape], 0.1, 5e-5),
  india: {
    fill: globeScale(indiaStates.map((f) => f.geometry), 0.1, 1e-6),
    edge: { type: 'MultiLineString', coordinates: edge.coordinates.map((l) => thin(l, 0.08).map(r2)).filter((l) => l.length > 1) },
  },
  places: travel.countries.map((c) => {
    const f = countries.find((x) => x.id === c.id);
    if (!f) throw new Error(`no outline for ${c.name}`);
    const [lon, lat] = geoCentroid(f);
    return { id: c.id, shape: globeScale([f.geometry], 0.05, 1e-6), at: [Math.round(lon * 100) / 100, Math.round(lat * 100) / 100] };
  }),
};
