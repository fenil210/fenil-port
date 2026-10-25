import type { APIRoute } from 'astro';
import { full } from '../lib/markdown';

export const GET: APIRoute = async ({ site }) => new Response(await full(site!));
