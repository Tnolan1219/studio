
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CornerDownLeft, MessageSquare } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function OpenAIChatbot() {
  const [messages, setMessages] = useState<{ sender: 'user' | 'bot'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (input.trim() === '' || isLoading) return;

    const newMessages = [...messages, { sender: 'user' as const, text: input }];
    setMessages(newMessages);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/openai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: currentInput }),
      });

      if (!response.ok) {
        // If the response is not OK, read the body as text to get the error message.
        // This avoids a JSON parsing error if the server returned an HTML error page.
        const errorText = await response.text();
        throw new Error(errorText || 'An unexpected API error occurred.');
      }
      
      const data = await response.json();
      const botMessage = data.text || 'Sorry, I could not understand that.';

      setMessages(prev => [...prev, { sender: 'bot' as const, text: botMessage }]);
    } catch (error: any) {
      console.error('Error fetching from OpenAI API:', error);
      // The error message now comes from the actual server response text.
      setMessages(prev => [...prev, { sender: 'bot' as const, text: `Sorry, something went wrong: ${error.message}` }]);
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <>
        <div className="fixed bottom-6 right-6 z-50">
            <Button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full h-16 w-16 bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-transform transform hover:scale-110"
                aria-label="Toggle Chatbot"
            >
                <MessageSquare className="h-8 w-8" />
            </Button>
        </div>

        <AnimatePresence>
        {isOpen && (
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                transition={{ duration: 0.3 }}
                className="fixed bottom-24 right-6 z-50"
            >
                <Card className="w-96 shadow-2xl">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>OpenAI Assistant</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                        X
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="h-80 overflow-y-auto p-4 space-y-4 border rounded-md bg-muted/50">
                        {messages.map((message, index) => (
                            <div key={index} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`p-3 rounded-lg max-w-[85%] ${message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                                <div dangerouslySetInnerHTML={{ __html: message.text }} />
                            </div>
                            </div>
                        ))}
                         {isLoading && <div className="text-center text-muted-foreground">Thinking...</div>}
                        </div>
                        <div className="flex space-x-2 mt-4">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                            placeholder="Ask me anything..."
                            disabled={isLoading}
                        />
                        <Button onClick={handleSendMessage} size="icon" disabled={isLoading}>
                            <CornerDownLeft className="h-4 w-4" />
                        </Button>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        )}
        </AnimatePresence>
    </>
  );
}
