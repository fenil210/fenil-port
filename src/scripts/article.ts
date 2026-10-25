// An article: copying a listing, the time left beside the contents, and picking a read back
// up at the paragraph it stopped on. Everything stays in this browser.

const article = document.querySelector<HTMLElement>('.article');

if (article) {
  const slug = article.dataset.slug!;
  const key = `read:${slug}`;
  const paras = [...article.querySelectorAll<HTMLElement>('.prose p[id^="p-"]')];
  const end = article.querySelector<HTMLElement>('.article-end');

  /* listings: a copy button where the clipboard can be written */

  if (navigator.clipboard) {
    article.querySelectorAll<HTMLElement>('.listing').forEach((l) => {
      const pre = l.querySelector('pre');
      const cap = l.querySelector('figcaption');
      if (!pre || !cap) return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy';
      btn.textContent = 'Copy';
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(pre.innerText.replace(/\n$/, ''));
          btn.textContent = 'Copied';
        } catch {
          btn.textContent = 'Select to copy';
        }
        setTimeout(() => (btn.textContent = 'Copy'), 2000);
      });
      cap.append(btn);
    });
  }

  /* where a read stopped: the last paragraph that reached the reading line */

  const store = {
    get: () => {
      try {
        return Number(localStorage.getItem(key)) || 0;
      } catch {
        return 0;
      }
    },
    set: (n: number) => {
      try {
        if (n) localStorage.setItem(key, String(n));
        else localStorage.removeItem(key);
      } catch {}
    },
  };

  const saved = store.get();
  const resume = article.querySelector<HTMLElement>('.resume');
  // offer it only when the read stopped a few paragraphs in, and the visit didn't come for a passage
  if (resume && saved > 2 && saved < paras.length && !location.hash) {
    const a = resume.querySelector('a')!;
    a.href = `#p-${saved}`;
    a.textContent = `Continue from paragraph ${saved} of ${paras.length}`;
    resume.hidden = false;
  }

  /* the contents list: the minutes still to read, from how far each part has been read */

  const items = [...article.querySelectorAll<HTMLElement>('.toc li[data-minutes]')];
  const left = article.querySelector<HTMLElement>('.toc-left');

  let frame = 0;
  let last = 0;
  const measure = () => {
    frame = 0;
    const line = innerHeight * 0.4;
    let n = 0;
    for (const p of paras) {
      if (p.getBoundingClientRect().top > line) break;
      n = Number(p.id.slice(2));
    }
    const done = !!end && end.getBoundingClientRect().top < innerHeight;
    const now = done ? 0 : n;
    if (now !== last) {
      last = now;
      store.set(now);
    }

    if (left) {
      // trace.ts writes each part's progress as --p
      const rest = items.reduce((s, li) => s + Number(li.dataset.minutes) * (1 - (Number(li.style.getPropertyValue('--p')) || 0)), 0);
      const m = Math.round(rest);
      left.textContent = done ? 'Read to the end' : m < 1 ? 'Under a minute left' : `${m} min left`;
    }
  };
  // a frame late, so trace.ts has written this frame's progress first
  const queue = () => {
    if (!frame) frame = requestAnimationFrame(() => requestAnimationFrame(measure));
  };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  queue();

  // on small screens the contents close once a part is picked
  const m = article.querySelector<HTMLDetailsElement>('.toc-m');
  m?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (m.open = false)));
}
