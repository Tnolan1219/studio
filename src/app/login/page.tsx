'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AuthModal } from '@/components/auth-modal';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Logo } from '@/components/logo';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

export default function LoginPage() {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(true);

  return (
    <FirebaseClientProvider>
      <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden">
        <div className="absolute top-4 left-4">
          <Logo />
        </div>
        <div className="z-10 text-center animate-fade-in">
          <Image src="/logo3.png" alt="Valentor RE Logo" width={128} height={128} className="mx-auto mb-4" unoptimized />
            
          <h1 className="text-5xl font-bold font-headline text-foreground">
            Valentor RE
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Your Real Estate Investment Assistant
          </p>
           <AnimatePresence>
            {!isAuthModalOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{ duration: 0.3 }}
                className="mt-8"
              >
                <Button onClick={() => setIsAuthModalOpen(true)} size="lg" className="plan-pro">
                  Sign In or Sign Up
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onOpenChange={setIsAuthModalOpen} />
        <Footer />
      </div>
    </FirebaseClientProvider>
  );
}
