
import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit'; // Use the shared instance

export async function POST(request: NextRequest) {
  // Check if the Gemini API key is available
  if (!process.env.GEMINI_API_KEY) {
    const errorMessage = 'The Gemini API key is not configured on the server. Please check your environment variables.';
    console.error(errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }

  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const llmResponse = await ai.generate({
      model: 'models/gemini-pro',
      prompt: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const text = llmResponse.text;
    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('AI API error:', error);
    // Provide a more descriptive error message to the client
    const message = error.message || 'An unknown error occurred with the AI service.';
    return NextResponse.json({ error: `Internal Server Error: ${message}` }, { status: 500 });
  }
}
