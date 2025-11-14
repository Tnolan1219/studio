
'use server';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { marked } from 'marked';

// Initialize the OpenAI client directly
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'The OpenAI API key is not configured on the server.' },
      { status: 500 }
    );
  }
  
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  try {
    // Use the OpenAI library directly, bypassing Genkit for this route
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: 'You are a real estate investment expert. Provide concise answers in simple bullet points. Use markdown for formatting.' 
        },
        { role: 'user', content: prompt }
      ],
      model: 'gpt-4o-mini',
      temperature: 0.5,
    });
    
    const responseText = chatCompletion.choices[0].message.content;
    const html = marked.parse(responseText || '');

    if (typeof html !== 'string') {
        return NextResponse.json(
            { error: 'Failed to parse AI response.' },
            { status: 500 }
        );
    }
    
    return NextResponse.json({ text: html });

  } catch (error: any) {
    console.error('[OpenAI API Route Error]', error);
    return NextResponse.json({ error: error.message || 'An internal server error occurred.' }, { status: 500 });
  }
}
