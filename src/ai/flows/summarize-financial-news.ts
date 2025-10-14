'use server';

/**
 * @fileOverview Summarizes financial news based on user investment preferences.
 *
 * - summarizeFinancialNews - A function that summarizes financial news.
 * - SummarizeFinancialNewsInput - The input type for the summarizeFinancialNews function.
 * - SummarizeFinancialNewsOutput - The return type for the summarizeFinancialNews function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const SummarizeFinancialNewsInputSchema = z.object({
  investmentPreferences: z
    .string()
    .describe('The user investment preferences.'),
  newsHeadlines: z.array(z.string()).describe('Array of news headlines.'),
});

export type SummarizeFinancialNewsInput = z.infer<
  typeof SummarizeFinancialNewsInputSchema
>;

const SummarizeFinancialNewsOutputSchema = z.object({
  summary: z.string().describe('A summary of the financial news.'),
});

export type SummarizeFinancialNewsOutput = z.infer<
  typeof SummarizeFinancialNewsOutputSchema
>;

const prompt = ai.definePrompt({
  name: 'summarizeFinancialNewsPrompt',
  input: {schema: SummarizeFinancialNewsInputSchema},
  output: {schema: SummarizeFinancialNewsOutputSchema},
  prompt: `You are an AI assistant that summarizes financial news based on user investment preferences.

  Investment Preferences: {{{investmentPreferences}}}
  News Headlines: {{#each newsHeadlines}}- {{{this}}}
  {{/each}}
  Summary:`,
});

export async function summarizeFinancialNews(
  input: SummarizeFinancialNewsInput
): Promise<SummarizeFinancialNewsOutput> {
  const response = await prompt.generate({
    input: input,
    model: ai.model('gemini-2.5-flash'),
  });
  return response.output()!;
}
