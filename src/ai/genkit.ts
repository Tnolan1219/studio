
'use server';
/**
 * @fileoverview This file initializes the Genkit AI instance and exports it for use throughout the application.
 * It ensures that Genkit is configured only once.
 */

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

export const ai = genkit({
  plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })],
});
