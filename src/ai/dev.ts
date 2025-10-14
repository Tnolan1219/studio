'use server';
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-deal-assessment.ts';
import '@/ai/flows/summarize-financial-news.ts';
import '@/ai/flows/generate-goal-example.ts';
import '@/ai/flows/answer-real-estate-question.ts';
import '@/ai/flows/generate-news-briefing.ts';
