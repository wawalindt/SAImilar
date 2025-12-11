
import { MovieSummary, AppSettings } from '../types';

const KEYS = {
  SETTINGS: 'saimilar_settings',
  CACHE_SUMMARIES: 'saimilar_cache_summaries',
};

const CACHE_TTL = 1000 * 60 * 60 * 24 * 3; // 3 Days

// --- SETTINGS (Global Device Settings - Stored Locally) ---

export const getSettings = (): AppSettings => {
  try {
    const data = localStorage.getItem(KEYS.SETTINGS);
    const defaultSettings: AppSettings = { 
        provider: 'perplexity', // Default to perplexity for GPT-5.1
        apiKeys: {}, 
        language: 'ru',
        theme: 'dark',
        activeModel: 'gpt4' // Default to GPT-5.1 (mapped to sonar-pro)
    };
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  } catch {
    return { 
        provider: 'perplexity', 
        apiKeys: {}, 
        language: 'ru',
        theme: 'dark',
        activeModel: 'gpt4'
    };
  }
};

export const saveSettings = (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
};

// --- CACHING (Global) ---

interface CacheEntry<T> { data: T; timestamp: number; }

export const getCachedSummary = (movieId: number, lang: string): MovieSummary | null => {
  try {
    const key = `${movieId}_${lang}`;
    const cacheRaw = localStorage.getItem(KEYS.CACHE_SUMMARIES);
    if (!cacheRaw) return null;
    const cache = JSON.parse(cacheRaw) as Record<string, CacheEntry<MovieSummary>>;
    const entry = cache[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > CACHE_TTL) return null;
    return entry.data;
  } catch { return null; }
};

export const cacheSummary = (movieId: number, lang: string, summary: MovieSummary) => {
  try {
    const key = `${movieId}_${lang}`;
    const cacheRaw = localStorage.getItem(KEYS.CACHE_SUMMARIES);
    const cache = cacheRaw ? JSON.parse(cacheRaw) : {};
    cache[key] = { data: summary, timestamp: Date.now() };
    localStorage.setItem(KEYS.CACHE_SUMMARIES, JSON.stringify(cache));
  } catch (e) { console.warn("Cache quota"); }
};
