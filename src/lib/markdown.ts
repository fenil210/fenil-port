// The page as plain Markdown, for AI answer engines and agents that read text rather
// than HTML: llms.txt is the short index, llms-full.txt and index.md the whole page.

import { contact, hero, links, meta, papers, path, principles, projects, recognition, research, systems, themes, travel, writing } from './content';

const fmt = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const job = path.find((p) => p.kind === 'job' && p.to === undefined)!;
const name = hero.title[0];
const facts = (site: URL) => [
  `- Role: ${job.role}, ${job.where}`,
  `- Based in: Mumbai, India`,
  `- Research: ${research.stats.map((s) => `${s.value} ${s.label}`).join(', ')} (Google Scholar)`,
  `- Website: ${site.href}`,
  `- Email: ${links.email}`,
];
const profiles = [
  `- [GitHub](${links.github})`,
  `- [LinkedIn](${links.linkedin})`,
  `- [Google Scholar](${links.scholar})`,
  `- [X](${links.x})`,
];

export function llms(site: URL) {
  return [
    `# ${name}`,
    '',
    `> ${meta.description}`,
    '',
    hero.lede,
    '',
    ...facts(site),
    '',
    '## The site',
    '',
    `- [Home page](${site.href}): systems in production, research, projects, articles, experience and travel, on one page`,
    `- [Full text](${new URL('/llms-full.txt', site)}): everything on the home page as Markdown`,
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
    ...writing.map((w) => `- [${w.title}](${w.href}): ${fmt(w.date)}`),
    '',
  ].join('\n');
}

export function full(site: URL) {
  const paper = (p: (typeof papers)[number]) =>
    `- ${p.t}. ${p.v}, ${p.y}.${p.j ? ' Journal article.' : ''}${p.first ? ' First author.' : ''}`;
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
    ...research.selected.map(
      (p, i) => `${i + 1}. ${p.title}. ${p.venue}, ${p.year}.${p.first ? ' First author.' : ''} ${p.cites} citations.`,
    ),
    '',
    '### All papers, by theme',
    '',
    ...themes.flatMap((t) => [
      `#### ${t.name}`,
      '',
      ...papers.filter((p) => p.th === t.id).sort((a, b) => b.y - a.y).map(paper),
      '',
    ]),
    `All papers on Google Scholar: ${links.scholar}`,
    '',
    '## Projects',
    '',
    ...projects.map((p) => `- [${p.name}](${p.href}), ${p.year}: ${p.text}`),
    '',
    '## Articles',
    '',
    ...writing.map((w) => `- [${w.title}](${w.href}), ${fmt(w.date)}`),
    '',
    '## Experience',
    '',
    ...path.map((p) => `- ${p.role}, ${p.where}, ${p.when}`),
    '',
    '### Recognition',
    '',
    ...recognition.map((r) => `- ${r.what}, ${r.where}`),
    '',
    '## Elsewhere',
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
