
'use server';

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { marked } from 'marked';

// Initialize the OpenAI client directly
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  const { prompt, dealData, newsRequest } = await request.json();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: 'The OpenAI API key is not configured on the server.' },
      { status: 500 }
    );
  }
  
  if (!prompt) {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  let systemContent: string;
  let userContent: string;
  let temperature = 0.5;

  if (newsRequest) {
    systemContent = `You are a real estate market news analyst. Generate a JSON array of 4-5 objects. Each object should have two keys: "source" (a plausible news source, e.g., 'Realty Times') and "title" (a concise, recent, and relevant real estate news headline). The output must be only a valid JSON array string.`;
    userContent = prompt;
    temperature = 0.7; // A bit more creative for news
  } else if (dealData) {
    systemContent = `You are a real estate investment expert. Analyze the provided deal data and the user's query. Provide concise, insightful analysis in simple bullet points. Structure the response into logical sections using markdown (e.g., "### Purchase & Financing", "### Profitability").`;
    userContent = `${prompt}\n\n**Deal Data:**\n${dealData}`;
  } else {
    systemContent = 'You are a real estate investment expert. Provide concise answers in simple bullet points. Use markdown for formatting.';
    userContent = prompt;
  }

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: [
        { 
          role: 'system', 
          content: systemContent 
        },
        { role: 'user', content: userContent }
      ],
      model: 'gpt-4o-mini',
      temperature: temperature,
    });
    
    const responseText = chatCompletion.choices[0].message.content;

    if (!responseText) {
        return NextResponse.json({ error: 'Failed to get a response from AI.' }, { status: 500 });
    }

    // If it's a news request, return the raw text (which should be JSON)
    if (newsRequest) {
      return NextResponse.json({ text: responseText });
    }
    
    // Otherwise, parse the markdown for chat/deal analysis
    const html = marked.parse(responseText);

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
