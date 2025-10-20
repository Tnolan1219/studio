'use server';

import { marked } from 'marked';
import type { DealStage } from './types';

/**
 * Calls the Google Gemini API to generate content.
 * This function is now inside the server action to avoid internal fetch issues.
 * @param prompt The user's prompt.
 * @returns The AI's response text.
 */
async function callGemini(prompt: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      system_instruction: {
        parts: {
          text: "You are a helpful assistant. Respond with simplified bullet points for quick, efficient answers. Ensure your responses are professional, easy to read, and do not include any JSON or markdown formatting."
        }
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini API request failed:', response.status, errorBody);
    throw new Error(`Gemini API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

/**
 * Calls the OpenAI API to generate content.
 * This function is now inside the server action to avoid internal fetch issues.
 * @param prompt The user's prompt.
 * @returns The AI's response text.
 */
async function callOpenAI(prompt: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const API_URL = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: "You are a helpful assistant. Respond with simplified bullet points for quick, efficient answers that are professional and easy to read. Do not include any JSON formatting." },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI API request failed:', response.status, errorBody);
    throw new Error(`OpenAI API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}


const getPromptForStage = (stage: DealStage | 'initial-analysis', dealType: string, financialData: string, marketConditions: string): string => {
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
 * @param input An object containing the deal type, financials, and user query.
 * @returns A result object with a message and the HTML assessment.
 */
export async function getDealAssessment(input: {
  dealType: string;
  financialData: string;
  marketConditions: string;
  stage: DealStage | 'initial-analysis';
}) {
  try {
    const prompt = getPromptForStage(input.stage, input.dealType, input.financialData, input.marketConditions);
    
    let reply: string;
    try {
      console.log(`Attempting to call Gemini API for stage: ${input.stage}...`);
      reply = await callGemini(prompt);
      console.log('Gemini API call successful from Server Action.');
    } catch (geminiError) {
      console.warn('Gemini API failed in Server Action, falling back to OpenAI...', geminiError);
      try {
        reply = await callOpenAI(prompt);
        console.log('OpenAI API call successful after fallback in Server Action.');
      } catch (openAIError) {
        console.error('Both Gemini and OpenAI APIs failed in Server Action.', openAIError);
        throw new Error('Both AI providers failed to respond.');
      }
    }
    
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
