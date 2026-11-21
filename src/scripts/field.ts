/* The band under the hero: the sinusoidal positional encoding from "Attention Is All You Need"
   (Vaswani et al., 2017), in ASCII. Columns are positions; rows are dimensions in sin/cos pairs,
   their frequency falling from top to bottom. It resolves left to right on load, then slides
   along the sequence. The cells around the pointer take the accent. */

const RAMP = ' .:-=+*#%@';
const TOP = RAMP.length - 1;
// the lens around the pointer, as half-widths in columns and rows
const RX = 10;
const RY = 3.2;

export function initField(reduced: boolean) {
  const grid = document.querySelector<HTMLElement>('.field-grid');
  if (!grid) return;
  const base = grid.querySelector<HTMLElement>('.field-base')!;
  const lens = grid.querySelector<HTMLElement>('.field-lens')!;

  let cols = 0;
  let rows = 0;
  let cw = 0;
  let lh = 0;
  let freq: number[] = [];
  // per cell, the ms after start when it first shows noise; it settles 350 ms later
  let reveal = new Float32Array(0);
  let px = -99;
  let py = -99;
  let t0 = 0;
  let seen = false;
  let raf = 0;
  let last = 0;

  function measure(first: boolean) {
    const probe = document.createElement('span');
    probe.textContent = '0'.repeat(100);
    base.append(probe);
    cw = probe.getBoundingClientRect().width / 100;
    probe.remove();
    lh = parseFloat(getComputedStyle(base).lineHeight);
    cols = Math.floor(grid!.clientWidth / cw);
    rows = 2 * Math.floor(grid!.clientHeight / lh / 2);
    const pairs = rows / 2;
    // 2i/d runs from 0 to 0.3 down the rows; a column is a third of a position, so periods run
    // from about 19 to 300 columns and every row shows its wave on screen
    freq = Array.from({ length: pairs }, (_, i) => (1 / 3) * 10000 ** (-0.3 * (i / Math.max(1, pairs - 1))));
    reveal = new Float32Array(rows * cols);
    if (first) for (let i = 0; i < reveal.length; i++) reveal[i] = ((i % cols) / cols) * 700 + Math.random() * 400;
    else reveal.fill(-1e6);
  }

  function draw(now: number) {
    const t = now - t0;
    const shift = reduced ? 0 : t / 250;
    let a = '';
    let b = '';
    for (let r = 0; r < rows; r++) {
      const f = freq[r >> 1];
      const wave = r & 1 ? Math.cos : Math.sin;
      const dy = (r - py) / RY;
      for (let c = 0; c < cols; c++) {
        const at = reveal[r * cols + c];
        let g = ' ';
        if (reduced || t > at + 350) g = RAMP[Math.round(((wave((c + shift) * f) + 1) / 2) * TOP)];
        else if (t > at) g = RAMP[1 + Math.floor(Math.random() * TOP)];
        const dx = (c - px) / RX;
        if (g !== ' ' && dx * dx + dy * dy < 1) {
          a += ' ';
          b += g;
        } else {
          a += g;
          b += ' ';
        }
      }
      a += '\n';
      b += '\n';
    }
    base.textContent = a;
    lens.textContent = b;
  }

  function loop(now: number) {
    raf = 0;
    if (!seen) return;
    if (now - last > 33) {
      last = now;
      draw(now);
    }
    raf = requestAnimationFrame(loop);
  }

  const kick = () => {
    if (reduced) draw(performance.now());
    else if (!raf && seen) raf = requestAnimationFrame(loop);
  };

  // measure against the real mono face, not its fallback
  document.fonts.ready.then(() => {
    measure(true);
    t0 = performance.now();
    draw(t0);

    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      kick();
    }).observe(grid);

    let width = grid.clientWidth;
    new ResizeObserver(() => {
      if (grid.clientWidth === width) return;
      width = grid.clientWidth;
      measure(false);
      draw(performance.now());
    }).observe(grid);

    grid.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const box = grid.getBoundingClientRect();
      px = (e.clientX - box.left) / cw - 0.5;
      py = (e.clientY - box.top) / lh - 0.5;
      if (reduced) draw(performance.now());
    });
    grid.addEventListener('pointerleave', () => {
      px = py = -99;
      if (reduced) draw(performance.now());
    });
  });
}
