'use server';

import { generate } from '@genkit-ai/ai';
import { openAI } from 'genkitx-openai';
import * as z from 'zod';
import { ai } from '@/ai/genkit';

const openaiChatbotFlow = ai.defineFlow(
  {
    name: 'openaiChatbotFlow',
    inputSchema: z.object({ prompt: z.string() }),
    outputSchema: z.string(),
  },
  async ({ prompt }) => {
    const llmResponse = await generate({
      model: openAI.gpt4oMini,
      prompt: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return llmResponse.text();
  }
);

// Export a wrapper function that can be called from the API route.
export async function runOpenAIChatbot(input: { prompt: string }): Promise<string> {
    return await openaiChatbotFlow(input);
}
