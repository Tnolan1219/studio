import { defineConfig } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';

export default defineConfig({
  plugins: [
    googleAI({
      // apiKey: process.env.GEMINI_API_KEY, // API key is optional if GOOGLE_API_KEY is set
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
