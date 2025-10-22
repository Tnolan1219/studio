'use server';

import { genkit } from 'genkit';
import { openAI } from 'genkitx-openai';
import { z } from 'zod';
import type { DealStage } from '@/lib/types';

// Initialize Genkit with the OpenAI plugin
// It will automatically use the OPENAI_API_KEY from your .env file
const ai = genkit({
  plugins: [
    openAI(),
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
  if (stage === 'general-query') {
    return marketConditions;
  }

  const baseIntro = `You are a real estate investment expert providing concise, actionable advice for a ${dealType} deal. The user is currently in the '${stage}' stage.
Financials: ${financialData}
User's Query/Market Info: ${marketConditions}
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
- 'rehab'
- **Marketing Highlight:** What is the number one feature to highlight in the listing?`;
    default:
      return `You are a real estate investment expert. Analyze the following deal and provide a quick, efficient response using simplified bullet points.
- Deal Type: ${dealType}
- Financials: ${financialData}
- Market/Query: ${marketConditions}

Provide a markdown-formatted assessment covering:
- **Recommendation:** (e.g., "Recommended", "Caution") with a brief justification.
- **Financials:** Key positive or negative metrics.
- **Financing:** Creative ideas or notes.
- **Value-Add:** Quick ideas to maximize ROI.`;
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
      model: 'gpt-3.5-turbo',
      prompt: prompt,
      config: {
        temperature: 0.5,
      },
    });

    return llmResponse.text;
  }
);
