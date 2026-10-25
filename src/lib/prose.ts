// Shapes an article's HTML the way the rest of the site is set: images become numbered
// figures, code blocks numbered listings, paragraphs get numbered anchors, citations link to
// the references, and the text is cut into one section per heading so a read can be traced
// section by section (see trace.ts). It also counts words, which the page turns into minutes.

import Slugger from 'github-slugger';
import type { Element, ElementContent, Root, RootContent } from 'hast';

export interface Part {
  id: string;
  name: string;
  minutes: number;
}
export interface Prose {
  words: number;
  figures: number;
  minutes: number;
  parts: Part[];
}

const WPM = 230;
// a figure or a listing takes a moment more than its words
const PAUSE = 0.2;

const el = (tagName: string, properties: Element['properties'], children: ElementContent[] = []): Element => ({
  type: 'element',
  tagName,
  properties,
  children,
});
const txt = (value: string): ElementContent => ({ type: 'text', value });
const isEl = (n: RootContent | ElementContent | undefined, tag?: string): n is Element =>
  n?.type === 'element' && (!tag || n.tagName === tag);
const textOf = (n: RootContent | ElementContent): string =>
  n.type === 'text' ? n.value : 'children' in n ? n.children.map(textOf).join('') : '';
const countWords = (s: string) => s.split(/\s+/).filter((w) => /\w/.test(w)).length;
const blank = (n: ElementContent) => n.type === 'text' && !n.value.trim();

// a paragraph that holds only an image, or a link around one
function lone(p: Element): { img: Element; wrap?: Element } | null {
  const kids = p.children.filter((c) => !blank(c));
  if (kids.length !== 1) return null;
  const [k] = kids;
  if (isEl(k, 'img')) return { img: k };
  if (isEl(k, 'a') && k.children.filter((c) => !blank(c)).length === 1 && isEl(k.children.find((c) => !blank(c)), 'img'))
    return { img: k.children.find((c) => isEl(c, 'img')) as Element, wrap: k };
  return null;
}

const REFS = /^(references|refs|sources|source notes)\b/i;

// [n] in running text becomes a link to the nth reference; code is left alone
function cite(node: Element, max: number, seen: Set<number>) {
  node.children = node.children.flatMap((c): ElementContent[] => {
    if (isEl(c)) {
      if (c.tagName !== 'code' && c.tagName !== 'pre') cite(c, max, seen);
      return [c];
    }
    if (c.type !== 'text' || !/\[\d+\]/.test(c.value)) return [c];
    const out: ElementContent[] = [];
    let last = 0;
    for (const m of c.value.matchAll(/\[(\d+)\]/g)) {
      const n = Number(m[1]);
      if (n < 1 || n > max) continue;
      if (m.index! > last) out.push(txt(c.value.slice(last, m.index)));
      const first = !seen.has(n);
      seen.add(n);
      out.push(el('a', { className: ['ref', 'cite'], href: `#ref-${n}`, id: first ? `cite-${n}` : undefined, ariaLabel: `Reference ${n}` }, [txt(String(n))]));
      last = m.index! + m[0].length;
    }
    if (last < c.value.length) out.push(txt(c.value.slice(last)));
    return out;
  });
}

