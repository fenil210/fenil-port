// Each page's structured data: one JSON-LD graph built from the same content the page
// shows, so it can never say more than a reader can see.

import { doiUrl } from './cite';
import { bio, hero, links, meta, papers, path, projects, recognition, research, systems, themes, type Paper } from './content';

// the work account; its repositories hold some of the projects
const githubWork = 'https://github.com/fenil210-cactus';

export function graph(site: URL) {
  const { title } = meta;
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
        description: bio,
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
      // the papers the page lists, as the same entities the research page describes in full
      ...research.selected.map((p) => cited(site, p)),
    ],
  };
}

const personRef = (site: URL) => ({ '@id': `${site.href}#person` });
// pages other than the home page name the person briefly, so their graph stands on its own
const personNode = (site: URL) => ({
  '@type': 'Person',
  ...personRef(site),
  name: hero.title[0],
  url: site.href,
  sameAs: [links.github, githubWork, links.linkedin, links.scholar, links.x],
});
// and the site and the blog they belong to, by the same @id the home page and /articles/ use
const siteRef = (site: URL) => ({ '@type': 'WebSite', '@id': `${site.href}#website`, url: site.href, name: hero.title[0] });
const blogRef = (site: URL) => {
  const url = new URL('/articles/', site).href;
  return { '@type': 'Blog', '@id': `${url}#blog`, url, name: `Articles · ${hero.title[0]}` };
};

// only article pages have one: the "Articles" link above the title
function crumbs(site: URL, page: string, trail: [string, string][]) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${new URL(page, site).href}#breadcrumb`,
    itemListElement: [['Home', '/'], ...trail].map(([name, at], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: new URL(at, site).href,
    })),
  };
}

// on the home page a paper is only what the page shows of it; /research/ has the whole entry under the same @id
function cited(site: URL, p: Paper) {
  const at = `${new URL('/research/', site).href}#${p.id}`;
  return {
    '@type': 'ScholarlyArticle',
    '@id': at,
    headline: p.t,
    url: at,
    sameAs: doiUrl(p),
    datePublished: String(p.y),
    isPartOf: { '@type': p.j ? 'Periodical' : 'CreativeWork', name: p.v },
  };
}

function scholarly(site: URL, p: Paper) {
  return {
    '@type': 'ScholarlyArticle',
    '@id': `${new URL('/research/', site).href}#${p.id}`,
    headline: p.t,
    name: p.t,
    url: doiUrl(p),
    sameAs: doiUrl(p),
    identifier: { '@type': 'PropertyValue', propertyID: 'DOI', value: p.doi },
    datePublished: String(p.y),
    author: p.au.split(', ').map((a) => (a === 'F. Ramoliya' ? personRef(site) : { '@type': 'Person', name: a })),
    // journals are periodicals; conference proceedings are plain works
    isPartOf: { '@type': p.j ? 'Periodical' : 'CreativeWork', name: p.vf },
    about: { '@type': 'Thing', name: themes.find((t) => t.id === p.th)!.name },
  };
}

export function researchGraph(site: URL, description: string) {
  const url = new URL('/research/', site).href;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${url}#page`,
        url,
        name: `Research · ${hero.title[0]}`,
        description,
        isPartOf: siteRef(site),
        about: personRef(site),
        mainEntity: { '@id': `${url}#papers` },
      },
      {
        '@type': 'ItemList',
        '@id': `${url}#papers`,
        name: 'Peer-reviewed papers',
        numberOfItems: papers.length,
        itemListElement: papers.map((p, i) => ({ '@type': 'ListItem', position: i + 1, item: { '@id': `${url}#${p.id}` } })),
      },
      ...papers.map((p) => scholarly(site, p)),
      personNode(site),
    ],
  };
}

export interface Post {
  title: string;
  description: string;
  path: string;
  date: Date;
  x: string;
  image?: { url: string; alt: string; width: number; height: number; type?: string };
  words?: number;
}

const posting = (site: URL, a: Post) => ({
  '@type': 'BlogPosting',
  '@id': `${new URL(a.path, site).href}#article`,
  headline: a.title,
  url: new URL(a.path, site).href,
  datePublished: a.date.toISOString(),
  author: personRef(site),
});

export function articlesGraph(site: URL, description: string, list: Post[]) {
  const url = new URL('/articles/', site).href;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Blog',
        '@id': `${url}#blog`,
        url,
        name: `Articles · ${hero.title[0]}`,
        description,
        inLanguage: 'en',
        author: personRef(site),
        publisher: personRef(site),
        isPartOf: siteRef(site),
        blogPost: list.map((a) => posting(site, a)),
      },
      personNode(site),
    ],
  };
}

export function articleGraph(site: URL, a: Post) {
  const url = new URL(a.path, site).href;
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        ...posting(site, a),
        description: a.description,
        dateModified: a.date.toISOString(),
        ...(a.image && {
          image: { '@type': 'ImageObject', url: a.image.url, width: a.image.width, height: a.image.height, encodingFormat: a.image.type, caption: a.image.alt },
        }),
        author: personRef(site),
        publisher: personRef(site),
        mainEntityOfPage: url,
        isPartOf: blogRef(site),
        inLanguage: 'en',
        wordCount: a.words,
        // first published on X, where the replies are
        discussionUrl: a.x,
        breadcrumb: { '@id': `${url}#breadcrumb` },
      },
      personNode(site),
      crumbs(site, a.path, [
        ['Articles', '/articles/'],
        [a.title, a.path],
      ]),
    ],
  };
}

// JSON inside a script tag: escape "<" so no string can close the tag early
export const jsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c');
