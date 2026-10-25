import type { APIRoute, GetStaticPaths } from 'astro';
import { articles, type Article } from '../../lib/articles';
import { articleMd } from '../../lib/markdown';

// each article as the Markdown it was written in, at /articles/<slug>.md
export const getStaticPaths = (async () => (await articles()).map((a) => ({ params: { slug: a.id }, props: { a } }))) satisfies GetStaticPaths;

export const GET: APIRoute<{ a: Article }> = ({ site, props }) => new Response(articleMd(site!, props.a));
