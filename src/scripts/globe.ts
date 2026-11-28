// Travel map input and viewport updates. The globe draws its first frame at build time.
import { centralFacts } from '../data/travel-facts/central';
import { eastFacts } from '../data/travel-facts/east';
import { northeastFacts } from '../data/travel-facts/northeast';
import { northFacts } from '../data/travel-facts/north';
import { southFacts } from '../data/travel-facts/south';
import { westFacts } from '../data/travel-facts/west';
import { worldFacts } from '../data/travel-facts/world';
import { drawGlobe, isNight, RADIUS, SIZE, VIEW, type Atlas } from '../lib/globe';
import { initTravelFacts } from './travel-facts';

const SVG_NS = 'http://www.w3.org/2000/svg';
const DRAG_THRESHOLD = 5;

export function initTravelMaps(reduced: boolean) {
  const world = document.querySelector<HTMLElement>('.globe');
  const states = document.querySelector<HTMLElement>('.india');
  if (world) globe(world, reduced);
  if (states) india(states, reduced);
}

function globe(figure: HTMLElement, reduced: boolean) {
  const svg = figure.querySelector<SVGSVGElement>('.globe-svg')!;
  const body = svg.querySelector<SVGGElement>('.globe-body')!;
  const reset = figure.querySelector<HTMLButtonElement>('.globe-reset')!;
  const scratch = document.createElementNS(SVG_NS, 'g');
  const rows = new Map([...figure.querySelectorAll<HTMLElement>('.places li[data-id]')].map((row) => [
    row.dataset.id!,
    { row, name: row.dataset.name!, at: row.dataset.at!.split(' ').map(Number) as [number, number] },
  ]));

  let atlas: Atlas | null = null;
  let rotation: [number, number] = [...VIEW];
  let destination: [number, number] | null = null;
  let active: string | null = null;
  let visible = false;
  let gesture: { id: number; x: number; y: number; dragging: boolean } | null = null;
  let suppressClick = false;
  let spin = [0, 0];
  let frame = 0;
  let last = 0;

  // Stable geometry nodes preserve the arc animations while the globe turns.
  const copyGeometry = (from: Element, to: Element) => {
    for (const attr of from.attributes) {
      if (to.getAttribute(attr.name) !== attr.value) to.setAttribute(attr.name, attr.value);
    }
    for (let i = 0; i < from.children.length; i++) copyGeometry(from.children[i], to.children[i]);
  };

  const paint = () => {
    if (!atlas) return;
    scratch.innerHTML = drawGlobe(atlas, { rotate: rotation, now: new Date(), hot: active });
    if (scratch.children.length !== body.children.length) {
      body.replaceChildren(...scratch.children);
      return;
    }
    for (let i = 0; i < body.children.length; i++) copyGeometry(scratch.children[i], body.children[i]);
  };

  const wrapLongitude = (lon: number) => ((lon + 540) % 360) - 180;
  const clampLatitude = (lat: number) => Math.max(-70, Math.min(70, lat));
  const startFrame = () => {
    if (!frame && visible && atlas && !gesture && (destination || Math.hypot(...spin) > 0.02)) {
      frame = requestAnimationFrame(tick);
    }
  };

  function tick(now: number) {
    frame = 0;
    if (!visible || gesture) return;
    if (now - last < 33) return startFrame();
    last = now;
    if (destination) {
      const dx = wrapLongitude(destination[0] - rotation[0]);
      const dy = destination[1] - rotation[1];
      if (Math.hypot(dx, dy) < 0.2) {
        rotation = destination;
        destination = null;
      } else {
        rotation[0] = wrapLongitude(rotation[0] + dx * 0.12);
        rotation[1] += dy * 0.12;
      }
    } else {
      rotation[0] = wrapLongitude(rotation[0] + spin[0]);
      rotation[1] = clampLatitude(rotation[1] + spin[1]);
      spin = spin.map((value) => value * 0.93);
    }
    paint();
    startFrame();
  }

  const goTo = (next: [number, number]) => {
    spin = [0, 0];
    if (reduced) {
      rotation = next;
      paint();
    } else {
      destination = next;
      startFrame();
    }
  };

  const facts = initTravelFacts(figure, worldFacts, rows, (id) => {
    active = id;
    for (const [key, { row }] of rows) row.classList.toggle('is-hl', key === id);
    body.querySelectorAll<SVGElement>('.g-place[data-id], .g-arc[data-id], .g-pin[data-id], .g-leader[data-id]').forEach((part) => {
      part.classList.toggle('is-hot', part.dataset.id === id);
    });
  }, (id) => {
    const { at: [lon, lat] } = rows.get(id)!;
    goTo([-lon, clampLatitude(-lat)]);
  });

  const hit = (target: EventTarget | null) => target instanceof Element
    ? target.closest<SVGElement>('.g-place[data-id], .g-pin[data-id]')?.dataset.id ?? null
    : null;

  svg.addEventListener('pointerdown', (event) => {
    if (!atlas || !event.isPrimary || event.button !== 0) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    suppressClick = false;
    destination = null;
    spin = [0, 0];
    facts.hover(null);
  });

  svg.addEventListener('pointermove', (event) => {
    if (gesture?.id === event.pointerId) {
      const x = event.clientX - gesture.x;
      const y = event.clientY - gesture.y;
      if (!gesture.dragging) {
        if (Math.hypot(x, y) < DRAG_THRESHOLD) return;
        gesture.dragging = true;
        svg.setPointerCapture(event.pointerId);
        svg.classList.add('is-dragging');
      }
      const degrees = (SIZE / svg.getBoundingClientRect().width / RADIUS) * (180 / Math.PI) * 0.8;
      rotation[0] = wrapLongitude(rotation[0] + x * degrees);
      rotation[1] = clampLatitude(rotation[1] - y * degrees);
      spin = reduced ? [0, 0] : [x * degrees, -y * degrees];
      gesture.x = event.clientX;
      gesture.y = event.clientY;
      paint();
      return;
    }
    if (event.pointerType === 'mouse') {
      // Keep a boundary under the pointer still while the reader chooses it.
      spin = [0, 0];
      facts.hover(hit(event.target));
    }
  });

  const release = (event: PointerEvent) => {
    if (gesture?.id !== event.pointerId) return;
    suppressClick = gesture.dragging;
    gesture = null;
    svg.classList.remove('is-dragging');
    if (event.type === 'pointercancel') spin = [0, 0];
    startFrame();
  };
  svg.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') {
      destination = null;
      spin = [0, 0];
    }
  });
  svg.addEventListener('pointerup', release);
  svg.addEventListener('pointercancel', release);
  svg.addEventListener('lostpointercapture', release);
  svg.addEventListener('pointerleave', () => {
    if (gesture?.dragging) return;
    gesture = null;
    facts.hover(null);
  });
  svg.addEventListener('click', (event) => {
    if (suppressClick) {
      suppressClick = false;
      return;
    }
    const id = hit(event.target);
    if (id) facts.select(id, event instanceof PointerEvent && event.pointerType === 'touch');
  });
  reset.addEventListener('click', () => goTo([...VIEW]));

  // Only the local geography is fetched. The fact pools are part of this script.
  fetch('/geo.json')
    .then((response) => {
      if (!response.ok) throw new Error('Globe outlines are unavailable.');
      return response.json() as Promise<Atlas>;
    })
    .then((data) => {
      atlas = data;
      reset.hidden = false;
      paint();
      startFrame();
    })
    .catch(() => {}); // The build-time map and fact buttons still work.
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) paint();
    startFrame();
  }).observe(svg);
  setInterval(() => {
    if (visible && !gesture && !frame) paint();
  }, 60_000);

  const clocks = [...rows.values()].map(({ row, at }) => {
    const time = row.querySelector<HTMLTimeElement>('time.tz')!;
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: time.dataset.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
    return { row, at, time, formatter, sky: row.querySelector('.sky')! };
  });
  const updateClocks = () => {
    const now = new Date();
    for (const { row, at, time, formatter, sky } of clocks) {
      time.textContent = formatter.format(now);
      time.dateTime = now.toISOString();
      const night = isNight(at, now);
      row.classList.toggle('is-night', night);
      sky.setAttribute('title', night ? 'Night there now' : 'Day there now');
    }
  };
  updateClocks();
  setInterval(updateClocks, 30_000);
}

