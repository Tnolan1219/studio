'use client';

import { useEffect, useState } from 'react';
import { Rss, Loader2 } from 'lucide-react';
import { useProfileStore } from '@/hooks/use-profile-store';
import { Card } from '../ui/card';

interface NewsItem {
    source: string;
    title: string;
}

export function NewsFeed() {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { profileData } = useProfileStore();

    useEffect(() => {
        const fetchNews = async () => {
            setIsLoading(true);
            const location = [profileData?.state, profileData?.country].filter(Boolean).join(', ');
            
            try {
                const response = await fetch('/api/openai-chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: `Generate 4 recent real estate news headlines. Location focus: ${location || 'USA'}.`,
                        dealData: null,
                        newsRequest: true,
                     }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch news from AI');
                }

                const data = await response.json();
                
                const cleanedJsonString = data.text.replace(/```json\n|\n```/g, '');
                try {
                    const parsedNews = JSON.parse(cleanedJsonString);
                    setNews(parsedNews);
                } catch (e) {
                    setNews([{ source: 'AI Analyst', title: data.text }]);
                }

            } catch (error) {
                console.error("Failed to fetch AI news:", error);
                setNews([{ source: 'System', title: 'Could not load news feed.' }]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchNews();
    }, [profileData?.state, profileData?.country]);

    return (
        <div className="h-full">
            {isLoading ? (
                <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : (
                 <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {news.map((item, index) => (
                        <li key={index}>
                           <Card className="bg-card/30 p-4 h-full">
                                <p className="text-sm font-semibold leading-snug">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-2">{item.source}</p>
                           </Card>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
