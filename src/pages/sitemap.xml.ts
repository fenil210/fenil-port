import type { APIRoute } from 'astro';
import { articles, href, iso } from '../lib/articles';
import { citedOn } from '../lib/content';

// every deploy is a fresh build, so the home page last changed at the build; an article when it was published
export const GET: APIRoute = async ({ site }) => {
  const list = await articles();
  const urls: [string, string][] = [
    ['/', iso(new Date())],
    ['/research/', citedOn],
    ['/articles/', iso(list[0].data.date)],
    ...list.map((a): [string, string] => [href(a), iso(a.data.date)]),
  ];
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(([p, d]) => `  <url>\n    <loc>${new URL(p, site)}</loc>\n    <lastmod>${d}</lastmod>\n  </url>`).join('\n')}
</urlset>
`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
  );
};
