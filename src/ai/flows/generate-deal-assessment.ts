'use server';

/**
 * @fileOverview A deal assessment AI agent.
 *
 * - generateDealAssessment - A function that handles the deal assessment process.
 * - GenerateDealAssessmentInput - The input type for the generateDealAssessment function.
 * - GenerateDealAssessmentOutput - The return type for the generateDealassessment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateDealAssessmentInputSchema = z.object({
  dealType: z
    .string()
    .describe('The type of real estate deal (e.g., rental, flip, commercial).'),
  financialData: z.string().describe('The financial data for the deal.'),
  marketConditions: z.string().describe('The current market conditions and user query for the AI.'),
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
  prompt: `You are a real estate investment expert and AI co-pilot. Your role is to analyze a potential real estate deal and provide actionable advice.

Analyze the deal based on the user's query and the provided financial data.

User Query & Market Conditions: {{{marketConditions}}}
Deal Type: {{{dealType}}}
Key Financial Metrics: {{{financialData}}}

Your assessment should include the following sections, formatted with markdown:

**1. Overall Recommendation:**
Start with a clear "Should you buy this deal?" recommendation (e.g., "Recommended", "Proceed with Caution", "Not Recommended"). Justify your reasoning based on the return metrics.

**2. Financial Analysis:**
Briefly analyze the key metrics (e.g., Cash Flow, CoC Return, ROI, Cap Rate). Are they strong, weak, or average for this type of deal and market?

**3. Financing Strategy:**
Suggest creative and effective financing options. Examples: "Consider a 203k loan to finance both purchase and rehab," or "This deal is a good candidate for seller financing to lower your initial cash outlay."

**4. Value-Add & ROI Maximization:**
Provide specific, actionable recommendations to increase the property's value and boost returns. Examples: "Convert the unfinished basement into a legal rental unit to increase monthly income by an estimated $800," or "Implement a cosmetic renovation on the kitchens and baths to force appreciation and achieve a higher ARV."

Provide a detailed, professional-grade assessment.`,
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
