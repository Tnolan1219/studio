"use client";

import { useState } from 'react';
import { AuthModal } from '@/components/auth-modal';

const ParticleBackground = () => {
  const particleCount = 50;
  const particles = Array.from({ length: particleCount }).map((_, i) => {
    const size = Math.random() * 3 + 1;
    const duration = Math.random() * 20 + 20;
    const delay = Math.random() * -40;
    const left = Math.random() * 100;
    const top = Math.random() * 100;

    const style: React.CSSProperties = {
      width: `${size}px`,
      height: `${size}px`,
      left: `${left}%`,
      top: `${top}%`,
      animationDuration: `${duration}s`,
      animationDelay: `${delay}s`,
    };
    return <div key={i} className="particle" style={style}></div>;
  });

  return <div className="particle-container">{particles}</div>;
};


export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-black overflow-hidden">
      <ParticleBackground />
      <div className="z-10 text-center animate-fade-in">
        <h1 className="text-5xl font-bold font-headline text-white">
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
