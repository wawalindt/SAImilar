
// src/config.ts

/**
 * CONFIGURATION
 * 
 * Sensitive API Keys have been moved to Firebase Cloud Functions (Secret Manager).
 * Do not add real keys here.
 */

export const API_KEYS = {
  // Keys are injected on the backend
  GEMINI: '', 
  PERPLEXITY: '',
  TMDB: '',
};

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

// Validation checks only Firebase config now
export const validateApiKeys = () => {
  if (!FIREBASE_CONFIG.apiKey) {
    console.warn('⚠️ Missing Firebase Configuration');
    return false;
  }
  return true;
};
