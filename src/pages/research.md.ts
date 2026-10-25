import type { APIRoute } from 'astro';
import { researchMd } from '../lib/markdown';

// the research page's Markdown twin
export const GET: APIRoute = ({ site }) => new Response(researchMd(site!));
