
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { UserProfile } from '@/lib/types';

interface ProfileState {
  profileData: UserProfile | null;
  setProfileData: (data: Partial<UserProfile>) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileState>()(
  immer((set) => ({
    profileData: null,
    isLoading: true,
    setProfileData: (data) =>
      set((state) => {
        state.profileData = { ...state.profileData, ...data } as UserProfile;
      }),
    setIsLoading: (loading) =>
        set((state) => {
            state.isLoading = loading;
        })
  }))
);
