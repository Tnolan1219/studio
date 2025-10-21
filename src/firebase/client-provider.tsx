
'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { isFirebaseConfigValid } from './config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount
  
  if (!isFirebaseConfigValid() || !firebaseServices || !firebaseServices.firebaseApp) {
    // Render a fallback UI if Firebase config is invalid or initialization fails.
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-background text-foreground p-4">
        <div className="text-center max-w-md p-6 border border-destructive/50 bg-destructive/10 rounded-lg">
            <h1 className="text-xl font-bold text-destructive">Firebase Not Configured</h1>
            <p className="mt-2 text-sm text-destructive-foreground/80">
                The application cannot connect to Firebase. This is usually because the required
                Firebase environment variables are missing or incorrect.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
                Please ensure you have set all `NEXT_PUBLIC_FIREBASE_*` variables in your deployment environment (e.g., Vercel project settings).
            </p>
        </div>
      </div>
    );
  }


  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
