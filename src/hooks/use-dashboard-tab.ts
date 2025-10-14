
"use client";

import { create } from 'zustand';

type DashboardTabState = {
  activeTab: string;
  setActiveTab: (tab: string) => void;
};

export const useDashboardTab = create<DashboardTabState>((set) => ({
  activeTab: 'home',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
