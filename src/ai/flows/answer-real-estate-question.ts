'use server';

/**
 * @fileOverview An AI flow that can answer real estate questions from its general knowledge.
 * 
 * - answerRealEstateQuestion - A function that handles the question answering process.
 * - AnswerRealEstateQuestionInput - The input type for the function.
 * - AnswerRealEstateQuestionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const AnswerRealEstateQuestionInputSchema = z.object({
  question: z.string().describe('The user\'s question about real estate.'),
});
export type AnswerRealEstateQuestionInput = z.infer<typeof AnswerRealEstateQuestionInputSchema>;

const AnswerRealEstateQuestionOutputSchema = z.object({
  answer: z.string().describe('A concise, helpful answer to the user\'s question based on general real estate knowledge.'),
});
export type AnswerRealEstateQuestionOutput = z.infer<typeof AnswerRealEstateQuestionOutputSchema>;

const prompt = ai.definePrompt({
  name: 'realEstateQuestionPrompt',
  input: { schema: AnswerRealEstateQuestionInputSchema },
  output: { schema: AnswerRealEstateQuestionOutputSchema },
  prompt: `You are an expert real estate AI assistant.
  The user has a question: "{{{question}}}"
  
  Based on your general knowledge of the real estate industry, provide a clear, concise, and helpful answer.
  Do not mention that you cannot access live data. Frame your answer based on established principles and common market trends.
  Format your answer using simple markdown, like bullet points or short paragraphs.`,
});

export async function answerRealEstateQuestion(input: AnswerRealEstateQuestionInput): Promise<AnswerRealEstateQuestionOutput> {
  const response = await prompt.generate({
    input: input,
    model: ai.model('gemini-2.5-flash'),
  });
  return response.output()!;
}
