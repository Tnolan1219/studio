
'use client';

import { useState } from 'react';
import { AuthModal } from '@/components/auth-modal';
import { FirebaseClientProvider } from '@/firebase/client-provider';

const Logo = () => (
  <svg
    width="128"
    height="128"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    className="mx-auto mb-6"
  >
    <defs>
      <linearGradient id="cyanGradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
        <stop offset="100%" style={{ stopColor: 'hsl(190, 100%, 70%)' }} />
      </linearGradient>
      <filter id="cyanGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <g style={{ filter: 'url(#cyanGlow)' }}>
      <path
        d="M 50,15 L 85,75 L 15,75 Z"
        fill="url(#cyanGradient)"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
      />
    </g>
  </svg>
);

export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <FirebaseClientProvider>
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
    </FirebaseClientProvider>
  );
}
