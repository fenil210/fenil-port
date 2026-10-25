// Every paper by theme and year (Fig. 7 on the home page, Fig. 1 on /research/): pointing
// at a mark reads its title out under the grid, and the marks fill in column by column.

export function initMatrix(reduced: boolean) {
  const matrix = document.querySelector<HTMLElement>('.matrix');
  if (!matrix) return;
  const marks = [...matrix.querySelectorAll<HTMLElement>('.mark')];
  const readout = matrix.querySelector<HTMLElement>('.matrix-readout')!;
  const title = readout.querySelector<HTMLElement>('.readout-title')!;
  const meta = readout.querySelector<HTMLElement>('.readout-meta')!;

  const show = (m: HTMLElement | null) => {
    marks.forEach((x) => x.classList.toggle('is-on', x === m));
    readout.classList.toggle('is-on', !!m);
    if (!m) return;
    title.textContent = m.dataset.title ?? '';
    meta.textContent = m.dataset.meta ?? '';
  };
  marks.forEach((m) => {
    m.addEventListener('pointerenter', () => show(m));
    m.addEventListener('focus', () => show(m));
    m.addEventListener('click', () => show(m));
  });
  matrix.querySelector('.matrix-grid')?.addEventListener('pointerleave', () => show(null));
  matrix.addEventListener('focusout', (e) => {
    if (!matrix.contains((e as FocusEvent).relatedTarget as Node)) show(null);
  });

  if (reduced) return;
  // reveal column by column, the way the papers accumulated
  const order = [...marks].sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  order.forEach((m, i) => m.style.setProperty('--i', String(i)));
  matrix.classList.add('pre');
  new IntersectionObserver(
    ([e], io) => {
      if (!e.isIntersecting) return;
      matrix.classList.add('drawing');
      requestAnimationFrame(() => matrix.classList.remove('pre'));
      setTimeout(() => matrix.classList.remove('drawing'), marks.length * 35 + 700);
      io.disconnect();
    },
    { threshold: 0.3 },
  ).observe(matrix);
}
