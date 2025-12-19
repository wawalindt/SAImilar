import type { VercelRequest, VercelResponse } from '@vercel/node';

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { path, size = 'w500' } = req.query;

    if (!path || typeof path !== 'string') {
      res.status(400).send('Missing \"path\"');
      return;
    }

    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const imageUrl = `${TMDB_IMAGE_BASE}/${size}${cleanPath}`;

    const upstream = await fetch(imageUrl);

    if (!upstream.ok || !upstream.body) {
      res.status(upstream.status).send('TMDB image fetch failed');
      return;
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    const reader = upstream.body.getReader();
    res.status(200);
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) res.write(Buffer.from(value));
    }
    res.end();
  } catch (err) {
    console.error('image-proxy error', err);
    res.status(500).send('Image proxy error');
  }
}
