'use server';

import { marked } from 'marked';
import { getAIResponse } from './ai';

/**
 * Gets an AI assessment for a deal by constructing a prompt and calling the backend.
 * @param input An object containing the deal type, financials, and user query.
 * @returns A result object with a message and the HTML assessment.
 */
export async function getDealAssessment(input: {
  dealType: string;
  financialData: string;
  marketConditions: string;
}) {
  try {
    // Construct a detailed prompt for the backend
    const prompt = `
      You are a real estate investment expert. Analyze the following deal:
      - Deal Type: ${input.dealType}
      - Financials: ${input.financialData}
      - Market/Query: ${input.marketConditions}
      
      Provide a markdown-formatted assessment covering:
      1. **Overall Recommendation** (e.g., "Recommended", "Caution") with justification.
      2. **Financial Analysis** of the key metrics.
      3. **Creative Financing** suggestions.
      4. **Value-Add & ROI Maximization** strategies.
    `;
    
    // Call our reusable AI handler
    const reply = await getAIResponse(prompt);
    
    // Convert markdown response to HTML for safe rendering
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
