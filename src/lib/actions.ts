
'use server';

import type { DealStage } from './types';

/**
 * Gets an AI assessment for a deal by constructing a prompt and calling the AI provider directly.
 * This version matches the calling signature from the RealEstateQueryBox component.
 */
export async function assessDeal(
  dealType: string,
  financialData: string,
  marketConditions: string,
  stage?: DealStage | 'initial-analysis' | 'general-query'
): Promise<string> {
  try {
    const getPromptForStage = (
      stage: DealStage | 'initial-analysis' | 'general-query',
      dealType: string,
      financialData: string,
      userQuery: string
    ) => {
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

    const prompt = getPromptForStage(stage || 'initial-analysis', dealType, financialData, marketConditions);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const apiUrl = new URL('/api/ai', baseUrl).toString();

    const response = await fetch(apiUrl, {
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
      throw new Error('Received an invalid response from the AI service.');
    }

    // Return the raw markdown text, as the component uses ReactMarkdown to render it.
    return data.text;

  } catch (error: any) {
    console.error('Error in assessDeal:', error);
    // Rethrow the error so the component's try/catch block can handle it and display a message to the user.
    throw new Error(error.message || 'An unknown error occurred while generating the assessment.');
  }
}
