'use server';

import { generateDealAssessment, GenerateDealAssessmentInput } from "@/ai/flows/generate-deal-assessment";
import { z } from "zod";
import { marked } from 'marked';

const dealAssessmentSchema = z.object({
  dealType: z.string(),
  financialData: z.string(),
  marketConditions: z.string(),
});

export async function getDealAssessment(input: GenerateDealAssessmentInput) {
  const validatedFields = dealAssessmentSchema.safeParse(input);

  if (!validatedFields.success) {
    return {
      message: "Invalid form data.",
      assessment: null,
    };
  }

  try {
    const result = await generateDealAssessment(validatedFields.data);
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
