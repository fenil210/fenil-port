import type { APIRoute } from 'astro';
import { full } from '../lib/markdown';

// the home page's Markdown twin, at the address agents try first (/index.md)
export const GET: APIRoute = async ({ site }) => new Response(await full(site!));
