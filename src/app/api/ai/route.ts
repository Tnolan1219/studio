
'use server';

import { genkit, type Tool } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';
import type { DealStage } from '@/lib/types';

// Initialize Genkit with the Google AI plugin at the top level.
// This ensures it's configured once and available for all AI requests.
// It will use the GEMINI_API_KEY from your environment variables.
const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});

const DealAssessmentInputSchema = z.object({
  dealType: z.string(),
  financialData: z.string(),
  marketConditions: z.string(),
  stage: z.string().optional(),
});

const getPromptForStage = (
  stage: DealStage | 'initial-analysis' | 'general-query',
  dealType: string,
  financialData: string,
  marketConditions: string
): string => {
  // For the general purpose chat, we just pass the user's query directly.
  if (stage === 'general-query') {
    return marketConditions;
  }

  const baseIntro = `You are a real estate investment expert providing concise, actionable advice for a ${dealType} deal. The user is currently in the '${stage}' stage.
Financials: ${financialData}
User's Query/Market Info: ${marketConditions}

Provide your response in markdown format. Use bullet points for lists.
`;

  switch (stage) {
    case 'Negotiations':
      return `${baseIntro} Provide recommendations for the Negotiations stage. Include:
- **Suggested Offer Price:** A reasonable range based on the financials.
- **Key Contingencies:** Suggest 2-3 critical contingencies (e.g., inspection, financing, appraisal).
- **Negotiation Tactic:** Offer one brief negotiation tip.`;
    case 'Inspections':
      return `${baseIntro} Provide recommendations for the Inspections stage. Include:
- **Key Inspection Points:** List 3-4 critical areas to inspect for a ${dealType}.
- **Specialist Referral:** Suggest one type of specialist inspector to consider (e.g., structural engineer, mold specialist).`;
    case 'Rehab':
      return `${baseIntro} Provide recommendations for the Rehab stage. Include:
- **Value-Add Priorities:** Suggest 2-3 renovations that offer the best ROI for a ${dealType}.
- **Budgeting Tip:** Provide a tip for managing the rehab budget.
- **Timeline Estimate:** Give a *very rough* timeline estimate for a typical rehab of this scale.`;
    case 'Marketing':
      return `${baseIntro} Provide recommendations for the Marketing stage (for selling or renting). Include:
- **Target Audience:** Who is the ideal buyer/renter?
- **Listing Platforms:** Suggest 2-3 platforms to list on.
- **Marketing Highlight:** What is the number one feature to highlight in the listing?`;
    default:
      return `You are a real estate investment expert. Analyze the following deal and provide a quick, efficient response using markdown with simplified bullet points.
- Deal Type: ${dealType}
- Financials: ${financialData}
- Market/Query: ${marketConditions}

Provide a markdown-formatted assessment covering:
- **Recommendation:** (e.g., "Recommended", "Caution") with a brief justification.
- **Key Metrics:** Briefly comment on the CoC Return, Cap Rate, or ROI.
- **Potential Risks:** Identify one or two major risks.
- **Value-Add Idea:** Suggest one creative idea to maximize ROI.`;
  }
};

export const assessDeal = ai.defineFlow(
  {
    name: 'dealAssessmentFlow',
    inputSchema: DealAssessmentInputSchema,
    outputSchema: z.string(),
  },
  async (input) => {
    const stage =
      (input.stage as DealStage | 'initial-analysis' | 'general-query') ||
      'initial-analysis';
    const prompt = getPromptForStage(
      stage,
      input.dealType,
      input.financialData,
      input.marketConditions
    );

    const llmResponse = await ai.generate({
      model: 'gemini-pro',
      prompt: prompt,
      config: {
        temperature: 0.5,
      },
    });

    return llmResponse.text;
  }
);
