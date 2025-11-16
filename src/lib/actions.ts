
'use server';

import type { DealStage } from './types';
import { GoogleGenAI } from '@google/genai';
import { marked } from 'marked';


/**
 * Gets an AI assessment for a deal by constructing a prompt and calling the AI provider directly.
 * This version uses the Google AI SDK directly to avoid Genkit initialization issues.
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
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('The Google API key is not configured on the server.');
    }

    const genAI = new GoogleGenAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest"});

    const getPromptForStage = (
      stage: DealStage | 'initial-analysis' | 'general-query',
      dealType: string,
      financialData: string,
      userQuery: string
    ) => {
      let basePrompt = `You are a real estate investment analyst providing advice to a user of a financial analysis app. Provide a concise, insightful assessment based on the following data. Format your response using markdown with sections (e.g., ### Section Title) and bullet points for easy readability. Focus on giving specific, strategic advice.`;

      switch (stage) {
        case 'general-query':
          return `Answer the following real estate question accurately and concisely: "${userQuery}"`;
        
        case 'initial-analysis':
          basePrompt += ` This is an initial analysis for a ${dealType}. Your response should be structured into the following sections: Purchase & Financing, Cash Flow, and Profitability. For each section, provide a brief analysis and 1-2 actionable recommendations.`;
          break;

        case 'Negotiations':
          basePrompt += ` The user is in the negotiation stage for a ${dealType}. Based on the data, suggest 2-3 key negotiation points. What are some favorable terms to ask for? Structure your response under "Negotiation Strategy" and "Favorable Terms".`;
          break;

        case 'Rehab':
          basePrompt += ` The user is planning the rehab for a ${dealType}. Based on the rehab scope and budget, identify potential pitfalls or value-add opportunities they might be missing. Structure your response into "Potential Risks" and "Value-Add Opportunities".`;
          break;
          
        default:
          basePrompt += ` The user is at the ${stage} stage for a ${dealType}. Provide 2-3 actionable insights or warnings relevant to this stage.`;
          break;
      }

      return `${basePrompt}\n\n**Deal Data:**\n${financialData}\n\n**User Query/Market Context:**\n${userQuery}\n\n**Assessment:**`;
    };

    const prompt = getPromptForStage(stage || 'initial-analysis', dealType, financialData, marketConditions);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const markdownText = response.text();
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
