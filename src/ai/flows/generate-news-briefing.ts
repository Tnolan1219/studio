'use server';

/**
 * @fileOverview Generates a personalized real estate news briefing for a user.
 * 
 * - generateNewsBriefing - A function that generates the briefing.
 * - GenerateNewsBriefingInput - The input type for the function.
 * - GenerateNewsBriefingOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import fetch from 'node-fetch';


const GenerateNewsBriefingInputSchema = z.object({
  investmentPreferences: z.string().describe('User\'s location and investment goals (e.g., "California", "passive income").'),
});

export type GenerateNewsBriefingInput = z.infer<typeof GenerateNewsBriefingInputSchema>;

const GenerateNewsBriefingOutputSchema = z.object({
  nationalSummary: z.string().describe('A summary of key national real estate trends.'),
  localSummary: z.string().describe('A summary of key local real estate data points for the user\'s area.'),
});
export type GenerateNewsBriefingOutput = z.infer<typeof GenerateNewsBriefingOutputSchema>;

const webBrowserTool = ai.defineTool(
    {
      name: 'webBrowser',
      description: 'Performs a web search for a given query and returns the content of the top search result.',
      inputSchema: z.object({ query: z.string() }),
      outputSchema: z.string(),
    },
    async ({ query }) => {
        if (!process.env.TAVILY_API_KEY) {
            return "Web searching is disabled. The TAVILY_API_KEY environment variable is not set.";
        }

      console.log(`Briefing AI is browsing the web for: ${query}`);
      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query: query,
            search_depth: "basic",
            include_answer: true,
            max_results: 1
          })
        });
        if (!response.ok) return `Error fetching search results: ${response.statusText}`;
        const data: any = await response.json();
        if (data.answer) return data.answer;
        if (data.results && data.results.length > 0) return `Title: ${data.results[0].title}\n\nContent: ${data.results[0].content}`;
        return `No direct answer found for "${query}".`;
      } catch (err: any) {
        return `An error occurred while browsing the web: ${err.message}`;
      }
    }
  );

const prompt = ai.definePrompt({
    name: 'generateNewsBriefingPrompt',
    input: { schema: GenerateNewsBriefingInputSchema },
    output: { schema: GenerateNewsBriefingOutputSchema },
    tools: [webBrowserTool],
    prompt: `You are a real estate market research AI. Your task is to generate a two-part briefing for a user based on their preferences.
    
User Preferences: {{{investmentPreferences}}}

First, use the webBrowserTool to search for "national real estate market trends in the US". Summarize the findings in a few key bullet points. This will be the 'nationalSummary'.

Second, use the webBrowserTool to find specific, up-to-date data for the user's local area based on their preferences. Find the following data points:
- Median Home Price
- Average Rent (for a common property type like a 3-bed house)
- Current 30-year fixed mortgage rate

Summarize these findings for the user's location. This will be the 'localSummary'.

Provide only the data requested in the output schema.
`
});


export async function generateNewsBriefing(input: GenerateNewsBriefingInput): Promise<GenerateNewsBriefingOutput> {
    const { output } = await prompt(input);
    return output!;
}
