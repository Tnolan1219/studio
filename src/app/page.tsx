'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AuthModal } from '@/components/auth-modal';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <FirebaseClientProvider>
      <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-4 left-4">
          <Logo />
        </div>
        <div className="z-10 text-center animate-fade-in">
          <Image src="/ducknobackground.png" alt="Valentor RE Logo" width={128} height={128} className="mx-auto mb-4" unoptimized />
            
          <h1 className="text-5xl font-bold font-headline text-foreground">
            Valentor RE
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your Real Estate Investment Assistant
          </p>
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="mt-8 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-lg shadow-lg hover:bg-primary/90 transition-colors"
          >
            Sign In or Sign Up
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
      </div>
    </FirebaseClientProvider>
  );
}
