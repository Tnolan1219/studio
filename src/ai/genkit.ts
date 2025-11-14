
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAI } from 'genkitx-openai';

// Initialize the AI instance with plugins.
// This is done once and exported for use in other parts of the application.
export const ai = genkit({
  plugins: [
    googleAI(), // Assumes GOOGLE_API_KEY is set in your environment
    openAI({
      apiKey: process.env.OPENAI_API_KEY,
    }),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
