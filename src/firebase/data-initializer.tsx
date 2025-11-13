
'use client';

import { useEffect, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useProfileStore } from '@/hooks/use-profile-store';
import { useUser } from '@/firebase/auth/use-user';
import { useDoc } from '@/firebase/firestore/use-doc';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';

export function FirebaseDataInitializer() {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const { setProfileData, setIsLoading } = useProfileStore();

    const userProfileRef = useMemo(() => {
        if (user && !user.isAnonymous && firestore) {
            return doc(firestore, 'users', user.uid);
        }
        return null;
    }, [user, firestore]);

    const { data: profileDataFromHook, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);

    useEffect(() => {
        const combinedIsLoading = isUserLoading || (!!userProfileRef && isProfileLoading);
        setIsLoading(combinedIsLoading);
        
        if (profileDataFromHook) {
            setProfileData(profileDataFromHook);
        } else if (!combinedIsLoading && user) {
            // If not loading and we have a user but no profile from DB (e.g. anonymous user)
            // set some default/fallback data.
            setProfileData({
                name: user.displayName,
                email: user.email,
                plan: 'Free',
                savedDeals: 0,
                calculatorUses: 0,
            });
        }
    }, [profileDataFromHook, isUserLoading, isProfileLoading, user, setProfileData, setIsLoading, userProfileRef]);

    return null;
}
