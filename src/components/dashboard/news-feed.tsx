
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Send, Sparkles } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { marked } from 'marked';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { getAIResponse } from '@/lib/ai';


interface AiResponse {
    question: string;
    answer: string;
    isLoading: boolean;
}

export function NewsFeed() {
    const { user } = useUser();
    const firestore = useFirestore();
    const [nationalNews, setNationalNews] = useState('');
    const [stateNews, setStateNews] = useState('');
    const [isBriefingLoading, startBriefingTransition] = useTransition();
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || user.isAnonymous) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);

    const { data: profileData } = useDoc<UserProfile>(userProfileRef);

    const userState = profileData?.state || 'the US';

    useEffect(() => {
        if (user) { 
            startBriefingTransition(async () => {
                try {
                    const nationalPrompt = `You are a real estate market research AI. Generate a summary of key, generally accepted national real estate market trends in the US as simple bullet points. Use your existing knowledge of market principles (e.g., supply and demand, general interest rate impacts). Do not invent specific numbers or use real-time data.`;
                    
                    const localPrompt = `You are a real estate market research AI. Provide a general overview of the real estate market for ${userState} as simple bullet points. Discuss typical market characteristics for that area (e.g., "Historically a high-demand area," "Known for its stable rental market," etc.) based on your general knowledge. Do not invent specific numbers or use real-time data.`;

                    const [nationalResult, localResult] = await Promise.all([
                        getAIResponse(nationalPrompt),
                        getAIResponse(localPrompt)
                    ]);
                    
                    setNationalNews(await marked(nationalResult));
                    setStateNews(await marked(localResult));

                } catch (error) {
                    console.error("Failed to fetch AI news briefing:", error);
                    const errorMessage = "<p>Could not load briefing. The AI service may be temporarily unavailable.</p>";
                    setNationalNews(errorMessage);
                    setStateNews(errorMessage);
                }
            });
        }
    }, [user, userState]);

    const handleAiQuery = async () => {
        if (!aiQuery.trim()) return;

        setAiResponse({ question: aiQuery, answer: '', isLoading: true });

        try {
            const result = await getAIResponse(aiQuery);
            const htmlAnswer = await marked(result);
            setAiResponse({ question: aiQuery, answer: htmlAnswer, isLoading: false });
        } catch (error: any) {
            console.error("Failed to answer AI question:", error);
            setAiResponse({ question: aiQuery, answer: `<p class="text-destructive">Sorry, I couldn't answer that. ${error.message}</p>`, isLoading: false });
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
                    <Newspaper size={20} />
                    Your Real Estate Briefing
                </CardTitle>
                <CardDescription>Your personalized real estate news and analysis hub.</CardDescription>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" defaultValue={['item-1', 'item-2']} className="w-full">
                    <AccordionItem value="item-1">
                        <AccordionTrigger>National RE News</AccordionTrigger>
                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                            {isBriefingLoading ? renderSkeleton() : <div dangerouslySetInnerHTML={{ __html: nationalNews }} />}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>{userState} RE News</AccordionTrigger>
                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                             {isBriefingLoading ? renderSkeleton() : <div dangerouslySetInnerHTML={{ __html: stateNews }} />}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-3">
                        <AccordionTrigger className="text-primary">
                            <div className='flex items-center gap-2'>
                                <Sparkles size={16} />
                                Ask a Specific Question
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="flex w-full items-center gap-2 mt-2">
                                <Input
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    placeholder="e.g., What is the average rent for a 2-bed in Austin, TX?"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiQuery()}
                                />
                                <Button size="icon" onClick={handleAiQuery} disabled={aiResponse?.isLoading}>
                                    <Send className="w-4 h-4" />
                                </Button>
                            </div>
                             {aiResponse && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                    <p className="text-xs font-semibold text-muted-foreground">Q: {aiResponse.question}</p>
                                    <div className="mt-2 prose prose-sm dark:prose-invert max-w-none text-foreground">
                                        {aiResponse.isLoading ? renderSkeleton() : <div dangerouslySetInnerHTML={{ __html: aiResponse.answer }} />}
                                    </div>
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
