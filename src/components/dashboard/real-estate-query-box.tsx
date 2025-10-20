'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Skeleton } from '../ui/skeleton';
import { getDealAssessment } from '@/lib/actions';

interface AiResponse {
    question: string;
    answer: string;
    isLoading: boolean;
}

const SAMPLE_QUESTIONS = [
    "What is the 1% rule in real estate?",
    "Explain how a cash-out refinance works.",
    "What are the benefits of a 1031 exchange?",
    "How do I calculate cap rate?",
];

export function RealEstateQueryBox() {
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);

    const handleAiQuery = async (question: string) => {
        if (!question.trim()) return;

        setAiResponse({ question, answer: '', isLoading: true });

        try {
            const result = await getDealAssessment({
                dealType: 'general',
                financialData: '',
                marketConditions: question,
                stage: 'general-query'
            });

            if (result.assessment) {
                setAiResponse({ question, answer: result.assessment, isLoading: false });
            } else {
                throw new Error(result.message);
            }
        } catch (error: any) {
            console.error("Failed to answer AI question:", error);
            setAiResponse({ question, answer: `<p class="text-destructive">Sorry, I couldn't answer that. ${error.message}</p>`, isLoading: false });
        }
        setAiQuery('');
    };
    
    const renderSkeleton = () => (
        <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
        </div>
    );

    return (
         <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles size={20} className="text-primary"/>
                    Ask an AI Assistant
                </CardTitle>
                <CardDescription>
                    Have a real estate question? Ask our AI assistant for a quick answer.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                    {SAMPLE_QUESTIONS.map((q, i) => (
                        <Button key={i} variant="outline" size="sm" onClick={() => handleAiQuery(q)}>
                           {q}
                        </Button>
                    ))}
                </div>

                <div className="flex w-full items-center gap-2">
                    <Input
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="e.g., How does house hacking work?"
                        onKeyDown={(e) => e.key === 'Enter' && handleAiQuery(aiQuery)}
                    />
                    <Button size="icon" onClick={() => handleAiQuery(aiQuery)} disabled={aiResponse?.isLoading}>
                        {aiResponse?.isLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4" />}
                    </Button>
                </div>
                 {aiResponse && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg animate-fade-in">
                        <p className="text-sm font-semibold text-muted-foreground">Q: {aiResponse.question}</p>
                        <div className="mt-2 prose prose-sm dark:prose-invert max-w-none text-foreground">
                            {aiResponse.isLoading ? renderSkeleton() : <div dangerouslySetInnerHTML={{ __html: aiResponse.answer }} />}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
