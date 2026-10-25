// /research/: the paper grid, filters over the list, and copying a paper's BibTeX.

import { initMatrix } from './matrix';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
initMatrix(reduced);

// filters: one theme, or first-author papers, or all. Without JS every paper shows.
const bar = document.querySelector<HTMLElement>('[data-filters]');
const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-filters] .chip')];
const papers = [...document.querySelectorAll<HTMLElement>('.paper')];
const years = [...document.querySelectorAll<HTMLElement>('.paper-year')];
const marks = [...document.querySelectorAll<HTMLAnchorElement>('.matrix .mark')];
const count = document.querySelector<HTMLElement>('.filter-count');

const apply = (chip: HTMLButtonElement) => {
  const th = chip.dataset.th;
  const first = chip.hasAttribute('data-first');
  const shown = (p: HTMLElement) => (first ? p.hasAttribute('data-first') : !th || p.dataset.th === th);
  chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
  papers.forEach((p) => (p.hidden = !shown(p)));
  years.forEach((y) => (y.hidden = !y.querySelector('.paper:not([hidden])')));
  marks.forEach((m) => m.classList.toggle('is-dim', !!document.getElementById(m.hash.slice(1))?.hidden));
  const n = papers.filter((p) => !p.hidden).length;
  if (count) count.textContent = n === papers.length ? '' : `${n} of ${papers.length} papers`;
};

if (bar) {
  bar.hidden = false;
  chips.forEach((c) => c.addEventListener('click', () => apply(c)));
  // a link to a paper the filter hides shows everything again
  const reveal = () => {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    if (target instanceof HTMLElement && target.closest('[hidden]')) {
      apply(chips[0]);
      target.scrollIntoView();
    }
  };
  addEventListener('hashchange', reveal);
}

// BibTeX: the button only appears where the clipboard can be written
document.querySelectorAll<HTMLElement>('.cite').forEach((d) => {
  const btn = d.querySelector<HTMLButtonElement>('.copy');
  const pre = d.querySelector('pre');
  if (!btn || !pre || !navigator.clipboard) return;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(pre.textContent ?? '');
      btn.textContent = 'Copied';
    } catch {
      btn.textContent = 'Select the text to copy';
    }
    setTimeout(() => (btn.textContent = 'Copy BibTeX'), 2000);
  });
});
