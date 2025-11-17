
'use client';

import { Header } from '@/components/header';
import { ArticleCard } from '@/components/articles/article-card';
import type { Article } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { FirebaseClientProvider } from '@/firebase';


// Mock data for demonstration purposes
const mockArticles: Article[] = [
  {
    id: 'newsletter-1',
    title: 'Weekly Market Briefing',
    author: 'TKN Finance',
    date: '2024-07-19',
    snippet: 'Inflation, interest rates, and a resilient housing market. We break down what you need to know this week.',
    imageUrl: 'https://picsum.photos/seed/newsletter1/600/400',
    imageHint: 'cityscape data',
    href: '/articles/weekly-newsletter',
    isFeatured: true,
  },
  {
    id: '1',
    title: 'The BRRRR Method: Real Estate\'s Not-So-Secret Formula',
    author: 'TKN Finance',
    date: '2024-07-15',
    snippet: 'Learn how to Buy, Rehab, Rent, Refinance, and Repeat your way to financial freedom with our in-depth guide.',
    imageUrl: 'https://picsum.photos/seed/brrrr/600/400',
    imageHint: 'house blueprint',
    href: '/articles/brrrr-method',
  },
  {
    id: '2',
    title: '5 Common Mistakes to Avoid When Flipping Houses',
    author: 'Jane Doe',
    date: '2024-07-10',
    snippet: "Don't let these common pitfalls derail your house flipping project. We break down what to watch out for.",
    imageUrl: 'https://picsum.photos/seed/mistake/600/400',
    imageHint: 'under construction',
    href: '#',
  },
  {
    id: '3',
    title: 'Understanding Cap Rate vs. Cash-on-Cash Return',
    author: 'John Smith',
    date: '2024-07-05',
    snippet: 'Two of the most important metrics in real estate investing, explained simply. When to use each for your deal analysis.',
    imageUrl: 'https://picsum.photos/seed/metrics/600/400',
    imageHint: 'calculator chart',
    href: '#',
  },
   {
    id: '4',
    title: 'How to Secure Your First Creative Financing Deal',
    author: 'TKN Finance',
    date: '2024-06-28',
    snippet: 'No bank? No problem. Explore the world of seller financing, subject-to, and other creative ways to fund your next deal.',
    imageUrl: 'https://picsum.photos/seed/creative/600/400',
    imageHint: 'handshake deal',
    href: '#',
  },
  {
    id: '5',
    title: 'The Landlord\'s Guide to Tenant Screening',
    author: 'Emily White',
    date: '2024-06-20',
    snippet: 'Finding the right tenant is the key to a successful rental property. Our guide gives you a step-by-step process.',
    imageUrl: 'https://picsum.photos/seed/tenant/600/400',
    imageHint: 'person form',
    href: '#',
  },
  {
    id: '6',
    title: 'Maximizing Depreciation to Lower Your Tax Bill',
    author: 'TKN Finance',
    date: '2024-06-12',
    snippet: 'Discover how this powerful tax advantage can significantly boost your net returns on investment properties.',
    imageUrl: 'https://picsum.photos/seed/taxes/600/400',
    imageHint: 'tax documents',
    href: '#',
  },
];

function ArticlesView() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 animate-fade-in">
        <div className="mb-10">
          <Link href="/" passHref>
             <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
            </Button>
          </Link>
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl font-headline">
            Articles & Insights
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {mockArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      </main>
    </div>
  );
}


export default function ArticlesPage() {
    return (
        <FirebaseClientProvider>
            <ArticlesView />
        </FirebaseClientProvider>
    )
}
