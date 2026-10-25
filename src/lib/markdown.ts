// The site as plain Markdown, for AI answer engines and agents that read text rather than
// HTML: llms.txt is the short index, llms-full.txt and index.md the home page, research.md
// the research page, and each article has a copy at its address with .md in place of the slash.

import { articles, fmt, href, series, type Article } from './articles';
import { bibtex, doiUrl, venue } from './cite';
import { bio, citedOn, contact, hero, links, meta, papers, path, principles, projects, recognition, research, systems, themes, travel, years } from './content';

const job = path.find((p) => p.kind === 'job' && p.to === undefined)!;
const name = hero.title[0];
const asOf = fmt(new Date(citedOn));
const facts = (site: URL) => [
  `- Role: ${job.role}, ${job.where}`,
  `- Research: ${research.stats.map((s) => `${s.value} ${s.label}`).join(', ')} (Google Scholar, ${asOf})`,
  `- Website: ${site.href}`,
  `- Email: ${links.email}`,
];
const profiles = [
  `- [GitHub](${links.github})`,
  `- [LinkedIn](${links.linkedin})`,
  `- [Google Scholar](${links.scholar})`,
  `- [X](${links.x})`,
];
const url = (site: URL, p: string) => new URL(p, site).href;
const md = (site: URL, a: Article) => url(site, `/articles/${a.id}.md`);

export async function llms(site: URL) {
  const list = await articles();
  return [
    `# ${name}`,
    '',
    `> ${meta.description}`,
    '',
    bio,
    '',
    ...facts(site),
    '',
    '## The site',
    '',
    `- [Home page](${site.href}): systems in production, research, projects, articles, experience and travel`,
    `- [Research](${url(site, '/research/')}): all ${papers.length} papers with authors, venues, DOIs and BibTeX ([Markdown](${url(site, '/research.md')}))`,
    `- [Articles](${url(site, '/articles/')}): ${list.length} articles on AI engineering, each also as Markdown`,
    `- [Full text](${url(site, '/llms-full.txt')}): everything on the home page as Markdown`,
    '',
    '## Profiles',
    '',
    ...profiles,
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- [${p.name}](${p.href}): ${p.text}`),
    '',
    '## Articles',
    '',
    ...list.map((a) => `- [${a.data.title}](${url(site, href(a))}): ${fmt(a.data.date)}. ${a.data.description} ([Markdown](${md(site, a)}))`),
    '',
  ].join('\n');
}

export async function full(site: URL) {
  const list = await articles();
  const paper = (p: (typeof papers)[number]) =>
    `- ${p.t}. ${p.v}, ${p.y}.${p.j ? ' Journal article.' : ''}${p.first ? ' First author.' : ''} ${doiUrl(p)}`;
  return [
    `# ${name}`,
    '',
    `${hero.title.join(' ')}`,
    '',
    hero.lede,
    '',
    ...facts(site),
    '',
    ...profiles,
    '',
    '## Systems in production',
    '',
    ...systems.flatMap((s) => [`### ${s.name}`, '', s.body, '', ...s.inside.map((i) => `- ${i}`), '', `Stack: ${s.stack}`, '']),
    '### Building for research',
    '',
    ...principles.map((p) => `- ${p.name} ${p.text}`),
    '',
    '## Research',
    '',
    research.stats.map((s) => `${s.value} ${s.label}`).join(' · '),
    '',
    '### Most cited',
    '',
    ...research.selected.map((p, i) => `${i + 1}. ${p.t}. ${p.v}, ${p.y}.${p.first ? ' First author.' : ''} ${p.c} citations.`),
    '',
    '### All papers, by theme',
    '',
    ...themes.flatMap((t) => [
      `#### ${t.name}`,
      '',
      ...papers.filter((p) => p.th === t.id).sort((a, b) => b.y - a.y).map(paper),
      '',
    ]),
    `Every paper with its authors, venue and BibTeX: ${url(site, '/research/')}`,
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- [${p.name}](${p.href}), ${p.year}: ${p.text}`),
    '',
    '## Articles',
    '',
    ...list.map((a) => `- [${a.data.title}](${url(site, href(a))}), ${fmt(a.data.date)}`),
    '',
    '## Experience',
    '',
    bio,
    '',
    ...path.map((p) => `- ${p.role}, ${p.where}, ${p.when}`),
    '',
    '### Recognition',
    '',
    ...recognition.map((r) => `- ${r.what}, ${r.where}`),
    '',
    '## Travel',
    '',
    travel.dek,
    '',
    `- Countries abroad: ${travel.countries.map((c) => c.name).join(', ')}`,
    `- States and union territories of India: ${travel.states.map((s) => s.replace(' & ', ' and ')).join(', ')}`,
    '',
    '## Contact',
    '',
    `${contact.intro} ${contact.home}`,
    '',
    `Email: ${links.email}`,
    '',
  ].join('\n');
}

export function researchMd(site: URL) {
  const theme = Object.fromEntries(themes.map((t) => [t.id, t.name]));
  const authors = (au: string) => au.replace('F. Ramoliya', '**F. Ramoliya**');
  return [
    '# Research',
    '',
    `${name}: all ${papers.length} peer-reviewed papers, newest first. ${research.stats.map((s) => `${s.value} ${s.label}`).join(' · ')} (Google Scholar, ${asOf}).`,
    '',
    `Page: ${url(site, '/research/')}`,
    '',
    ...[...years].reverse().flatMap((y) => [
      `## ${y}`,
      '',
      ...papers
        .filter((p) => p.y === y)
        .flatMap((p) => [
          `### ${p.id}. ${p.t}`,
          '',
          authors(p.au),
          '',
          `*${venue(p)}*. ${p.j ? 'Journal article' : 'Conference paper'} · ${theme[p.th]}${p.first ? ' · First author' : ''}`,
          '',
          `DOI: [${p.doi}](${doiUrl(p)})${p.c === undefined ? '' : ` · ${p.c} citations`}`,
          '',
          '```bibtex',
          bibtex(p),
          '```',
          '',
        ]),
    ]),
  ].join('\n');
}

// an article's text as written, with its figures as their descriptions and links made absolute
export function articleMd(site: URL, a: Article) {
  let n = 0;
  const stop = (s: string) => (/[.!?]["”’)]*$/.test(s) ? s : `${s}.`);
  const fig = (alt: string, title?: string) => `*Figure ${++n}. ${[alt, title].filter(Boolean).map(stop).join(' ')}*`;
  const body = (a.body ?? '')
    .replace(/\[!\[([^\]]*)\]\([^)\s]+(?:\s+"([^"]*)")?\)\]\(([^)]+)\)/g, (_, alt, title, link) => `${fig(alt, title)} (${link})`)
    .replace(/!\[([^\]]*)\]\([^)\s]+(?:\s+"([^"]*)")?\)/g, (_, alt, title) => fig(alt, title))
    .replace(/\]\(\//g, `](${site.origin}/`);
  return [
    `# ${a.data.title}`,
    '',
    [name, fmt(a.data.date), a.data.series && `${series}, ${a.data.series}`].filter(Boolean).join(' · '),
    '',
    `Page: ${url(site, href(a))}`,
    `First published on X: ${a.data.x}`,
    '',
    body.trim(),
    '',
  ].join('\n');
}
