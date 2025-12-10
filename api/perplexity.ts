import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { model, messages, temperature, max_tokens } = req.body;
  const apiKey = process.env.PERPLEXITY_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: PERPLEXITY_API_KEY missing' });
  }

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model || 'sonar',
        messages: messages,
        temperature: temperature || 0.7,
        max_tokens: max_tokens || 3000,
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({ error: `Perplexity API Error: ${response.status} - ${errText}` });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('Perplexity Proxy Error:', error);
    return res.status(500).json({ error: "Perplexity API Connection Failed", details: error.message });
  }
}