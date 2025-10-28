
'use client';

import HomeTab from '@/components/dashboard/home-tab';
import AnalyzeTab from '@/components/dashboard/analyze-tab';
import DealsTab from '@/components/dashboard/deals-tab';
import ProfileTab from '@/components/dashboard/profile-tab';
import { useDashboardTab } from '@/hooks/use-dashboard-tab';
import CommunityTab from './community-tab';

export default function DashboardClient() {
    const { activeTab } = useDashboardTab();

    return (
        <>
            {activeTab === 'home' && <HomeTab />}
            {activeTab === 'analyze' && <AnalyzeTab />}
            {activeTab === 'deals' && <DealsTab />}
            {activeTab === 'community' && <CommunityTab />}
            {activeTab === 'profile' && <ProfileTab />}
        </>
    )
}
