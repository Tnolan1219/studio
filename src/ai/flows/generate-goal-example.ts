'use server';

/**
 * @fileOverview Generates an example financial goal for the user.
 * 
 * - generateFinancialGoalExample - A function that returns an example.
 * - GenerateFinancialGoalExampleOutput - The return type.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const GenerateFinancialGoalExampleOutputSchema = z.object({
  example: z.string().describe('A well-defined, inspiring real estate financial goal.'),
});

export type GenerateFinancialGoalExampleOutput = z.infer<typeof GenerateFinancialGoalExampleOutputSchema>;

export async function generateFinancialGoalExample(): Promise<GenerateFinancialGoalExampleOutput> {
    return generateFinancialGoalExampleFlow();
}

const prompt = ai.definePrompt({
    name: 'generateFinancialGoalExamplePrompt',
    output: { schema: GenerateFinancialGoalExampleOutputSchema },
    prompt: `You are an AI assistant for a real estate investment app. 
    Generate a single, concise, and inspiring example of a financial goal for a user.
    The goal should be related to real estate investing.
    
    Make it specific and actionable. For example: "My goal is to acquire three cash-flowing rental properties within the next five years to generate $1,500/month in passive income, allowing me to achieve financial flexibility."`
});


const generateFinancialGoalExampleFlow = ai.defineFlow(
    {
        name: 'generateFinancialGoalExampleFlow',
        outputSchema: GenerateFinancialGoalExampleOutputSchema,
    },
    async () => {
        const { output } = await prompt();
        return output!;
    }
);
