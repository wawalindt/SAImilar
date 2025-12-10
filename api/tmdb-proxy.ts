import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Allow CORS if needed, or rely on Vercel's same-origin handling for internal APIs
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { endpoint, params } = req.body;
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: TMDB_API_KEY missing' });
  }

  if (!endpoint) {
    return res.status(400).json({ error: 'Endpoint is required' });
  }

  const baseUrl = 'https://api.themoviedb.org/3';
  
  // Construct query parameters
  const queryParams = new URLSearchParams({
    api_key: apiKey,
    ...params
  });

  try {
    const tmdbRes = await fetch(`${baseUrl}${endpoint}?${queryParams}`);
    
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