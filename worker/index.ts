// The site is static files, with one exception: iPhones play a video only from a server that
// answers byte-range requests, and static assets are always sent whole. So the link preview
// video comes through here and is cut to the range asked for.
interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const whole = await env.ASSETS.fetch(request);
    if (whole.status !== 200) return whole;
    const headers = new Headers(whole.headers);
    headers.set('accept-ranges', 'bytes');
    const asked = request.headers.get('range')?.match(/^bytes=(\d*)-(\d*)$/);
    if (request.method !== 'GET' || !asked || (!asked[1] && !asked[2])) return new Response(whole.body, { headers });

    const body = await whole.arrayBuffer();
    const size = body.byteLength;
    // "bytes=-500" asks for the last 500 bytes
    const start = asked[1] ? Number(asked[1]) : Math.max(0, size - Number(asked[2]));
    const end = asked[1] && asked[2] ? Math.min(Number(asked[2]), size - 1) : size - 1;
    if (start >= size || start > end) {
      return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    }
    headers.set('content-range', `bytes ${start}-${end}/${size}`);
    headers.set('content-length', String(end - start + 1));
    return new Response(body.slice(start, end + 1), { status: 206, headers });
  },
};
