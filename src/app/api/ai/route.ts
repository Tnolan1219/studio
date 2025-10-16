
import { NextRequest, NextResponse } from 'next/server';

/**
 * Calls the Google Gemini API to generate content.
 * @param prompt The user's prompt.
 * @returns The AI's response text.
 */
async function callGemini(prompt: string): Promise<string> {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set.');
  }

  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      // Add a system instruction to enforce JSON output format
      system_instruction: {
        parts: {
          text: "You are a helpful assistant designed to output JSON. Respond with simplified bullet points for quick, efficient answers. The user will provide a prompt, and you must respond with a valid JSON object only, without any markdown formatting, code fences, or explanatory text. Ensure your responses are professional and easy to read."
        }
      }
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Gemini API request failed:', response.status, errorBody);
    throw new Error(`Gemini API request failed with status ${response.status}`);
  }

  const data = await response.json();
  // It's possible the response is still wrapped in a code block, so let's clean it just in case.
  const textResponse = data.candidates[0].content.parts[0].text;
  const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
  return jsonMatch ? jsonMatch[0] : textResponse;
}

/**
 * Calls the OpenAI API to generate content.
 * @param prompt The user's prompt.
 * @returns The AI's response text.
 */
async function callOpenAI(prompt: string): Promise<string> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set.');
  }

  const API_URL = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o', // Using the latest efficient model
      response_format: { type: "json_object" }, // Enforce JSON output for OpenAI
      messages: [
        { role: 'system', content: "You are a helpful assistant designed to output JSON. Respond with simplified bullet points for quick, efficient answers that are professional and easy to read." },
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('OpenAI API request failed:', response.status, errorBody);
    throw new Error(`OpenAI API request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

/**
 * POST handler for the /api/ai route.
 * Implements a fallback logic:
 * 1. Tries to get a response from the primary provider (Google Gemini).
 * 2. If the primary provider fails for any reason (API error, rate limit, etc.),
 *    it catches the error and automatically retries with the secondary provider (OpenAI).
 * 3. If both providers fail, it returns a 500 server error.
 * 
 * This ensures high availability for the AI feature.
 */
export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    let reply: string;
    try {
      console.log('Attempting to call Gemini API...');
      reply = await callGemini(prompt);
      console.log('Gemini API call successful.');
    } catch (geminiError) {
      console.warn('Gemini API failed, falling back to OpenAI...', geminiError);
      try {
        reply = await callOpenAI(prompt);
        console.log('OpenAI API call successful after fallback.');
      } catch (openAIError) {
        console.error('Both Gemini and OpenAI APIs failed.', openAIError);
        return NextResponse.json({ error: 'Both AI providers failed to respond.' }, { status: 500 });
      }
    }
    
    return NextResponse.json({ reply });

  } catch (error) {
    console.error('Error processing AI request:', error);
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 });
  }
}
