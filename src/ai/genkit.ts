
'use server';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/google-genai';
import * as z from 'zod';

export const chatbotFlow = defineFlow(
  {
    name: 'chatbotFlow',
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.string(),
  },
  async ({ prompt }) => {
    const llmResponse = await generate({
      model: googleAI.model('gemini-1.5-flash-latest'),
      prompt: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return llmResponse.text();
  }
);
