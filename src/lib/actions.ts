
'use server';

import { marked } from 'marked';
import type { DealStage } from './types';


async function getAIResponse(prompt: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  try {
    const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
        'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        system_instruction: {
            parts: {
            text: "You are a helpful real estate investment assistant. Respond with simplified bullet points in markdown for quick, efficient answers. Ensure your responses are professional and easy to read."
            }
        }
        }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Gemini API request failed:', response.status, errorBody);
        throw new Error(`Gemini API request failed with status ${response.status}. Body: ${errorBody}`);
    }

    const data = await response.json();
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts[0]) {
        console.error('Invalid response structure from Gemini API:', data);
        throw new Error('Received an invalid response structure from the AI service.');
    }
    return data.candidates[0].content.parts[0].text;

  } catch (error) {
      console.error('Error fetching from Gemini API:', error);
      // Re-throw the error to be handled by the caller
      throw new Error('Failed to get a response from the AI service.');
  }
}


const getPromptForStage = (stage: DealStage | 'initial-analysis' | 'general-query', dealType: string, financialData: string, marketConditions: string): string => {
    
    if (stage === 'general-query') {
        return marketConditions; // For general questions, the prompt is just the user's query
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
- **Marketing Highlight:** What is the number one feature to highlight in the listing?`;
        default: // 'initial-analysis' and other stages
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

/**
 * Gets an AI assessment for a deal by constructing a prompt and calling the AI provider directly.
 */
export async function getDealAssessment(input: {
  dealType: string;
  financialData: string;
  marketConditions: string;
  stage?: DealStage | 'initial-analysis' | 'general-query';
}): Promise<{ message: string, assessment: string | null }> {
  try {
    const stage = input.stage || 'initial-analysis';
    const prompt = getPromptForStage(stage, input.dealType, input.financialData, input.marketConditions);
    
    const reply = await getAIResponse(prompt);
    const htmlAssessment = await marked(reply);

    return {
      message: "Assessment generated successfully.",
      assessment: htmlAssessment,
    };
  } catch (error: any) {
    console.error("Error in getDealAssessment:", error);
    return {
      message: error.message || "Failed to generate assessment.",
      assessment: null,
    };
  }
}
