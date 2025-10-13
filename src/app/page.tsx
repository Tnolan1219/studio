"use client";

import { useState } from 'react';
import { AuthModal } from '@/components/auth-modal';

const Logo = () => (
    <svg 
        width="128" 
        height="128" 
        viewBox="0 0 100 100" 
        xmlns="http://www.w3.org/2000/svg" 
        className="mx-auto mb-6 animate-pulse-slow"
    >
        <defs>
            <linearGradient id="duckGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" style={{stopColor: 'hsl(var(--primary) / 0.5)'}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--primary))'}} />
            </linearGradient>
        </defs>
        <path 
            d="M 85,25 C 85,18 78,15 72,15 C 65,15 60,20 60,27 C 60,34 65,39 72,39 C 78,39 84,36 85,35 M 92,27 C 92,26 91,22 85,25" 
            fill="url(#duckGradient)"
        />
        <path 
            d="M 60,27 C 50,45 35,50 25,50 C 15,50 10,45 10,38 C 10,30 20,30 30,35 C 30,35 20,45 30,55 C 40,65 55,60 65,50 C 75,40 70,30 60,27 Z"
            fill="url(#duckGradient)"
        />
        <path
            d="M 30,55 C 20,75 25,90 40,90 C 55,90 65,75 60,60 C 55,45 40,50 30,55 Z"
            fill="url(#duckGradient)"
        />
    </svg>
);


export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
      <div className="z-10 text-center animate-fade-in">
        <Logo />
        <h1 className="text-5xl font-bold font-headline text-foreground">
          Valentor Financial
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Your Real Estate Investment Co-Pilot
        </p>
        <button 
            onClick={() => setIsAuthModalOpen(true)}
            className="mt-8 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
        >
            Enter App
        </button>
      </div>
      <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
    </div>
  );
}
