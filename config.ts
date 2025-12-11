// Firebase configuration
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAQhgQhGB83nGu5Xz7zA1Z2cVAohBVoVTA",
  authDomain: "saimilar-a41e0.firebaseapp.com",
  projectId: "saimilar-a41e0",
  storageBucket: "saimilar-a41e0.firebasestorage.app",
  messagingSenderId: "1027027097896",
  appId: "1:1027027097896:web:7fab77f543947539fa581d",
  measurementId: "G-V8XGJF55SH"
};

// API Keys configuration
// Если здесь есть ключи, приложение будет использовать их напрямую (Direct API Call).
export const API_KEYS = {
  GEMINI: '', 
  PERPLEXITY: '',
  TMDB: '',
};

export const validateApiKeys = () => {
  if (API_KEYS.TMDB && API_KEYS.GEMINI) {
    console.log('🔓 Using Client-Side Keys from config.ts');
    return true;
  }
  console.log('🔒 Using Server-Side Proxies (/api/*)');
  return true;
};
