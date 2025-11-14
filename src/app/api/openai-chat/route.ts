'use server';

import { NextRequest, NextResponse } from 'next/server';
import { generate } from '@genkit-ai/ai';
import { openAI } from 'genkitx-openai';
import { ai } from '@/ai/genkit'; // ensure ai is initialized

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'The OpenAI API key is not configured on the server.' },
      { status: 500 }
    );
  }

  try {
    const { prompt } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    // Directly call the generate function with the OpenAI model
    const llmResponse = await generate({
        model: openAI.gpt4oMini,
        prompt: prompt,
        config: {
            temperature: 0.7,
        },
    });

    const responseText = llmResponse.text();
    return NextResponse.json({ text: responseText });

  } catch (error: any) {
    console.error('[OpenAI API Route Error]', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
}
