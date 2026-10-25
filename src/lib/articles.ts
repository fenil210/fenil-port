// The articles collection, newest first, with what the pages need from each: its address,
// its date as the site writes dates, and how long it takes to read.

import { getCollection, render, type CollectionEntry } from 'astro:content';
import type { Prose } from './prose';

export type Article = CollectionEntry<'articles'>;

export const series = 'Field Notes: AI Engineering';

export const href = (a: Article) => `/articles/${a.id}/`;

export const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const iso = (d: Date) => d.toISOString().slice(0, 10);

// whole minutes, never under one
export const mins = (m: number) => Math.max(1, Math.round(m));

export async function articles() {
  return (await getCollection('articles')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

// the collection with each article's rendered body and the counts the prose plugin made
export async function rendered() {
  return Promise.all(
    (await articles()).map(async (a) => {
      const r = await render(a);
      return { ...a, ...r, prose: r.remarkPluginFrontmatter.prose as Prose };
    }),
  );
}
