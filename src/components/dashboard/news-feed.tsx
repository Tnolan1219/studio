'use client';

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Send, Sparkles } from 'lucide-react';
import { useUser, useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { getDealAssessment } from '@/lib/actions';


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
        // AI feature disabled
    }, [user, userState]);

    const handleAiQuery = async () => {
        // AI feature disabled
    };

    const renderSkeleton = () => (
        <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Feature under construction.</p>
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
                            {renderSkeleton()}
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="item-2">
                        <AccordionTrigger>{userState} RE News</AccordionTrigger>
                        <AccordionContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
                             {renderSkeleton()}
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
                             <p className="text-sm text-muted-foreground">This feature is under construction.</p>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </CardContent>
        </Card>
    );
}
