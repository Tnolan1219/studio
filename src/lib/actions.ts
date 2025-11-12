
'use server';

import type { DealStage } from './types';
import { generate } from '@genkit-ai/ai';
import { googleAI } from '@genkit-ai/google-genai';
import { marked } from 'marked';

/**
 * Gets an AI assessment for a deal by constructing a prompt and calling the AI provider directly.
 * This version matches the calling signature from the RealEstateQueryBox component.
 */
export async function getDealAssessment(
  {dealType,
  financialData,
  marketConditions,
  stage}:
  {dealType: string,
  financialData: string,
  marketConditions: string,
  stage?: DealStage | 'initial-analysis' | 'general-query'}
): Promise<{message: string, assessment: string | null}> {
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

    if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_API_KEY) {
      throw new Error('The Google API key is not configured on the server.');
    }

    const llmResponse = await generate({
        model: googleAI.model('gemini-1.5-flash-latest'),
        prompt: prompt,
    });

    const markdownText = llmResponse.text();
    const html = marked.parse(markdownText);
    
    if (typeof html !== 'string') {
        return { message: "Could not render AI response.", assessment: null };
    }

    return { message: "Success", assessment: html };

  } catch (error: any) {
    console.error('Error in getDealAssessment:', error);
    return { message: error.message || "An unknown error occurred.", assessment: null };
  }
}