export function shape(children: RootContent[]): { children: RootContent[]; prose: Prose } {
  const slugger = new Slugger();
  const nodes = children.filter((n) => !(n.type === 'text' && !n.value.trim()));
  let fig = 0;
  let listing = 0;
  let para = 0;

  // the reference list: the first list after a References heading
  const refHead = nodes.findIndex((n) => isEl(n, 'h2') && REFS.test(textOf(n).trim()));
  const refList = refHead < 0 ? undefined : nodes.slice(refHead + 1).find((n): n is Element => isEl(n, 'ol') || isEl(n, 'ul'));
  const numbered = isEl(refList, 'ol');
  const refCount = numbered ? refList!.children.filter((c) => isEl(c, 'li')).length : 0;
  const seen = new Set<number>();

  const shaped = nodes.map((n): RootContent => {
    if (!isEl(n)) return n;

    if (n.tagName === 'p') {
      const pic = lone(n);
      if (pic) {
        fig++;
        const caption = typeof pic.img.properties.title === 'string' ? pic.img.properties.title : '';
        delete pic.img.properties.title;
        // figures sit in the text column, or a little wider on large screens
        pic.img.properties.sizes = '(min-width: 1180px) 860px, calc(100vw - 48px)';
        pic.img.properties.loading = 'lazy';
        pic.img.properties.decoding = 'async';
        return el('figure', { className: ['fig', 'prose-fig'], id: `fig-${fig}` }, [
          el('div', { className: ['fig-frame'] }, [pic.wrap ?? pic.img]),
          el('figcaption', {}, [
            el('span', { className: ['fig-no'] }, [txt(`Fig. ${fig}`)]),
            ...(caption ? [txt(' '), el('span', {}, [txt(caption)])] : []),
          ]),
        ]);
      }
      para++;
      if (refCount) cite(n, refCount, seen);
      n.properties.id = `p-${para}`;
      // the number shows in the margin on hover; the paragraph is the link's target
      n.children.unshift(el('a', { className: ['pn'], href: `#p-${para}`, ariaHidden: 'true', tabIndex: -1 }, [txt(String(para))]));
      return n;
    }

    if (n.tagName === 'pre') {
      listing++;
      const lang = String(n.properties.dataLanguage ?? '');
      return el('figure', { className: ['listing'], id: `listing-${listing}` }, [
        el('figcaption', {}, [
          el('span', { className: ['fig-no'] }, [txt(`Listing ${listing}`)]),
          ...(lang && lang !== 'plaintext' && lang !== 'text' ? [txt(' '), el('span', { className: ['lang'] }, [txt(lang)])] : []),
        ]),
        n,
      ]);
    }

    if (refCount && (n.tagName === 'ul' || n.tagName === 'ol' || n.tagName === 'blockquote') && n !== refList) cite(n, refCount, seen);

    if (n === refList) {
      n.properties.className = ['refs'];
      let i = 0;
      for (const li of n.children) {
        if (!isEl(li, 'li')) continue;
        i++;
        if (!numbered) continue;
        li.properties.id = `ref-${i}`;
        if (seen.has(i)) li.children.push(txt(' '), el('a', { className: ['back'], href: `#cite-${i}`, ariaLabel: `Back to where reference ${i} is cited` }, [txt('↩')]));
      }
    } else if (isEl(n, 'ul') && refHead >= 0 && nodes.indexOf(n) > refHead) {
      n.properties.className = ['refs'];
    }

    return n;
  });

  // one section per h2, and one before the first for the opening
  const sections: { id: string; name: string; nodes: RootContent[] }[] = [];
  for (const n of shaped) {
    if (isEl(n, 'h2')) {
      const name = textOf(n).trim();
      const id = slugger.slug(name);
      n.properties.id = id;
      sections.push({ id, name, nodes: [n] });
    } else {
      if (!sections.length) sections.push({ id: 'opening', name: 'Opening', nodes: [] });
      sections.at(-1)!.nodes.push(n);
    }
  }
  if (sections.length === 1) sections[0].name = 'Article';

  const minutesOf = (ns: RootContent[]) => {
    let w = 0;
    let pauses = 0;
    for (const n of ns) {
      if (isEl(n, 'figure')) pauses++;
      else w += countWords(textOf(n));
    }
    return { w, m: w / WPM + pauses * PAUSE };
  };
  const parts: Part[] = [];
  let words = 0;
  let minutes = 0;
  const out = sections.map((s) => {
    const { w, m } = minutesOf(s.nodes);
    words += w;
    minutes += m;
    parts.push({ id: `s-${s.id}`, name: s.name, minutes: +m.toFixed(2) });
    const head = s.nodes[0];
    return el('section', { className: ['part'], id: `s-${s.id}`, ariaLabelledby: isEl(head, 'h2') ? s.id : undefined }, s.nodes as ElementContent[]);
  });

  return { children: out, prose: { words, figures: fig, minutes: +minutes.toFixed(2), parts } };
}

// the Markdown processor's plugin: reshape the whole tree once, after the other visitors
export const prosePlugin = {
  name: 'prose',
  after(root: Readonly<Root>, ctx: { fileURL?: URL; data: Record<string, any>; replaceNode: (a: unknown, b: unknown) => void }) {
    if (!ctx.fileURL?.pathname.includes('/content/articles/')) return;
    const copy = JSON.parse(JSON.stringify(root.children)) as RootContent[];
    const { children, prose } = shape(copy);
    if (ctx.data.astro?.frontmatter) ctx.data.astro.frontmatter.prose = prose;
    ctx.replaceNode(root, { type: 'root', children });
  },
};
