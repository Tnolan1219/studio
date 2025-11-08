
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Send, Sparkles, Loader2 } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { getDealAssessment } from '@/lib/actions';
import { marked } from 'marked';


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
    const [isAiQueryLoading, startAiQueryTransition] = useTransition();
    const [aiResponse, setAiResponse] = useState<AiResponse | null>(null);

    const userProfileRef = useMemoFirebase(() => {
        if (!user || user.isAnonymous) return null;
        return doc(firestore, `users/${user.uid}`);
    }, [firestore, user]);

    const { data: profileData } = useDoc<UserProfile>(userProfileRef);

    const userState = profileData?.state || 'the US';

    useEffect(() => {
        startBriefingTransition(async () => {
            const nationalBriefing = await getDealAssessment({
                dealType: "News Briefing",
                financialData: "",
                marketConditions: "Provide a concise summary of the top 3-4 national real estate news headlines.",
                stage: 'general-query'
            });
            const stateBriefing = await getDealAssessment({
                dealType: "News Briefing",
                financialData: "",
                marketConditions: `Provide a concise summary of the top 2-3 real estate news headlines for ${userState}.`,
                stage: 'general-query'
            });

            if(nationalBriefing.assessment) setNationalNews(nationalBriefing.assessment);
            if(stateBriefing.assessment) setStateNews(stateBriefing.assessment);
        });
    }, [user, userState]);

    const handleAiQuery = async () => {
        if (!aiQuery.trim()) return;

        startAiQueryTransition(async () => {
            setAiResponse({ question: aiQuery, answer: '', isLoading: true });
            const result = await getDealAssessment({
                dealType: "Question",
                financialData: "",
                marketConditions: aiQuery,
                stage: 'general-query'
            });
            if(result.assessment) {
                 const htmlAnswer = await marked(result.assessment);
                 setAiResponse({ question: aiQuery, answer: htmlAnswer, isLoading: false });
            } else {
                setAiResponse({ question: aiQuery, answer: `<p class="text-destructive">${result.message}</p>`, isLoading: false });
            }
        });
    };

    const renderSkeleton = () => (
        <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[95%]" />
            <Skeleton className="h-4 w-[85%]" />
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
                        <AccordionTrigger className='flex items-center gap-2'>
                             <Sparkles size={16} className="text-primary" /> Ask a Specific Question
                        </AccordionTrigger>
                        <AccordionContent>
                             <div className="flex w-full items-center gap-2">
                                <Input
                                    value={aiQuery}
                                    onChange={(e) => setAiQuery(e.target.value)}
                                    placeholder="e.g., How does house hacking work?"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAiQuery()}
                                />
                                <Button size="icon" onClick={handleAiQuery} disabled={isAiQueryLoading}>
                                    {isAiQueryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                </Button>
                            </div>
                            {aiResponse && (
                                <div className="mt-4 p-4 bg-muted/50 rounded-lg animate-fade-in">
                                    <p className="text-sm font-semibold text-muted-foreground">Q: {aiResponse.question}</p>
                                    {aiResponse.isLoading ? (
                                        <div className="flex items-center gap-2 mt-2">
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <p className="text-sm text-muted-foreground">Thinking...</p>
                                        </div>
                                    ) : (
                                        <div className="prose dark:prose-invert max-w-none text-sm mt-2" dangerouslySetInnerHTML={{ __html: aiResponse.answer }} />
                                    )}
                                </div>
                            )}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
