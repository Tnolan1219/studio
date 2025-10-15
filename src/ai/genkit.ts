import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';

// The googleAI() plugin automatically looks for the GEMINI_API_KEY 
// in your environment variables on the server.
// You do not need to pass it in manually like `googleAI({apiKey: process.env.GEMINI_API_KEY})`.
// This setup ensures your API key is never exposed to the client-side browser.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-1.5-flash',
});
