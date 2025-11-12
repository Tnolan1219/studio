
'use client';

import { useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useProfileStore } from '@/store/profile-store';
import { useUser } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function FirebaseDataInitializer() {
    const firestore = useFirestore();
    const { user, isLoading: isUserLoading } = useUser();
    const { setProfileData, setIsLoading } = useProfileStore();

    // Create a stable reference to the user's profile document.
    // Only create it when we have a user and firestore is available.
    const userProfileRef = useMemo(() => {
        if (user && firestore) {
            return doc(firestore, 'users', user.uid);
        }
        return null;
    }, [user, firestore]);

    const { data: profileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef, {
        listen: true,
    });

    // This effect is responsible for syncing the Firestore profile data with the Zustand store.
    useEffect(() => {
        // We combine the user loading state and profile loading state.
        const combinedIsLoading = isUserLoading || isProfileLoading;
        setIsLoading(combinedIsLoading);
        
        if (profileData) {
            setProfileData(profileData);
        }
    }, [profileData, isUserLoading, isProfileLoading, setProfileData, setIsLoading]);

    return null; // This component does not render anything.
}
