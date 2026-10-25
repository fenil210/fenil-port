// What every page runs: the theme toggle, the masthead, the trace of the visit, the reveal
// of rows as they arrive, and the hairlines that grow from where the pointer enters.
import { initTrace } from './trace';

const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ───────── theme ───────── */

document.querySelector<HTMLButtonElement>('.theme')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'light' ? 'dark' : 'light';
  const apply = () => {
    root.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', next === 'light' ? '#f6f6f3' : '#0f0f0e');
    try {
      localStorage.setItem('theme', next);
    } catch {}
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !reduced) doc.startViewTransition(apply);
  else apply();
});

/* ───────── masthead ───────── */

const masthead = document.querySelector<HTMLElement>('.masthead');
// the bottom edge of the masthead is the trace of this visit, one span per section (see trace.ts)
const onScroll = () => masthead?.classList.toggle('is-scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true });
onScroll();

// on the home page the links are sections of the page; mark the one being read
const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.masthead nav a[href^="#"]')];
if (navLinks.length) {
  const sectionIO = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const id = (e.target as HTMLElement).id;
        navLinks.forEach((a) => a.classList.toggle('is-current', a.hash === `#${id}`));
      }
    },
    { rootMargin: '-50% 0px -50% 0px' },
  );
  document.querySelectorAll('main > section[id]').forEach((s) => sectionIO.observe(s));
}

/* ───────── this visit as a trace ───────── */

initTrace();

/* ───────── reveal ───────── */

if (!reduced) {
  const revealIO = new IntersectionObserver(
    (entries, io) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('in');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  const groups = ['.section-head', '.rows li', '.papers li', '.recognition li', '.stats > div', '.contact-links li'];
  document.querySelectorAll<HTMLElement>(groups.join(',')).forEach((el) => {
    const i = el.parentElement ? [...el.parentElement.children].indexOf(el) : 0;
    el.style.transitionDelay = `${Math.min(i, 8) * 60}ms`;
    el.classList.add('reveal');
    revealIO.observe(el);
  });
}

/* ───────── rules grow out from where the pointer enters ───────── */

document.querySelectorAll<HTMLElement>('.rows a, .contact-links a').forEach((a) => {
  a.addEventListener('pointerenter', (e) => {
    const r = a.getBoundingClientRect();
    a.style.setProperty('--ox', `${Math.round(e.clientX - r.left)}px`);
  });
});

document.querySelectorAll<HTMLElement>('.hero-links a:not(.btn), .masthead nav a, .more a').forEach((a) => {
  a.addEventListener('pointerenter', (e) => {
    const r = a.getBoundingClientRect();
    a.style.setProperty('--oxp', `${Math.round(((e.clientX - r.left) / r.width) * 100)}%`);
  });
});
