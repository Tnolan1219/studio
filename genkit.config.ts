
import { defineConfig } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from 'genkitx-openai';

export default defineConfig({
  plugins: [
    googleAI(), // Assumes GOOGLE_API_KEY is set in your environment
    openAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
