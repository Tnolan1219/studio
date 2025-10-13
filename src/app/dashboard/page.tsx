"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { Header } from '@/components/header';
import { Home as HomeIcon, BarChart2, Briefcase, User } from 'lucide-react';
import HomeTab from '@/components/dashboard/home-tab';
import AnalyzeTab from '@/components/dashboard/analyze-tab';
import DealsTab from '@/components/dashboard/deals-tab';
import ProfileTab from '@/components/dashboard/profile-tab';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-transparent">
            <Skeleton className="h-10 w-[400px]" />
            <Skeleton className="h-[600px] w-full" />
        </main>
      </div>
    )
  }

  const TabButton = ({ value, label, icon: Icon }: { value: string, label: string, icon: React.ElementType }) => (
    <Button
      variant={activeTab === value ? 'default' : 'ghost'}
      size="lg"
      className={cn(
        "flex-col h-14 w-20 rounded-2xl",
        activeTab === value ? "text-primary-foreground" : "text-muted-foreground"
      )}
      onClick={() => setActiveTab(value)}
    >
      <Icon className="h-5 w-5 mb-1" />
      <span className="text-xs font-semibold">{label}</span>
    </Button>
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-6 md:p-12 bg-transparent pb-28">
        {activeTab === 'home' && <HomeTab />}
        {activeTab === 'analyze' && <AnalyzeTab />}
        {activeTab === 'deals' && <DealsTab />}
        {activeTab === 'profile' && <ProfileTab />}
      </main>
      <footer className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex justify-evenly items-center h-16 max-w-md mx-auto">
              <TabButton value="home" label="Home" icon={HomeIcon} />
              <TabButton value="analyze" label="Analyze" icon={BarChart2} />
              <TabButton value="deals" label="Deals" icon={Briefcase} />
              <TabButton value="profile" label="Profile" icon={User} />
          </div>
      </footer>
    </div>
  );
}