const indiaFacts = { ...centralFacts, ...eastFacts, ...northeastFacts, ...northFacts, ...southFacts, ...westFacts };

function india(figure: HTMLElement, reduced: boolean) {
  const svg = figure.querySelector<SVGSVGElement>('.india-svg')!;
  const regions = new Map([...svg.querySelectorAll<SVGPathElement>('path.region')].map((path) => [
    path.dataset.id!,
    { path, name: path.dataset.name!, note: path.dataset.note! },
  ]));
  const rows = figure.querySelectorAll<HTMLElement>('.states li');
  const layer = document.createElementNS(SVG_NS, 'g');
  layer.setAttribute('aria-hidden', 'true');
  layer.setAttribute('pointer-events', 'none');
  svg.append(layer);

  let activeId: string | null = null;
  let overlay: SVGPathElement | null = null;
  let fading: SVGPathElement | null = null;

  // Fade one overlay out and the next in. The hatch underneath stays painted throughout.
  function highlightRegion(id: string | null) {
    if (activeId === id) return;
    activeId = id;
    fading?.remove();
    fading = null;

    if (overlay) {
      const prior = overlay;
      const opacity = getComputedStyle(prior).opacity;
      prior.getAnimations().forEach((animation) => animation.cancel());
      if (reduced) {
        prior.remove();
      } else {
        fading = prior;
        prior.animate([{ opacity }, { opacity: 0 }], { duration: 180, easing: 'ease-out' }).onfinish = () => {
          prior.remove();
          if (fading === prior) fading = null;
        };
      }
    }

    const outline = id ? regions.get(id)?.path.getAttribute('d') : null;
    overlay = null;
    if (!outline) return;
    overlay = document.createElementNS(SVG_NS, 'path');
    overlay.setAttribute('d', outline);
    overlay.classList.add('region-highlight');
    layer.append(overlay);
    if (!reduced) overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
  }

  const facts = initTravelFacts(figure, indiaFacts, regions, (id) => {
    highlightRegion(id);
    rows.forEach((row) => row.classList.toggle('is-hl', row.dataset.id === id));
  });

  const order = [...regions.entries()].sort(([, a], [, b]) => a.name.localeCompare(b.name, 'en'));
  let tabStop = Math.max(0, order.findIndex(([, { path }]) => path.classList.contains('seen')));
  svg.setAttribute('role', 'group');
  svg.setAttribute('aria-describedby', 'india-map-keys');
  order.forEach(([, { name, note, path }], i) => {
    path.setAttribute('role', 'button');
    path.setAttribute('aria-label', `${name}, ${note}`);
    path.setAttribute('aria-controls', 'india-fact');
    path.setAttribute('tabindex', i === tabStop ? '0' : '-1');
  });

  function moveTabStop(index: number) {
    order[tabStop][1].path.setAttribute('tabindex', '-1');
    tabStop = index;
    order[index][1].path.setAttribute('tabindex', '0');
  }

  const hit = (target: EventTarget | null) => target instanceof SVGPathElement && target.classList.contains('region')
    ? target.dataset.id ?? null : null;

  svg.addEventListener('keydown', (event) => {
    const id = hit(event.target);
    if (!id) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (!event.repeat) facts.select(id, false, regions.get(id)!.path);
      return;
    }
    const index = order.findIndex(([key]) => id === key);
    const positions: Partial<Record<string, number>> = {
      ArrowDown: (index + 1) % order.length, ArrowRight: (index + 1) % order.length,
      ArrowUp: (index + order.length - 1) % order.length, ArrowLeft: (index + order.length - 1) % order.length,
      Home: 0, End: order.length - 1,
    };
    const next = positions[event.key];
    if (next === undefined) return;
    event.preventDefault();
    moveTabStop(next);
    order[next][1].path.focus({ preventScroll: true });
  });

  svg.addEventListener('mousedown', (event) => {
    if (event.button === 0 && event.detail > 1) event.preventDefault();
  });
  svg.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'mouse') facts.hover(hit(event.target));
  });
  svg.addEventListener('pointerleave', () => facts.hover(null));
  svg.addEventListener('click', (event) => {
    const id = hit(event.target);
    if (!id) return;
    moveTabStop(order.findIndex(([key]) => key === id));
    facts.select(id, event instanceof PointerEvent && event.pointerType === 'touch');
  });
}
