
'use server';

import { assessDeal } from '@/app/api/ai/route';
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
    const reply = await assessDeal(input);
    
    // Check if the reply is valid before processing
    if (!reply || typeof reply !== 'string') {
        throw new Error("Received an invalid response from the AI service.");
    }
    
    const htmlAssessment = await marked(reply);

    return {
      message: "Assessment generated successfully.",
      assessment: htmlAssessment,
    };
  } catch (error: any) {
    console.error("Error in getDealAssessment:", error);
    // Ensure a consistent error message format
    const errorMessage = error.message || "An unknown error occurred while generating the assessment.";
    return {
      message: `Sorry, I couldn't complete the request. ${errorMessage}`,
      assessment: null,
    };
  }
}
