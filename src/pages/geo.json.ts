import { atlas } from '../lib/atlas';

// the globe's outlines, fetched by the browser once the travel section is near
export const GET = () => new Response(JSON.stringify(atlas), { headers: { 'Content-Type': 'application/json' } });
