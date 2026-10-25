// How a paper is cited: its venue line as the research page prints it, and a BibTeX entry.

import type { Paper } from './content';

export const doiUrl = (p: Paper) => `https://doi.org/${p.doi}`;

// at is "16, 14093", "8(2), e70009", "12, 23319–23337" or just pages, "186–191"
const parts = (p: Paper) => {
  const m = p.at.match(/^(\d+)(?:\((\d+)\))?, (.+)$/);
  return m ? { volume: m[1], number: m[2], pages: m[3] } : { pages: p.at };
};

export function venue(p: Paper) {
  const { volume, number, pages } = parts(p);
  if (volume) return `${p.vf} ${volume}${number ? `(${number})` : ''}, ${pages}`;
  return pages.includes('–') ? `${p.vf}, pp. ${pages}` : `${p.vf}, article ${pages}`;
}

export function bibtex(p: Paper) {
  const { volume, number, pages } = parts(p);
  const first = p.au.split(', ')[0].split(' ').at(-1)!.toLowerCase();
  const word = p.t.split(/[^A-Za-z]+/).find((w) => w.length > 3)!.toLowerCase();
  const fields: [string, string | undefined][] = [
    ['author', p.au.split(', ').join(' and ')],
    ['title', `{${p.t}}`],
    [p.j ? 'journal' : 'booktitle', p.vf],
    ['volume', volume],
    ['number', number],
    ['pages', pages.replace('–', '--')],
    ['year', String(p.y)],
    ['doi', p.doi],
  ];
  const body = fields
    .filter(([, v]) => v)
    .map(([k, v]) => `  ${k} = {${v}}`)
    .join(',\n');
  return `@${p.j ? 'article' : 'inproceedings'}{${first}${p.y}${word},\n${body}\n}`;
}
