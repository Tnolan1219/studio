
'use client';

import { create } from 'zustand';
import type { UserProfile } from '@/lib/types';
import { immer } from 'zustand/middleware/immer';
import { useState, useEffect } from 'react';

interface ProfileState {
  profileData: Partial<UserProfile>;
  isLoading: boolean;
  hasHydrated: boolean;
  setProfileData: (data: Partial<UserProfile>) => void;
  setIsLoading: (loading: boolean) => void;
  setHasHydrated: (hydrated: boolean) => void;
  incrementCalculatorUses: () => void;
  incrementSavedDeals: () => void;
}

const useProfileStoreImpl = create<ProfileState>()(
  immer((set) => ({
    profileData: {},
    isLoading: true,
    hasHydrated: false,
    setProfileData: (data) =>
      set((state) => {
        state.profileData = { ...state.profileData, ...data };
      }),
    setIsLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),
    setHasHydrated: (hydrated) =>
      set((state) => {
        state.hasHydrated = hydrated;
      }),
    incrementCalculatorUses: () =>
      set((state) => {
        state.profileData.calculatorUses = (state.profileData.calculatorUses || 0) + 1;
      }),
    incrementSavedDeals: () =>
      set((state) => {
        state.profileData.savedDeals = (state.profileData.savedDeals || 0) + 1;
      }),
  }))
);

// Custom hook to ensure we use the store only after client-side hydration
export const useProfileStore = () => {
    const store = useProfileStoreImpl();
    const [hydratedStore, setHydratedStore] = useState(store);

    useEffect(() => {
        const unsub = useProfileStoreImpl.subscribe((newState) => {
            setHydratedStore(newState);
        });
        
        // Initial sync on mount
        setHydratedStore(useProfileStoreImpl.getState());
        useProfileStoreImpl.getState().setHasHydrated(true);

        return () => unsub();
    }, []);

    return hydratedStore;
};
