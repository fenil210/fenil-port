// Shared theme, masthead and visit trace.
import { initTrace } from './trace';

const root = document.documentElement;

/* ───────── theme ───────── */

const theme = document.querySelector<HTMLButtonElement>('.theme');
if (theme) {
  theme.setAttribute('aria-pressed', String(root.dataset.theme === 'light'));
  theme.addEventListener('click', () => {
    const light = root.dataset.theme !== 'light';
    const next = light ? 'light' : 'dark';
    root.dataset.theme = next;
    theme.setAttribute('aria-pressed', String(light));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#ffffff' : '#0f0f0e');
    try {
      localStorage.setItem('theme', next);
    } catch {}
  });
}

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
