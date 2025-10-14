'use client';

import { useState, useEffect } from 'react';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { useAuth as useFirebaseAuth } from '@/firebase/provider'; // Use a specific import alias

export interface UserHookResult {
  user: User | null;
  isUserLoading: boolean;
  userError: Error | null;
}

/**
 * A dedicated hook for managing and subscribing to the Firebase user's authentication state.
 * @returns {UserHookResult} An object containing the user object, loading state, and any errors.
 */
export const useUser = (): UserHookResult => {
  const auth = useFirebaseAuth(); // Get the auth instance from the provider
  
  const [userState, setUserState] = useState<UserHookResult>({
    user: auth.currentUser, // Initialize with current user if available
    isUserLoading: true,    // Start in loading state
    userError: null,
  });

  useEffect(() => {
    // If there's no auth service, we can't determine the user.
    if (!auth) {
      setUserState({ user: null, isUserLoading: false, userError: new Error("Firebase Auth service is not available.") });
      return;
    }

    // Set loading state to true whenever the auth instance changes.
    setUserState({ user: null, isUserLoading: true, userError: null });

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // Auth state has been determined.
        setUserState({ user: firebaseUser, isUserLoading: false, userError: null });
      },
      (error) => {
        // An error occurred within the auth state listener.
        console.error("useUser: onAuthStateChanged error:", error);
        setUserState({ user: null, isUserLoading: false, userError: error });
      }
    );

    // Cleanup the subscription when the component unmounts or auth instance changes.
    return () => unsubscribe();
  }, [auth]); // This effect depends solely on the auth instance.

  return userState;
};
