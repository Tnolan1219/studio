'use server';

import { NextRequest, NextResponse } from 'next/server';
import { generate } from '@genkit-ai/ai';
import { openAI } from 'genkitx-openai';
// Do not import the global `ai` instance to prevent initialization conflicts.

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

    // Directly call the generate function with the OpenAI model.
    // This is more direct and avoids potential conflicts with global Genkit flow registration.
    const llmResponse = await generate({
        model: openAI.gpt4oMini,
        prompt: prompt,
        config: {
            temperature: 0.7,
        },
    });

    const responseText = llmResponse.text; // Use .text property for Genkit 1.x
    return NextResponse.json({ text: responseText });

  } catch (error: any) {
    console.error('[OpenAI API Route Error]', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
}
