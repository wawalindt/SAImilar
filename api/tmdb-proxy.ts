import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { endpoint, params } = req.body || {};
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'TMDB_API_KEY missing' });
  }

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const baseUrl = 'https://api.themoviedb.org/3';
  const queryParams = new URLSearchParams({
    api_key: apiKey,
    ...(params || {}),
  });

  try {
    const tmdbRes = await fetch(`${baseUrl}${endpoint}?${queryParams.toString()}`);
    if (!tmdbRes.ok) {
      return res.status(tmdbRes.status).json({ error: `TMDB Error: ${tmdbRes.statusText}` });
    }

    const data = await tmdbRes.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('TMDB Proxy Error:', error);
    return res.status(500).json({ error: 'Failed to fetch from TMDB', details: error.message });
  }
}
