
'use server';

import { generate } from '@genkit-ai/ai';
import { gpt4oMini } from 'genkitx-openai';
import * as z from 'zod';
import { ai } from '@/ai/genkit';

export const openaiChatbotFlow = ai.defineFlow(
  {
    name: 'openaiChatbotFlow',
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.string(),
  },
  async ({ prompt }) => {
    const llmResponse = await generate({
      model: gpt4oMini,
      prompt: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return llmResponse.text();
  }
);
