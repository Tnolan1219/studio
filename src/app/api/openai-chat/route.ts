
import { NextRequest, NextResponse } from 'next/server';
import { runFlow } from '@genkit-ai/core';
import { openaiChatbotFlow } from '@/lib/flows/openaiChatbotFlow';

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const responseText = await runFlow(openaiChatbotFlow, { prompt });
    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('OpenAI API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
