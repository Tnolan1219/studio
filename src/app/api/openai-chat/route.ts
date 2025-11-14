
import { NextRequest, NextResponse } from 'next/server';
import { runFlow } from '@genkit-ai/core';
import { openaiChatbotFlow } from '@/lib/flows/openaiChatbotFlow';

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'The OpenAI API key is not configured on the server.' },
      { status: 500 }
    );
  }

  const { prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const responseText = await runFlow(openaiChatbotFlow, { prompt });
    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
}
