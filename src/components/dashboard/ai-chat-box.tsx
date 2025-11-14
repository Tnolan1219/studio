
'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, X, ChevronsUpDown } from "lucide-react";
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
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollAreaRef.current) {
            const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (viewport) {
                setTimeout(() => {
                    viewport.scrollTop = viewport.scrollHeight;
                }, 0);
            }
        }
    };
    
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (question?: string) => {
        const query = question || input;
        if (!query.trim() || isLoading) return;

        const userMessage: Message = { sender: 'user', text: query };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await fetch('/api/openai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: query }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("OpenAI API Error Response:", errorText);
                throw new Error('The server returned an error. Please check the console for details.');
            }

            const data = await response.json();
            const aiMessage: Message = { sender: 'ai', text: data.text || "Sorry, I couldn't get a response." };
            setMessages(prev => [...prev, aiMessage]);

        } catch (error: any) {
            console.error("Failed to answer AI question:", error);
            const errorMessage: Message = { sender: 'ai', text: `Sorry, something went wrong: ${error.message}` };
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
                             <CardContent className="flex-1 overflow-hidden p-2">
                                <ScrollArea className="h-full" ref={scrollAreaRef}>
                                    <div className="p-4 space-y-4">
                                        {messages.length === 0 ? (
                                             <div className="text-center text-muted-foreground p-4">
                                                <p className="font-semibold mb-2">Welcome, {getWelcomeName()}!</p>
                                                <p className="text-sm mb-4">You can ask me anything about real estate. Here are some examples:</p>
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                    {SAMPLE_QUESTIONS.map(q => (
                                                        <button key={q} onClick={() => handleSend(q)} className="p-2 bg-muted/50 rounded-md text-left hover:bg-muted transition-colors">
                                                            {q}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            messages.map((message, index) => (
                                                <div key={index} className={`flex items-start gap-3 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                                                    {message.sender === 'ai' && <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Sparkles size={16} className="text-primary"/></div>}
                                                    <div className={`rounded-lg p-3 max-w-[85%] prose dark:prose-invert prose-sm ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`} dangerouslySetInnerHTML={{ __html: message.text }}/>
                                                </div>
                                            ))
                                        )}
                                        {isLoading && (
                                            <div className="flex items-start gap-3">
                                                 <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"><Sparkles size={16} className="text-primary"/></div>
                                                 <div className="rounded-lg p-3 bg-muted flex items-center gap-2">
                                                     <Loader2 size={16} className="animate-spin" />
                                                     <span>Thinking...</span>
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
                                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                        placeholder="Ask about real estate..."
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
                className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
                {isOpen ? <ChevronsUpDown className="w-6 h-6"/> : <Sparkles className="w-6 h-6"/>}
            </button>
        </>
    );
}
