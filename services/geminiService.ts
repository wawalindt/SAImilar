
/**
 * Unified AI Analysis Service
 * Secured via Vercel Functions
 */

import { GeminAnalysisResult, MovieSummary, Language, AppSettings, TokenUsageData } from '../types';
import { getCachedSummary, cacheSummary } from './storageService';
import {
  analyzeUserQueryPerplexity,
  callPerplexityAPI,
  ModelName
} from './perplexityService';

export const SYSTEM_PROMPT = `
You are SAImilar, a world-class movie and TV curator.
You DO NOT just search for keywords. You understand the "vibe" and specific topics.

YOUR GOALS:

1. **Analyze the Request**:
- Is it a new topic? (e.g., "movies about space")
- Is it a refinement of the previous topic? (e.g., "make it scary", "add thriller", "remove old movies")
- **CRITICAL**: If it is a refinement, you MUST MERGE it with the previous topic found in the History.
- Do not lose the original context (e.g. if history was "shipwrecks" and user adds "thriller", look for "shipwreck thrillers").

2. **Determine Media Type**:
- 'movie': Live action movies. (Do NOT include TV series or Anime unless asked).
- 'tv': TV Series.
- 'anime': Japanese animation.
- **STRICT SEPARATION**: If user asks for "movies", do NOT suggest TV shows or Anime.

3. **Generate Recommendations**:
- **PRIMARY METHOD**: Generate a list of 5-10 SPECIFIC \`recommended_titles\` (in English or original title) that perfectly match the user's need.
- This is the most important part. You are the recommendation engine.
- For "shipwrecks", examples: "Titanic", "Life of Pi", "Cast Away", "Triangle of Sadness", "The Perfect Storm".
- Do NOT just search for the word "shipwreck". Find films *about* it.

4. **Output Format**:
- JSON only.

STRUCTURE:
{
  "query_type": "TYPE_1_DESCRIPTIVE" | "TYPE_2_SPECIFIC_FILM" | "TYPE_3_GENERAL",
  "media_type": "movie" | "tv" | "anime",
  "recommended_titles": ["Title 1", "Title 2", ...],
  "search_parameters": {
    "genres": [...],
    "similar_to_movie": "string (only if TYPE_2)",
    "mood": "string"
  },
  "chat_response": "Short friendly text in the requested language...",
  "suggested_filters": [
    { "category": "Genre", "label": "Label in Language", "value": "genre_keyword" }
  ]
}
`;

/**
 * Analyze user query with automatic provider selection
 */
export const analyzeUserQuery = async (
  query: string,
  history: string[],
  language: Language = 'ru',
  settings?: AppSettings
): Promise<GeminAnalysisResult & { usage?: TokenUsageData }> => {
  
  let provider = settings?.provider || 'gemini';
  let model: ModelName = 'sonar'; // Default perplexity model

  // Determine effective model/provider
  const effectiveModel = settings?.modelOverride || settings?.activeModel;

  if (effectiveModel) {
      if (effectiveModel === 'gemini') {
          provider = 'gemini';
      } else {
          provider = 'perplexity';
          model = effectiveModel as ModelName;
      }
  }

  try {
    if (provider === 'perplexity') {
      return await analyzeUserQueryPerplexity(query, history, language, model, settings);
    } else {
      // Default to Gemini
      return await analyzeUserQueryGemini(query, history, language, settings);
    }
  } catch (error: any) {
    console.error(`Error with ${provider} provider:`, error);
    
    // Fallback to Gemini if Perplexity fails
    if (provider === 'perplexity' && !settings?.modelOverride) {
      return await analyzeUserQueryGemini(query, history, language, settings);
    }
    throw error;
  }
};

/**
 * Gemini-specific analysis (Via Vercel API)
 */
const analyzeUserQueryGemini = async (
  query: string,
  history: string[],
  language: Language = 'ru',
  settings?: AppSettings
): Promise<GeminAnalysisResult & { usage?: TokenUsageData }> => {
  const startTime = Date.now();
  try {
    const langInstruction = language === 'ru'
      ? "IMPORTANT: The 'chat_response' and 'label' in 'suggested_filters' MUST BE IN RUSSIAN. 'recommended_titles' MUST be in English."
      : "IMPORTANT: The 'chat_response' and 'label' in 'suggested_filters' MUST BE IN ENGLISH. 'recommended_titles' MUST be in English.";

    const recentHistory = history.slice(-6).join('\n');
    const prompt = `
Conversation History:
${recentHistory}

Current User Input: "${query}"

Instructions:
- Analyze the input in context of history.
- If input is a filter click (e.g. "Applying filter: Thriller"), REFINE the previous recommendations.
- Generate specific 'recommended_titles'.
- Respond ONLY with valid JSON.
      `;

    // Call Vercel Function
    const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: prompt,
            systemInstruction: SYSTEM_PROMPT + "\n" + langInstruction,
            responseMimeType: "application/json",
            model: 'gemini-2.5-flash'
        })
    });

    if (!response.ok) throw new Error("Gemini API call failed");

    const data = await response.json();
    let text = data.text;
    
    if (!text) throw new Error("No response from Gemini API");

    // Capture Token Usage
    const usageMeta = data.usageMetadata;
    const inputTokens = usageMeta?.promptTokenCount || 0;
    const outputTokens = usageMeta?.candidatesTokenCount || 0;
    const totalTokens = usageMeta?.totalTokenCount || (inputTokens + outputTokens);
    
    const cost = ((inputTokens / 1_000_000) * 0.075) + ((outputTokens / 1_000_000) * 0.30); 

    const usage: TokenUsageData = {
        model: 'Gemini 2.5 Flash',
        inputTokens,
        outputTokens,
        totalTokens,
        cost,
        timestamp: new Date(),
        query: query.substring(0, 50),
        responseTime: Date.now() - startTime
    };

    // CLEANUP: Remove markdown code blocks if present
    text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();

    try {
        const result = JSON.parse(text) as GeminAnalysisResult;
        return { ...result, usage };
    } catch (parseError) {
        console.error("JSON Parse Error:", parseError, "Raw Text:", text);
        throw new Error("Failed to parse AI response");
    }

  } catch (error: any) {
    console.error("Gemini Analysis Error:", error);
    
    const errStr = JSON.stringify(error);
    const isQuotaError = errStr.includes("429") || errStr.includes("RESOURCE_EXHAUSTED");

    if (isQuotaError) {
      return {
        query_type: 'TYPE_3_GENERAL',
        media_type: 'movie',
        recommended_titles: [],
        search_parameters: {},
        chat_response: language === 'ru'
          ? "Мои нейронные сети перегружены (лимит запросов). Я переключился на обычный поиск по названию."
          : "My neural networks are overloaded (quota exceeded). I've switched to standard title search.",
        suggested_filters: [],
        isFallback: true
      };
    }

    return {
      query_type: 'TYPE_3_GENERAL',
      media_type: 'movie',
      recommended_titles: [],
      search_parameters: {},
      chat_response: language === 'ru'
        ? "Произошла ошибка при анализе запроса. Попробуйте переформулировать."
        : "An error occurred while analyzing your request. Please try rephrasing.",
      suggested_filters: []
    };
  }
};

