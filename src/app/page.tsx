"use client";

import { useState, useEffect } from 'react';
import { AuthModal } from '@/components/auth-modal';

interface ParticleStyle {
  width: string;
  height: string;
  left: string;
  top: string;
  animationDuration: string;
  animationDelay: string;
}

const ParticleBackground = () => {
  const [particles, setParticles] = useState<React.ReactElement[]>([]);
  const particleCount = 50;

  useEffect(() => {
    const generatedParticles = Array.from({ length: particleCount }).map((_, i) => {
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
    setParticles(generatedParticles);
  }, []);

  return <div className="particle-container">{particles}</div>;
};


export default function LandingPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showParticles, setShowParticles] = useState(false);

  useEffect(() => {
    // This ensures that the particles are only rendered on the client side, preventing hydration errors.
    setShowParticles(true);
  }, []);

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center bg-background overflow-hidden">
      {showParticles && <ParticleBackground />}
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
