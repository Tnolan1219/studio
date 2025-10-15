'use server';

import { marked } from 'marked';

/**
 * Calls our secure backend API route to get an AI assessment for a deal.
 * The frontend never touches API keys.
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
    
    // Call our own backend, not the AI provider directly
    const response = await fetch(`${process.env.NEXT_PUBLIC_URL}/api/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "AI API request failed");
    }

    const result = await response.json();
    // Convert markdown response to HTML for safe rendering
    const htmlAssessment = await marked(result.reply);

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