/**
 * Generate spoiler-free summary (primarily uses Gemini, can use Perplexity as fallback)
 */
export const generateSpoilerFreeSummary = async (
  movieTitle: string,
  movieData: any,
  language: Language = 'ru',
  settings?: AppSettings
): Promise<MovieSummary> => {
  // Check cache first
  const cached = getCachedSummary(movieData.id, language);
  if (cached) {
    return cached;
  }

  try {
    const provider = settings?.provider || 'gemini';
    let summary: MovieSummary;

    if (provider === 'perplexity') {
      try {
        summary = await generateSummaryPerplexity(movieTitle, movieData, language, settings);
      } catch (e) {
        summary = await generateSummaryGemini(movieTitle, movieData, language, settings);
      }
    } else {
      summary = await generateSummaryGemini(movieTitle, movieData, language, settings);
    }

    cacheSummary(movieData.id, language, summary);
    return summary;
  } catch (error) {
    console.error("Error generating summary:", error);
    return {
      summary: movieData.overview || (language === 'ru' ? "Описание недоступно." : "No summary available."),
      tone: "Unknown",
      spoiler_risk: 0
    };
  }
};

/**
 * Gemini-based summary generation (Via Vercel API)
 */
const generateSummaryGemini = async (
  movieTitle: string,
  movieData: any,
  language: Language = 'ru',
  settings?: AppSettings
): Promise<MovieSummary> => {
  const langInstruction = language === 'ru' ? "WRITE THE SUMMARY IN RUSSIAN." : "WRITE THE SUMMARY IN ENGLISH.";

  const prompt = `
TASK: Write a gripping, SPOILER-FREE summary for the title "${movieTitle}".
Data: ${JSON.stringify(movieData)}

RULES:
1. One sentence capturing the MAIN SENSATION.
2. 2-3 sentences on what happens (DIRECTION/ATMOSPHERE only, NO PLOT TWISTS).
3. Describe the TONE.
4. Suggest who it is for.
5. NO SPOILERS.
6. ${langInstruction}

Output JSON:
{
  "summary": "...",
  "tone": "...",
  "spoiler_risk": 0.0
}
  `;

  const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          contents: prompt,
          responseMimeType: "application/json",
          model: 'gemini-2.5-flash'
      })
  });

  if (!response.ok) throw new Error("Gemini API call failed");
  const data = await response.json();
  let text = data.text;

  if (text) {
      text = text.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
      return JSON.parse(text) as MovieSummary;
  }
  throw new Error("Empty response for summary");
};

/**
 * Perplexity-based summary generation
 */
const generateSummaryPerplexity = async (
  movieTitle: string,
  movieData: any,
  language: Language = 'ru',
  settings?: AppSettings
): Promise<MovieSummary> => {
  const langInstruction = language === 'ru' ? "WRITE THE SUMMARY IN RUSSIAN." : "WRITE THE SUMMARY IN ENGLISH.";

  const prompt = `
TASK: Write a gripping, SPOILER-FREE summary for the title "${movieTitle}".
Data: ${JSON.stringify(movieData)}

RULES:
1. One sentence capturing the MAIN SENSATION.
2. 2-3 sentences on what happens (DIRECTION/ATMOSPHERE only, NO PLOT TWISTS).
3. Describe the TONE.
4. Suggest who it is for.
5. NO SPOILERS.
6. ${langInstruction}

Respond ONLY with valid JSON:
{
  "summary": "...",
  "tone": "...",
  "spoiler_risk": 0.0
}
  `;

  const { response } = await callPerplexityAPI(
    prompt,
    'sonar',
    settings
  );

  return JSON.parse(response) as MovieSummary;
};

export { tokenLogger } from './perplexityService';
export type { TokenUsageData } from './perplexityService';
