'use server';

import { generateDealAssessment, GenerateDealAssessmentInput } from "@/ai/flows/generate-deal-assessment";
import { marked } from 'marked';

export async function getDealAssessment(input: GenerateDealAssessmentInput) {
  try {
    const result = await generateDealAssessment(input);
    const htmlAssessment = await marked(result.assessment);
    return {
      message: "Assessment generated successfully.",
      assessment: htmlAssessment,
    };
  } catch (error) {
    console.error(error);
    return {
      message: "Failed to generate assessment.",
      assessment: null,
    };
  }
}
