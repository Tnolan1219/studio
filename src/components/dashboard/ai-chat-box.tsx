
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Sparkles, X, ChevronsUpDown } from "lucide-react";
import { assessDeal } from '@/lib/actions';
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
            const result = await assessDeal(
                'general',
                '',
                query,
                'general-query'
            );

            const aiText = result || "Sorry, I couldn't get a response.";
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
                               <p className="text-sm text-muted-foreground text-center p-4">AI Chat is currently under construction. Check back soon!</p>
                            </CardContent>
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
