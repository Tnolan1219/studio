"use client";

import { useState, useEffect } from 'react';
import { summarizeFinancialNews } from '@/ai/flows/summarize-financial-news';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { mockNewsHeadlines, mockUser } from "@/lib/mock-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper } from 'lucide-react';

export function NewsFeed() {
    const [summary, setSummary] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        async function fetchSummary() {
            try {
                setIsLoading(true);
                setError('');
                const result = await summarizeFinancialNews({
                    investmentPreferences: mockUser.financialGoal,
                    newsHeadlines: mockNewsHeadlines
                });
                setSummary(result.summary);
            } catch (e) {
                console.error(e);
                setError('Failed to load news summary. Please try again.');
            } finally {
                setIsLoading(false);
            }
        }
        fetchSummary();
    }, []);

    return (
        <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Newspaper size={20} />
                    Your Financial News Digest
                </CardTitle>
                <CardDescription>AI-powered summary based on your interests.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-4/5" />
                    </div>
                ) : error ? (
                    <p className="text-destructive">{error}</p>
                ) : (
                    <p className="text-sm text-muted-foreground">{summary}</p>
                )}
            </CardContent>
            <CardFooter>
                <ul className="text-xs text-muted-foreground/80 space-y-1 w-full">
                    <p className="font-semibold mb-2">Today's Headlines:</p>
                    {mockNewsHeadlines.slice(0, 3).map((headline, i) => (
                        <li key={i} className="truncate">- {headline}</li>
                    ))}
                </ul>
            </CardFooter>
        </Card>
    );
}
