
import { NextRequest, NextResponse } from 'next/server';
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

// Initialize Genkit with the Google AI plugin
genkit({
  plugins: [
    googleAI({ apiKey: process.env.GEMINI_API_KEY }),
  ],
});

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const llmResponse = await genkit.generate({
      model: 'gemini-pro',
      prompt: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const text = llmResponse.text;
    return NextResponse.json({ text });
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
