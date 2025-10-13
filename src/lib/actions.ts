"use server";

import { generateDealAssessment } from "@/ai/flows/generate-deal-assessment";
import { z } from "zod";
import { marked } from 'marked';

const dealAssessmentSchema = z.object({
  dealType: z.string(),
  financialData: z.string(),
  marketConditions: z.string(),
});

export async function getDealAssessment(prevState: any, formData: FormData) {
  const validatedFields = dealAssessmentSchema.safeParse({
    dealType: formData.get("dealType"),
    financialData: formData.get("financialData"),
    marketConditions: formData.get("marketConditions"),
  });

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
