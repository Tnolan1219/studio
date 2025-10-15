'use server';

/**
 * @fileOverview Generates a personalized real estate news briefing for a user based on general knowledge.
 * 
 * - generateNewsBriefing - A function that generates the briefing.
 * - GenerateNewsBriefingInput - The input type for the function.
 * - GenerateNewsBriefingOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateNewsBriefingInputSchema = z.object({
  investmentPreferences: z.string().describe('User\'s location and investment goals (e.g., "California", "passive income").'),
});

export type GenerateNewsBriefingInput = z.infer<typeof GenerateNewsBriefingInputSchema>;

const GenerateNewsBriefingOutputSchema = z.object({
  nationalSummary: z.string().describe('A summary of key general national real estate trends.'),
  localSummary: z.string().describe('A summary of key general local real estate trends for the user\'s area.'),
});
export type GenerateNewsBriefingOutput = z.infer<typeof GenerateNewsBriefingOutputSchema>;

const prompt = ai.definePrompt({
    name: 'generateNewsBriefingPrompt',
    input: { schema: GenerateNewsBriefingInputSchema },
    output: { schema: GenerateNewsBriefingOutputSchema },
    prompt: `You are a real estate market research AI. Your task is to generate a two-part briefing for a user based on their preferences, using your general knowledge. Do not use real-time data.
    
User Preferences: {{{investmentPreferences}}}

First, generate a 'nationalSummary' by summarizing key, generally accepted national real estate market trends in the US. This should be based on your existing knowledge of market principles (e.g., supply and demand, general interest rate impacts).

Second, generate a 'localSummary' by providing a general overview of the real estate market for the user's location based on their preferences. Discuss typical market characteristics for that area (e.g., "Historically a high-demand area," "Known for its stable rental market," etc.). Do not invent specific numbers like median prices or mortgage rates.

Provide only the data requested in the output schema.
`
});


export async function generateNewsBriefing(input: GenerateNewsBriefingInput): Promise<GenerateNewsBriefingOutput> {
    const response = await ai.generate({
      prompt: prompt,
      input: input,
      model: 'googleai/gemini-2.5-flash',
    });
    const output = response.output();
    if (!output) {
      throw new Error('No output from AI');
    }
    return output;
}
