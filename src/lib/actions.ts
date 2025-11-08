'use server';

import { marked } from 'marked';
import type { DealStage } from './types';


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
    const getPromptForStage = (stage: DealStage | 'initial-analysis' | 'general-query', dealType: string, financialData: string, userQuery: string) => {
        let basePrompt = `You are a real estate investment analyst. Provide a concise, insightful assessment based on the following data. Use markdown for formatting (bolding, lists). `;

        switch (stage) {
            case 'general-query':
                return `Answer the following real estate question accurately and concisely: "${userQuery}"`;
            case 'initial-analysis':
                basePrompt += `This is an initial analysis for a ${dealType}. Focus on the key metrics provided. What are the immediate strengths and weaknesses?`;
                break;
            case 'Negotiations':
                basePrompt += `The user is in the negotiation stage for a ${dealType}. Based on the data, suggest 2-3 key negotiation points. What are some favorable terms to ask for?`;
                break;
            case 'Rehab':
                basePrompt += `The user is planning the rehab for a ${dealType}. Based on the rehab scope and budget, identify potential pitfalls or value-add opportunities they might be missing.`;
                break;
            default:
                basePrompt += `The user is at the ${stage} stage for a ${dealType}. Provide 2-3 actionable insights or warnings relevant to this stage.`;
                break;
        }

        return `${basePrompt}\n\n**Deal Data:**\n${financialData}\n\n**User Query/Market Context:**\n${userQuery}\n\n**Assessment:**`;
    };
    
    const prompt = getPromptForStage(input.stage || 'initial-analysis', input.dealType, input.financialData, input.marketConditions);

    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'The AI service returned an error.');
    }
    
    const data = await response.json();
    
    if (!data.text) {
        throw new Error("Received an invalid response from the AI service.");
    }
    
    const htmlAssessment = await marked(data.text);

    return {
      message: "Assessment generated successfully.",
      assessment: htmlAssessment,
    };
  } catch (error: any) {
    console.error("Error in getDealAssessment:", error);
    const errorMessage = error.message || "An unknown error occurred while generating the assessment.";
    return {
      message: `Sorry, I couldn't complete the request. ${errorMessage}`,
      assessment: null,
    };
  }
}
