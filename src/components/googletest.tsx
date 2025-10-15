
'use client';

import { initializeApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
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

async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    console.log("Signed in:", result.user.displayName);
    // You can add redirection or state update here
    alert(`Successfully signed in as ${result.user.displayName}`);
  } catch (error) {
    console.error("Sign-in error:", error);
    alert(`Sign-in failed. Check the console for details.`);
  }
}

export default function GoogleTest() {
  return (
    // Step 6: Add a Button to Trigger Sign-In
    <button 
        onClick={signInWithGoogle}
        className="mt-4 px-4 py-2 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground font-semibold rounded-lg shadow-sm transition-colors"
    >
      Test Sign in with Google
    </button>
  );
}
