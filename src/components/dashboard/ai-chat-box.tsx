
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, X, ChevronsUpDown } from "lucide-react";
import { Skeleton } from '../ui/skeleton';
import { getDealAssessment } from '@/lib/actions';
import { ScrollArea } from '../ui/scroll-area';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import { useUser } from '@/firebase';

interface Message {
    sender: 'user' | 'ai';
    text: string;
}

const SAMPLE_QUESTIONS = [
    "What is the 1% rule?",
    "Explain cash-out refinance.",
    "Benefits of a 1031 exchange?",
    "How do I calculate cap rate?",
];

export function AIChatBox() {
    const { user } = useUser();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSend = async (question?: string) => {
        const query = question || input;
        if (!query.trim()) return;

        const userMessage: Message = { sender: 'user', text: query };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const result = await getDealAssessment({
                dealType: 'general',
                financialData: '',
                marketConditions: query,
                stage: 'general-query'
            });

            const aiText = result.assessment || result.message;
            const aiMessage: Message = { sender: 'ai', text: aiText };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error: any) {
            console.error("Failed to answer AI question:", error);
            const errorMessage: Message = { sender: 'ai', text: `<p class="text-destructive">Sorry, something went wrong.</p>` };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getWelcomeName = () => {
        if (!user) return "Guest";
        if (user.isAnonymous) return "Guest";
        return user.displayName?.split(' ')[0] || user.email?.split('@')[0] || "User";
    }

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: '100%', opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: '100%', opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="fixed bottom-28 right-4 z-50 w-full max-w-md"
                    >
                        <Card className="bg-card/80 backdrop-blur-lg shadow-2xl h-[60vh] flex flex-col">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="flex items-center gap-2">
                                     <Badge variant="secondary" className="border-primary/50">
                                        <Sparkles size={14} className="text-primary mr-1" />
                                        AI Assistant
                                     </Badge>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="flex-1 overflow-hidden p-0">
                                <ScrollArea className="h-full p-6">
                                    <div className="space-y-4">
                                        {messages.length === 0 && (
                                            <div className="text-center text-sm text-muted-foreground p-8">
                                                <p className='font-bold text-lg mb-2'>Hi {getWelcomeName()}!</p>
                                                <p>Ask me anything about real estate investing.</p>
                                                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                                                    {SAMPLE_QUESTIONS.map((q, i) => (
                                                        <Button key={i} variant="outline" size="sm" onClick={() => handleSend(q)}>
                                                        {q}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {messages.map((msg, index) => (
                                            <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`rounded-lg px-4 py-2 max-w-[80%] ${msg.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                                   <div className="text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: msg.text }} />
                                                </div>
                                            </div>
                                        ))}
                                         {isLoading && (
                                            <div className="flex justify-start">
                                                <div className="rounded-lg px-4 py-2 bg-muted flex items-center">
                                                    <Loader2 className="w-5 h-5 animate-spin"/>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </ScrollArea>
                            </CardContent>
                             <CardFooter>
                                <div className="flex w-full items-center gap-2">
                                    <Input
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder="Ask about financing, market trends, etc."
                                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                        disabled={isLoading}
                                    />
                                    <Button size="icon" onClick={() => handleSend()} disabled={isLoading}>
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

             <button
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-28 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
                {isOpen ? <ChevronsUpDown className="w-6 h-6"/> : <Sparkles className="w-6 h-6"/>}
            </button>
        </>
    );
}
