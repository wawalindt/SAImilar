export const config = {
  runtime: 'edge',
};

export default async function handler(req: Request) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const TMDB_API_KEY = process.env.TMDB_API_KEY; 
    
    if (!TMDB_API_KEY) {
      return new Response(JSON.stringify({ error: 'Server configuration error: TMDB Key missing' }), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    const { endpoint, params } = await req.json();

    if (!endpoint) {
      return new Response(JSON.stringify({ error: 'Missing endpoint' }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      });
    }

    const baseUrl = 'https://api.themoviedb.org/3';
    const url = new URL(`${baseUrl}${endpoint}`);
    
    url.searchParams.append('api_key', TMDB_API_KEY);
    
    if (params) {
      Object.keys(params).forEach(key => {
        url.searchParams.append(key, params[key]);
      });
    }

    const tmdbResponse = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      }
    });

    const data = await tmdbResponse.json();

    return new Response(JSON.stringify(data), {
      status: tmdbResponse.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
}