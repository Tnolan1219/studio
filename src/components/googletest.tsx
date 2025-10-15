
'use client';

import { useState } from 'react';
import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, type User } from "firebase/auth";
import { firebaseConfig } from "@/firebase/config";

// Step 4: Add Firebase Auth Setup (within the component)
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}
const auth = getAuth(app);

// Step 5: Add Google Sign-In Logic
const provider = new GoogleAuthProvider();

export default function GoogleTest() {
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, provider);
      console.log("Signed in:", result.user.displayName);
      setUser(result.user);
      setError(null);
    } catch (error: any) {
      console.error("Sign-in error:", error);
      setError(`Sign-in failed. Check the console for details.`);
      setUser(null);
    }
  }

  if (user) {
    return (
      <div className="mt-4 p-4 border rounded-lg bg-green-500/10 border-green-500/30 text-center">
        <p className="font-semibold text-green-300">Sign-in successful!</p>
        <p className="text-foreground">Welcome, {user.displayName || 'User'}</p>
      </div>
    );
  }

  return (
    <>
      <button 
          onClick={signInWithGoogle}
          className="mt-4 px-4 py-2 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground font-semibold rounded-lg shadow-sm transition-colors"
      >
        Test Sign in with Google
      </button>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </>
  );
}
