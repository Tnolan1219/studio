
'use client';

import { Rss } from 'lucide-react';

const mockFeed = [
    { id: 1, source: 'Realty Times', title: 'Housing Market Shows Signs of Cooling in Q3' },
    { id: 2, source: 'Investopedia', title: 'Top 5 Cities for Real Estate Investment in 2024' },
    { id: 3, source: 'BiggerPockets', title: 'Creative Financing Strategies for First-Time Investors' },
    { id: 4, source: 'Wall Street Journal', title: 'Lumber Prices Drop, Potentially Lowering Construction Costs' },
];

export function NewsFeed() {
    return (
        <div className="h-full">
            <ul className="space-y-4 overflow-y-auto h-full pr-2">
                {mockFeed.map(item => (
                    <li key={item.id} className="flex items-start gap-4">
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
        </div>
    );
}
