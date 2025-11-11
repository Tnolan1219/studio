
import { create } from 'zustand';
import type { UserProfile } from '@/lib/types';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useState, useEffect } from 'react';

type ProfileState = {
  profileData: Partial<UserProfile>;
  setProfileData: (data: Partial<UserProfile>) => void;
};

// We use a middleware to persist the store to sessionStorage
const useProfileStoreImpl = create<ProfileState>()(
  persist(
    (set) => ({
      profileData: {},
      setProfileData: (data) => set((state) => ({ profileData: { ...state.profileData, ...data } })),
    }),
    {
      name: 'profile-storage', // name of the item in storage
      storage: createJSONStorage(() => sessionStorage), // use sessionStorage
    }
  )
);

// Custom hook to handle hydration
export const useProfileStore = () => {
  const store = useProfileStoreImpl();
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    // This effect runs on the client and marks the store as hydrated
    setHasHydrated(true);
  }, []);

  return { ...store, hasHydrated };
};
