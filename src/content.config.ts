import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// the articles, each in a folder with its images; all were first published on X
const articles = defineCollection({
  loader: glob({ pattern: '*/index.md', base: './src/content/articles' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string().max(160),
      date: z.coerce.date(),
      // the post on X, which carries the replies
      x: z.url(),
      // the card made for X; here it is the image when the article is shared
      cover: image(),
      coverAlt: z.string(),
      // the part number in Field Notes: AI Engineering
      series: z.string().optional(),
    }),
});

export const collections = { articles };
