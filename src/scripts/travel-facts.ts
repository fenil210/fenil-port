import type { FactPool, TravelFact } from '../data/travel-facts/types';

interface PlaceLabel {
  name: string;
  note?: string;
}

const FIRST_DWELL = 420;
const SWITCH_DWELL = 360;
const SWAP_TIME = 190;
type FocusTarget = HTMLElement | SVGElement;

export function initTravelFacts(
  figure: HTMLElement,
  pool: FactPool,
  places: ReadonlyMap<string, PlaceLabel>,
  highlight: (id: string | null) => void,
  focusPlace?: (id: string) => void,
) {
  const panel = figure.querySelector<HTMLElement>('.travel-fact')!;
  const area = panel.querySelector<HTMLElement>('.fact-area')!;
  const hint = panel.querySelector<HTMLElement>('.fact-hint')!;
  const result = panel.querySelector<HTMLElement>('.fact-result')!;
  const copy = result.querySelector<HTMLElement>('.fact-copy')!;
  const title = result.querySelector<HTMLElement>('.fact-place')!;
  const note = result.querySelector<HTMLElement>('.fact-note')!;
  const text = result.querySelector<HTMLElement>('.fact-text')!;
  const source = result.querySelector<HTMLAnchorElement>('.fact-source')!;
  const announcement = panel.querySelector<HTMLElement>('.fact-announcement')!;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const buttons = new Map(
    [...figure.querySelectorAll<HTMLButtonElement>('button[data-fact-id]')].map((button) => [button.dataset.factId!, button]),
  );

  let hovered: string | null = null;
  let selected: string | null = null;
  let opener: FocusTarget | null = null;
  let leaving: HTMLElement | null = null;
  let resize: Animation | undefined;
  let timer = 0;
  const remaining = new Map<string, TravelFact[]>();
  const previous = new Map<string, TravelFact>();

  function nextFact(id: string): TravelFact {
    let queue = remaining.get(id);
    if (!queue?.length) {
      queue = [...pool[id]];
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      const next = queue.length - 1;
      if (next > 0 && queue[next] === previous.get(id)) [queue[0], queue[next]] = [queue[next], queue[0]];
      remaining.set(id, queue);
    }
    const fact = queue.pop()!;
    previous.set(id, fact);
    return fact;
  }

  function stopMotion() {
    resize?.cancel();
    resize = undefined;
    area.classList.remove('is-resizing');
    copy.getAnimations().forEach((animation) => animation.cancel());
    source.getAnimations().forEach((animation) => animation.cancel());
    leaving?.remove();
    leaving = null;
  }

  function resizeArea(from: number) {
    const to = area.getBoundingClientRect().height;
    if (Math.abs(from - to) < 1) return;
    area.classList.add('is-resizing');
    resize = area.animate([{ height: from + 'px' }, { height: to + 'px' }], { duration: SWAP_TIME, easing: 'ease-out' });
    resize.onfinish = () => {
      resize = undefined;
      area.classList.remove('is-resizing');
    };
  }

  function show(id: string, trigger?: FocusTarget) {
    clearTimeout(timer);
    const place = places.get(id);
    if (!place || !pool[id]?.length) return;
    const fact = nextFact(id);

    const animate = !motion.matches;
    const previousHeight = animate ? area.getBoundingClientRect().height : 0;
    const priorCopy = animate && selected ? copy.cloneNode(true) as HTMLElement : null;
    const priorOpacity = priorCopy ? getComputedStyle(copy).opacity : '1';
    stopMotion();

    if (trigger || selected !== id) opener = trigger ?? null;
    selected = id;
    title.textContent = place.name;
    note.textContent = place.note ?? '';
    text.textContent = fact.text;
    source.href = fact.url;
    source.textContent = fact.source;
    source.title = fact.source;
    source.setAttribute('aria-label', 'Source from ' + fact.source);
    hint.hidden = true;
    result.hidden = false;
    announcement.textContent = place.name + '. ' + fact.text;
    highlight(id);

    if (!animate) return;
    if (priorCopy) {
      priorCopy.classList.add('fact-copy-outgoing');
      priorCopy.setAttribute('aria-hidden', 'true');
      copy.after(priorCopy);
      leaving = priorCopy;
      priorCopy.animate([{ opacity: priorOpacity }, { opacity: 0 }], { duration: 95, easing: 'ease-out' }).onfinish = () => {
        priorCopy.remove();
        if (leaving === priorCopy) leaving = null;
      };
    }
    copy.animate([
      { opacity: 0 },
      { opacity: 0.15, offset: 0.28 },
      { opacity: 1 },
    ], { duration: SWAP_TIME, easing: 'ease-out' });
    source.animate([{ opacity: 0.35 }, { opacity: 1 }], { duration: SWAP_TIME, easing: 'ease-out' });
    resizeArea(previousHeight);
  }

  function hover(id: string | null) {
    if (id === hovered) return;
    hovered = id;
    clearTimeout(timer);
    if (id && pool[id]?.length) timer = window.setTimeout(() => show(id), selected ? SWITCH_DWELL : FIRST_DWELL);
  }

  function bringIntoView(touch: boolean) {
    const bounds = result.getBoundingClientRect();
    if (touch || bounds.top >= innerHeight || bounds.bottom <= 0) {
      result.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }

  function dismiss() {
    clearTimeout(timer);
    if (!selected) return;
    const previousHeight = motion.matches ? 0 : area.getBoundingClientRect().height;
    stopMotion();
    if (result.contains(document.activeElement)) {
      (opener ?? buttons.get(selected) ?? figure.querySelector<SVGElement>('.region[tabindex="0"]'))?.focus({ preventScroll: true });
    }
    selected = null;
    opener = null;
    hint.hidden = false;
    result.hidden = true;
    announcement.textContent = '';
    highlight(null);
    if (!motion.matches) resizeArea(previousHeight);
  }

  for (const [id, button] of buttons) {
    button.disabled = !pool[id]?.length;
    button.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') hover(id);
    });
    button.addEventListener('pointerleave', () => hover(null));
    button.addEventListener('click', (event) => {
      show(id, button);
      focusPlace?.(id);
      if (event.detail) bringIntoView(event instanceof PointerEvent && event.pointerType === 'touch');
    });
  }
  result.querySelector('.fact-next')!.addEventListener('click', () => {
    if (selected) show(selected);
  });
  result.querySelector('.fact-dismiss')!.addEventListener('click', dismiss);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (selected || hovered)) dismiss();
  });

  panel.hidden = false;
  return {
    hover,
    select(id: string, touch: boolean, trigger?: SVGElement) {
      hovered = id;
      show(id, trigger);
      if (!trigger) bringIntoView(touch);
    },
  };
}
