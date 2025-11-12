
'use client';

import { useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { seedPlans } from '@/lib/seed-plans';
import { useProfileStore } from '@/store/profile-store';
import { useUser } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function FirebaseDataInitializer() {
    const firestore = useFirestore();
    const { user } = useUser();
    const { setProfileData, setIsLoading } = useProfileStore();

    // Seed plans on initial load
    useEffect(() => {
        if (firestore) {
            seedPlans(firestore);
        }
    }, [firestore]);

    // Fetch user profile data and sync with store
    const userProfileRef = user ? doc(firestore, 'users', user.uid) : null;
    const { data: profileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef, {
        listen: true,
    });

    useEffect(() => {
        setIsLoading(isProfileLoading);
        if (profileData) {
            setProfileData(profileData);
        }
    }, [profileData, isProfileLoading, setProfileData, setIsLoading]);

    return null; // This component does not render anything
}
