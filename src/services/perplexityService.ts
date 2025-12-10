
// src/services/perplexityService.ts
import { GeminAnalysisResult, Language, AppSettings, TokenUsageData } from '../types';
import { SYSTEM_PROMPT } from './geminiService';

export type { TokenUsageData };

const MODELS = {
  // Standard
  sonar: { id: 'sonar', name: 'Sonar', inputCost: 0.001, outputCost: 0.001 },
  // High Intelligence
  gpt4: { id: 'sonar-pro', name: 'GPT-5.1 (via Sonar Pro)', inputCost: 0.003, outputCost: 0.015 },
  claude: { id: 'sonar-pro', name: 'Claude Sonnet 4.5 (via Sonar Pro)', inputCost: 0.003, outputCost: 0.015 },
  // Speed
  grok: { id: 'sonar', name: 'Grok 4.1 (via Sonar)', inputCost: 0.001, outputCost: 0.001 },
  // Reasoning
  kimi: { id: 'sonar-reasoning', name: 'Thinking Kimi K2 (via Sonar Reasoning)', inputCost: 0.003, outputCost: 0.015 },
};

export type ModelName = keyof typeof MODELS;

// --- Token Logging ---
class TokenLogger {
  private logs: TokenUsageData[] = [];
  private readonly maxLogs = 1000;

  log(data: TokenUsageData) {
    this.logs.push(data);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  getLogs(): TokenUsageData[] {
    return [...this.logs];
  }
}

export const tokenLogger = new TokenLogger();

const sanitizeMessages = (messages: any[]) => {
    const sanitized: any[] = [];
    const systemMsg = messages.find(m => m.role === 'system');
    if (systemMsg) sanitized.push(systemMsg);

    let conversation = messages
        .filter(m => m.role !== 'system')
        .filter(m => m.content && m.content.trim() !== "");

    if (conversation.length > 0 && conversation[0].role === 'assistant') {
        conversation.shift();
    }

    for (const msg of conversation) {
        if (sanitized.length === (systemMsg ? 1 : 0)) {
            sanitized.push(msg);
            continue;
        }
        const lastMsg = sanitized[sanitized.length - 1];
        if (msg.role === lastMsg.role) {
            lastMsg.content += "\n\n" + msg.content;
        } else {
            sanitized.push(msg);
        }
    }
    return sanitized;
};

/**
 * Main Analysis Function (Via Vercel API)
 */
export const analyzeUserQueryPerplexity = async (
  query: string,
  history: string[],
  language: Language = 'ru',
  model: ModelName = 'sonar',
  settings?: AppSettings
): Promise<GeminAnalysisResult & { usage?: TokenUsageData }> => {
  const startTime = Date.now();
  
  try {
    const modelConfig = MODELS[model] || MODELS.sonar; 

    // Prepare Prompt
    const recentHistory = history.slice(-6);
    const langInstruction = language === 'ru'
        ? "IMPORTANT: The 'chat_response' and 'label' in 'suggested_filters' MUST BE IN RUSSIAN. 'recommended_titles' MUST be in English."
        : "IMPORTANT: The 'chat_response' and 'label' in 'suggested_filters' MUST BE IN ENGLISH. 'recommended_titles' MUST be in English.";

    const rawMessages = [
        { role: 'system', content: SYSTEM_PROMPT + "\n" + langInstruction },
        ...recentHistory.map(h => {
            const match = h.match(/^(user|assistant):\s*(.*)/s);
            return match 
                ? { role: match[1] as 'user'|'assistant', content: match[2] } 
                : { role: 'user', content: h };
        }),
        { role: 'user', content: query }
    ];

    const messages = sanitizeMessages(rawMessages);

    console.log(`[Perplexity] Calling Vercel Function for ${modelConfig.name}...`);
    
    // Call Vercel Function
    const response = await fetch('/api/perplexity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: modelConfig.id,
            messages: messages,
            temperature: 0.7,
            max_tokens: 3000
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Perplexity API Error: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const responseTime = Date.now() - startTime;
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;
    const totalTokens = inputTokens + outputTokens;
    const totalCost = ((inputTokens / 1e6) * modelConfig.inputCost) + ((outputTokens / 1e6) * modelConfig.outputCost);

    const usage: TokenUsageData = {
      model: modelConfig.name,
      inputTokens,
      outputTokens,
      totalTokens,
      cost: totalCost,
      timestamp: new Date(),
      query: query.substring(0, 100),
      responseTime
    };
    tokenLogger.log(usage);

    const content = data.choices?.[0]?.message?.content || "";
    let cleanedResponse = content.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/\s*```$/, "").trim();
    
    const firstBrace = cleanedResponse.indexOf('{');
    const lastBrace = cleanedResponse.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        cleanedResponse = cleanedResponse.substring(firstBrace, lastBrace + 1);
    }

    let result: GeminAnalysisResult;
    try {
        result = JSON.parse(cleanedResponse);
    } catch (e) {
        console.error("Perplexity JSON Parse Error", cleanedResponse);
        throw new Error("Failed to parse Perplexity response JSON");
    }

    return { ...result, usage };

  } catch (error: any) {
    console.error("Perplexity Service Error:", error);
    throw error;
  }
};

export const getAvailableModels = () => {
  return Object.entries(MODELS).map(([key, config]) => ({
    key: key as ModelName,
    name: config.name,
  }));
};

export const callPerplexityAPI = async (
  prompt: string,
  model: ModelName = 'sonar',
  settings?: AppSettings
): Promise<{ response: string; usage: TokenUsageData }> => {
    const result = await analyzeUserQueryPerplexity(prompt, [], 'en', model, settings);
    return {
        response: JSON.stringify(result), 
        usage: result.usage!
    };
};
