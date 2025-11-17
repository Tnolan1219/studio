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
    id: 'newsletter-2',
    title: 'The Great Rate Lock-In Shows Its First Cracks',
    author: 'Valentor RE',
    date: '2024-07-26',
    snippet: 'A growing number of "rate-locked" homeowners are being forced to sell, creating a shadow market of opportunity for savvy investors.',
    imageUrl: 'https://picsum.photos/seed/rate-lock/600/400',
    imageHint: 'house keys chart',
    href: '/articles/weekly-newsletter',
    isFeatured: true,
  },
  {
    id: 'newsletter-1',
    title: 'Market Briefing: Inflation, Rates, and a Resilient Housing Market',
    author: 'TKN Finance',
    date: '2024-07-19',
    snippet: 'A look at how persistent inflation and a surprisingly resilient housing market are shaping investment strategies.',
    imageUrl: 'https://picsum.photos/seed/newsletter1/600/400',
    imageHint: 'cityscape data',
    href: '/articles/market-briefing-jul-19',
  },
  {
    id: '1',
    title: 'The BRRRR Method: Thriving in a High-Interest Rate World',
    author: 'TKN Finance',
    date: '2024-07-15',
    snippet: 'Learn how to Buy, Rehab, Rent, Refinance, and Repeat your way to financial freedom with our in-depth guide.',
    imageUrl: 'https://picsum.photos/seed/brrrr-main/600/400',
    imageHint: 'house blueprint renovation',
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
