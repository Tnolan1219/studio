
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Send, Sparkles } from 'lucide-react';
import { useUser } from '@/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { answerRealEstateQuestion } from '@/ai/flows/answer-real-estate-question';
import { marked } from 'marked';

interface AiResponse {
    question: string;
    answer: string;
    isLoading: boolean;
}

export function NewsFeed() {
    const { user } = useUser();
    const [nationalNews, setNationalNews] = useState('');
    const [stateNews, setStateNews] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [aiQuery, setAiQuery] = useState('');
    const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);

    const userState = user?.isAnonymous ? 'the US' : (user?.displayName ? 'California' : 'the US'); // Mocking state for now

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            try {
                const nationalPromise = answerRealEstateQuestion({ question: "Latest national real estate market trends in the US" });
                const statePromise = answerRealEstateQuestion({ question: `Key real estate metrics in ${userState} (median price, avg rent, mortgage rates)` });

                const [nationalResult, stateResult] = await Promise.all([nationalPromise, statePromise]);

                setNationalNews(await marked(nationalResult.answer));
                setStateNews(await marked(stateResult.answer));
            } catch (error) {
                console.error("Failed to fetch AI news summaries:", error);
                setNationalNews("<p>Could not load national news. Please try again later.</p>");
                setStateNews("<p>Could not load state news. Please try again later.</p>");
            } finally {
                setIsLoading(false);
            }
        };

        if (user) { // Only fetch when user is loaded
            fetchNews();
        }

    }, [user, userState]);

    const handleAiQuery = async () => {
        if (!aiQuery.trim()) return;

        setAiResponse({ question: aiQuery, answer: '', isLoading: true });

        try {
            const result = await answerRealEstateQuestion({ question: aiQuery });
            const htmlAnswer = await marked(result.answer);
            setAiResponse({ question: aiQuery, answer: htmlAnswer, isLoading: false });
        } catch (error) {
            console.error("Failed to answer AI question:", error);
            setAiResponse({ question: aiQuery, answer: '<p class="text-destructive">Sorry, I couldn\'t answer that question. Please try again.</p>', isLoading: false });
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
                            {isLoading ? renderSkeleton() : <div dangerouslySetInnerHTML={{ __html: nationalNews }} />}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>{userState} RE News</AccordionTrigger>
                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                             {isLoading ? renderSkeleton() : <div dangerouslySetInnerHTML={{ __html: stateNews }} />}
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
