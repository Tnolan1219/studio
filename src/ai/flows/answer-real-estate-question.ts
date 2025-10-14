'use server';

/**
 * @fileOverview An AI flow that can answer real estate questions by browsing the web.
 * 
 * - answerRealEstateQuestion - A function that handles the question answering process.
 * - AnswerRealEstateQuestionInput - The input type for the function.
 * - AnswerRealEstateQuestionOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';

const AnswerRealEstateQuestionInputSchema = z.object({
  question: z.string().describe('The user\'s question about real estate.'),
});
export type AnswerRealEstateQuestionInput = z.infer<typeof AnswerRealEstateQuestionInputSchema>;

const AnswerRealEstateQuestionOutputSchema = z.object({
  answer: z.string().describe('A concise, helpful answer to the user\'s question.'),
});
export type AnswerRealEstateQuestionOutput = z.infer<typeof AnswerRealEstateQuestionOutputSchema>;

// Define a tool for browsing the web
const webBrowserTool = ai.defineTool(
  {
    name: 'webBrowser',
    description: 'Performs a web search for a given query and returns the content of the top search result.',
    inputSchema: z.object({ query: z.string() }),
    outputSchema: z.string(),
  },
  async ({ query }) => {
    // This is a simplified web browser for demonstration.
    // In a real app, you would use a more robust search API (e.g., Google Custom Search).
    console.log(`AI is browsing the web for: ${query}`);
    try {
      // Use the Tavily search API for more reliable results.
      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY, // Assumes TAVILY_API_KEY is in .env
            query: query,
            search_depth: "basic",
            include_answer: true,
            max_results: 1
        })
      });

      if (!response.ok) {
        return `Error fetching search results: ${response.statusText}`;
      }
      const data: any = await response.json();

      if (data.answer) {
        return data.answer;
      }
      
      if (data.results && data.results.length > 0) {
        return `Title: ${data.results[0].title}\n\nContent: ${data.results[0].content}`;
      }

      return `No direct answer found for "${query}". Try rephrasing your question.`;
    } catch (err: any) {
      console.error(err);
      return `An error occurred while browsing the web: ${err.message}`;
    }
  }
);


const prompt = ai.definePrompt({
  name: 'realEstateQuestionPrompt',
  input: { schema: AnswerRealEstateQuestionInputSchema },
  output: { schema: AnswerRealEstateQuestionOutputSchema },
  tools: [webBrowserTool],
  prompt: `You are an expert real estate AI assistant.
  The user has a question: "{{{question}}}"
  
  Use the webBrowserTool to find the most up-to-date and relevant information to answer their question.
  Synthesize the information you find into a clear, concise, and helpful answer.
  Format your answer using simple markdown, like bullet points or short paragraphs.`,
});

export async function answerRealEstateQuestion(input: AnswerRealEstateQuestionInput): Promise<AnswerRealEstateQuestionOutput> {
  const { output } = await prompt(input);
  return output!;
}
