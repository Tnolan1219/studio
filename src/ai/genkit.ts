import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/google-genai';
import {dotprompt} from 'genkit/dotprompt';

// The plugins automatically look for the GEMINI_API_KEY and OPENAI_API_KEY
// in your environment variables on the server.
// This setup ensures your API keys are never exposed to the client-side browser.
export const ai = genkit({
  plugins: [
    googleAI(),
    dotprompt()
  ],
  logLevel: "debug",
  enableTracing: true,
});
