// The page's structured data: one JSON-LD graph built from the same content the page
// shows, so it can never say more than a reader can see.

import { hero, links, meta, path, projects, recognition, research, systems, themes } from './content';

// the work account; its repositories hold some of the projects
const githubWork = 'https://github.com/fenil210-cactus';

export function graph(site: URL) {
  const { title, description } = meta;
  const url = site.href;
  const person = { '@id': `${url}#person` };
  const job = path.find((p) => p.kind === 'job' && p.to === undefined)!;
  const study = path.find((p) => p.kind === 'study')!;
  // stints read "Organisation · detail"
  const org = (where: string) => where.split(' · ')[0];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${url}#website`,
        url,
        name: hero.title[0],
        inLanguage: 'en',
        publisher: person,
      },
      {
        '@type': 'ProfilePage',
        '@id': `${url}#profile`,
        url,
        name: title,
        isPartOf: { '@id': `${url}#website` },
        mainEntity: person,
      },
      {
        '@type': 'Person',
        ...person,
        name: hero.title[0],
        url,
        description,
        jobTitle: job.role,
        worksFor: { '@type': 'Organization', name: org(job.where) },
        alumniOf: { '@type': 'CollegeOrUniversity', name: org(study.where) },
        // as the contact section says
        homeLocation: {
          '@type': 'Place',
          name: 'Mumbai, India',
          address: { '@type': 'PostalAddress', addressLocality: 'Mumbai', addressCountry: 'IN' },
        },
        email: links.email,
        sameAs: [links.github, githubWork, links.linkedin, links.scholar, links.x],
        knowsAbout: [...systems.map((s) => s.name), ...themes.map((t) => t.name)],
        award: recognition.filter((r) => r.award).map((r) => `${r.what}, ${r.where}`),
      },
      ...projects.map((p) => ({
        '@type': 'SoftwareSourceCode',
        name: p.name,
        description: p.text,
        codeRepository: p.href,
        url: p.href,
        dateCreated: p.year,
        author: person,
      })),
      // only the papers listed on the page; the full list lives on Google Scholar
      ...research.selected.map((p) => ({
        '@type': 'ScholarlyArticle',
        headline: p.title,
        name: p.title,
        datePublished: p.year,
        isPartOf: { '@type': 'Periodical', name: p.venue },
        author: person,
      })),
    ],
  };
}

// JSON inside a script tag: escape "<" so no string can close the tag early
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
