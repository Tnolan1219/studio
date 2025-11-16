'use client';

import { useEffect, useState } from 'react';
import { Rss, Loader2 } from 'lucide-react';
import { useProfileStore } from '@/hooks/use-profile-store';

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
                        prompt: `Generate 4-5 recent real estate news headlines. Location focus: ${location || 'USA'}.`,
                        dealData: null, // Ensure this is null for news requests
                        newsRequest: true,
                     }),
                });

                if (!response.ok) {
                    throw new Error('Failed to fetch news from AI');
                }

                const data = await response.json();
                
                // The AI is asked to return a JSON array string. We need to parse it.
                // It might be wrapped in ```json ... ```, so we clean that up.
                const cleanedJsonString = data.text.replace(/```json\n|\n```/g, '');
                try {
                    const parsedNews = JSON.parse(cleanedJsonString);
                    setNews(parsedNews);
                } catch (e) {
                     // Fallback if parsing fails - show the raw text.
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
                <ul className="space-y-4 overflow-y-auto h-full pr-2">
                    {news.map((item, index) => (
                        <li key={index} className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Rss className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-sm font-medium leading-none">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-1">{item.source}</p>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
