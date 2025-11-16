import type { Article } from '@/lib/types';
import Image from 'next/image';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '../ui/button';
import { ArrowRight } from 'lucide-react';

interface ArticleCardProps {
  article: Article;
}

export const ArticleCard = ({ article }: ArticleCardProps) => {
  return (
    <Link href={article.href} passHref>
      <Card className="bg-card/60 backdrop-blur-sm h-full flex flex-col group overflow-hidden">
        <CardHeader className="p-0">
          <div className="relative h-48 w-full">
            <Image
              src={article.imageUrl}
              alt={article.title}
              fill
              style={{ objectFit: 'cover' }}
              className="group-hover:scale-105 transition-transform duration-300"
              data-ai-hint={article.imageHint}
            />
          </div>
        </CardHeader>
        <CardContent className="p-6 flex-grow flex flex-col">
            <p className="text-xs text-muted-foreground mb-1">{article.author} • {article.date}</p>
            <CardTitle className="text-xl mb-2 flex-grow">{article.title}</CardTitle>
            <CardDescription className="text-sm">{article.snippet}</CardDescription>
        </CardContent>
        <CardFooter className="p-6 pt-0">
            <Button variant="link" className="p-0 h-auto text-primary">
                Read More
                <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
        </CardFooter>
      </Card>
    </Link>
  );
};
