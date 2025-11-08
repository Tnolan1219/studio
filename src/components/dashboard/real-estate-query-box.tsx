'use client';
import { assessDeal } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useUser } from '@/firebase/auth/use-user';
import { useCollection } from '@/firebase/firestore/use-collection';
import type { Deal, DealStage } from '@/lib/types';
import { useState, FormEvent, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export function RealEstateQueryBox({
  deal,
  stage,
}: {
  deal: Deal;
  stage: DealStage | 'initial-analysis';
}) {
  const { user } = useUser();
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const path = `users/${user?.uid}/deals/${deal.id}/queries`;
  const { data: messages, add, loading: messagesLoading } = useCollection<Message>(path);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollableViewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollableViewport) {
        scrollableViewport.scrollTop = scrollableViewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleQuerySubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim() || !user) return;

    const userQuery: Message = { role: 'user', text: query };
    await add(userQuery);
    setQuery('');
    setIsLoading(true);

    try {
      const financialData = `Purchase Price: ${deal.purchasePrice}, ARV: ${deal.arv}, Rehab Costs: ${deal.rehabCost}`;
      const responseText = await assessDeal(deal.type, financialData, query, stage);
      const modelResponse: Message = { role: 'model', text: responseText };
      await add(modelResponse);
    } catch (error) {
      console.error('Error querying AI:', error);
      const errorResponse: Message = { role: 'model', text: 'Sorry, I had trouble with that request.' };
      await add(errorResponse);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Deal Assistant</CardTitle>
        <CardDescription>
          Ask questions about your deal. The AI will provide feedback based on
          the current stage.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-72 w-full pr-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messagesLoading && <p>Loading history...</p>}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
              >
                {message.role === 'model' && (
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    AI
                  </span>
                )}
                <div
                  className={`rounded-lg p-3 max-w-[80%] ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <ReactMarkdown className="prose prose-sm max-w-none">
                    {message.text}
                  </ReactMarkdown>
                </div>
                {message.role === 'user' && (
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                    {user?.displayName?.charAt(0) || 'U'}
                  </span>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-4">
                <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  AI
                </span>
                <div className="rounded-lg p-3 max-w-[80%] bg-muted text-muted-foreground animate-pulse">
                  Thinking...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleQuerySubmit} className="flex w-full items-center space-x-2">
          <Input
            id="message"
            placeholder="Type your message..."
            className="flex-1"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m22 2-7 20-4-9-9-4Z" />
              <path d="M22 2 11 13" />
            </svg>
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
