
'use server';

import { marked } from 'marked';

/**
 * Calls the Google Gemini API to generate content.
 * This function is now inside the server action to avoid internal fetch issues.
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
      system_instruction: {
        parts: {
          text: "You are a helpful assistant. Respond with simplified bullet points for quick, efficient answers. Ensure your responses are professional, easy to read, and do not include any JSON or markdown formatting."
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
  return data.candidates[0].content.parts[0].text;
}

/**
 * Calls the OpenAI API to generate content.
 * This function is now inside the server action to avoid internal fetch issues.
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
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: "You are a helpful assistant. Respond with simplified bullet points for quick, efficient answers that are professional and easy to read. Do not include any JSON formatting." },
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
 * Gets an AI assessment for a deal by constructing a prompt and calling the AI provider directly.
 * @param input An object containing the deal type, financials, and user query.
 * @returns A result object with a message and the HTML assessment.
 */
export async function getDealAssessment(input: {
  dealType: string;
  financialData: string;
  marketConditions: string;
}) {
  try {
    // Construct a detailed prompt for the AI
    const prompt = `
      You are a real estate investment expert. Analyze the following deal and provide a quick, efficient response using simplified bullet points.
      - Deal Type: ${input.dealType}
      - Financials: ${input.financialData}
      - Market/Query: ${input.marketConditions}
      
      Provide a markdown-formatted assessment covering:
      - **Recommendation:** (e.g., "Recommended", "Caution") with a brief justification.
      - **Financials:** Key positive or negative metrics.
      - **Financing:** Creative ideas or notes.
      - **Value-Add:** Quick ideas to maximize ROI.
    `;
    
    let reply: string;
    try {
      console.log('Attempting to call Gemini API from Server Action...');
      reply = await callGemini(prompt);
      console.log('Gemini API call successful from Server Action.');
    } catch (geminiError) {
      console.warn('Gemini API failed in Server Action, falling back to OpenAI...', geminiError);
      try {
        reply = await callOpenAI(prompt);
        console.log('OpenAI API call successful after fallback in Server Action.');
      } catch (openAIError) {
        console.error('Both Gemini and OpenAI APIs failed in Server Action.', openAIError);
        throw new Error('Both AI providers failed to respond.');
      }
    }
    
    // Convert markdown response to HTML for safe rendering
    const htmlAssessment = await marked(reply);

    return {
      message: "Assessment generated successfully.",
      assessment: htmlAssessment,
    };
  } catch (error: any) {
    console.error("Error in getDealAssessment:", error);
    return {
      message: error.message || "Failed to generate assessment.",
      assessment: null,
    };
  }
}
