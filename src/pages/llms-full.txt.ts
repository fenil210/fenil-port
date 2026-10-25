import type { APIRoute } from 'astro';
import { full } from '../lib/markdown';

export const GET: APIRoute = ({ site }) => new Response(full(site!));
