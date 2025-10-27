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
        // AI feature disabled
    };
    
    return (
         <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Sparkles size={20} className="text-primary"/>
                    Ask an AI Assistant
                </CardTitle>
                <CardDescription>
                    This feature is currently under construction.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex w-full items-center gap-2">
                    <Input
                        value={aiQuery}
                        onChange={(e) => setAiQuery(e.target.value)}
                        placeholder="e.g., How does house hacking work?"
                        onKeyDown={(e) => e.key === 'Enter' && handleAiQuery(aiQuery)}
                        disabled
                    />
                    <Button size="icon" onClick={() => handleAiQuery(aiQuery)} disabled>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                 {aiResponse && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg animate-fade-in">
                        <p className="text-sm font-semibold text-muted-foreground">Q: {aiResponse.question}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
