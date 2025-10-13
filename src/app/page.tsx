"use client";

import { useState } from 'react';
import { AuthModal } from '@/components/auth-modal';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
      <div className="z-10 text-center animate-fade-in">
        <h1 className="text-5xl font-bold font-headline text-foreground">
          TKN Financial RE
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
