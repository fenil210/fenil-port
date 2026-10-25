import type { APIRoute } from 'astro';
import { llms } from '../lib/markdown';

// https://llmstxt.org
export const GET: APIRoute = ({ site }) => new Response(llms(site!));
