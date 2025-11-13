
import { defineFlow } from '@genkit-ai/core';
import { generate } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/google-genai';
import * as z from 'zod';

export const chatbotFlow = defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.string(),
  },
  async ({ prompt }) => {
    const llmResponse = await generate({
      model: gemini15Flash,
      prompt: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return llmResponse.text();
  }
);
