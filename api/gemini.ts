import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { contents, systemInstruction, model, responseMimeType } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Server configuration error: GEMINI_API_KEY missing' });
  }

  const ai = new GoogleGenAI({ apiKey: apiKey });

  try {
    const response = await ai.models.generateContent({
      model: model || 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: responseMimeType
      }
    });

    // Return the text and usage metadata
    return res.status(200).json({
      text: response.text,
      usageMetadata: response.usageMetadata
    });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({ error: "Gemini API Failed", details: error.message });
  }
}