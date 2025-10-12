'use server';

/**
 * @fileOverview A deal assessment AI agent.
 *
 * - generateDealAssessment - A function that handles the deal assessment process.
 * - GenerateDealAssessmentInput - The input type for the generateDealAssessment function.
 * - GenerateDealAssessmentOutput - The return type for the generateDealAssessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateDealAssessmentInputSchema = z.object({
  dealType: z
    .string()
    .describe('The type of real estate deal (e.g., rental, flip, commercial).'),
  financialData: z.string().describe('The financial data for the deal.'),
  marketConditions: z.string().describe('The current market conditions.'),
});
export type GenerateDealAssessmentInput = z.infer<typeof GenerateDealAssessmentInputSchema>;

const GenerateDealAssessmentOutputSchema = z.object({
  assessment: z
    .string()
    .describe(
      'An AI-generated assessment of the deals profitability, highlighting potential risks and rewards.'
    ),
});
export type GenerateDealAssessmentOutput = z.infer<typeof GenerateDealAssessmentOutputSchema>;

export async function generateDealAssessment(
  input: GenerateDealAssessmentInput
): Promise<GenerateDealAssessmentOutput> {
  return generateDealAssessmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateDealAssessmentPrompt',
  input: {schema: GenerateDealAssessmentInputSchema},
  output: {schema: GenerateDealAssessmentOutputSchema},
  prompt: `You are a real estate investment expert. Analyze the deal based on the provided information and provide an assessment of its profitability, risks, and rewards.

Deal Type: {{{dealType}}}
Financial Data: {{{financialData}}}
Market Conditions: {{{marketConditions}}}

Provide a detailed assessment.`,
});

const generateDealAssessmentFlow = ai.defineFlow(
  {
    name: 'generateDealAssessmentFlow',
    inputSchema: GenerateDealAssessmentInputSchema,
    outputSchema: GenerateDealAssessmentOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
