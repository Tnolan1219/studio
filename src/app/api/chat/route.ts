
import { NextRequest, NextResponse } from 'next/server';
import { runFlow } from '@genkit-ai/flow';
import { chatbotFlow } from '@/ai/genkit';

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    const responseText = await runFlow(chatbotFlow, { prompt });
    return NextResponse.json({ text: responseText });
  } catch (error: any) {
    console.error('Gemini error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
