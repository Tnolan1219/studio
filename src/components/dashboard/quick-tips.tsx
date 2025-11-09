
'use client';
import { useState, useEffect, useRef } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const tips = [
    {
        text: "Did you know? The term 'real estate' dates back to the 1660s, derived from the Latin 'res' (thing) and 'regalis' (royal), meaning 'royal thing'.",
        link: 'https://www.investopedia.com/terms/r/realestate.asp'
    },
    {
        text: "The world's most expensive private residence is Antilia in Mumbai, India, owned by Mukesh Ambani. It's a 27-story skyscraper that's worth over $2 billion.",
        link: 'https://www.forbes.com/sites/carriecoolidge/2019/07/15/the-most-expensive-home-in-the-world/'
    },
    {
        text: "The shortest mortgage ever was paid off in just one day. In 2008, a British man inherited a large sum of money and paid off his mortgage the day after he took it out.",
        link: 'https://www.theguardian.com/money/2008/may/21/mortgages-property'
    },
    {
        text: "The Empire State Building was built in just over a year, from 1930 to 1931. It was the tallest building in the world for nearly 40 years.",
        link: 'https://www.esbnyc.com/about/history'
    },
    {
        text: "The largest house in the world is the Istana Nurul Iman in Brunei, the official residence of the Sultan of Brunei. It has 1,788 rooms and 257 bathrooms.",
        link: 'https://www.guinnessworldrecords.com/world-records/largest-palace'
    }
];

export function QuickTips() {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextTip = () => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % tips.length);
    };

    const prevTip = () => {
        setCurrentIndex((prevIndex) => (prevIndex - 1 + tips.length) % tips.length);
    };

    useEffect(() => {
        const timer = setInterval(() => {
            nextTip();
        }, 7000); // Slower automatic transition

        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full overflow-hidden bg-card/30 backdrop-blur-sm rounded-xl border py-4">
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent z-10"></div>
            <div className="relative h-16 flex items-center justify-center">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -50 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="flex-shrink-0 flex items-center gap-4 bg-card/60 px-6 py-3 rounded-full border border-border/50">
                            <Lightbulb className="w-6 h-6 text-primary flex-shrink-0" />
                            <span className="text-md text-muted-foreground whitespace-nowrap">
                                {tips[currentIndex].text}
                                {tips[currentIndex].link && (
                                    <Link href={tips[currentIndex].link} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline font-semibold">
                                        Learn more
                                    </Link>
                                )}
                            </span>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
            <div className="absolute bottom-4 right-4 flex gap-2">
                <button onClick={prevTip} className="p-2 bg-card rounded-full hover:bg-card/80 transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={nextTip} className="p-2 bg-card rounded-full hover:bg-card/80 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
}
