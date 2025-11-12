
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, FirebaseClientProvider } from '@/firebase';
import { Header } from '@/components/header';
import { Home as HomeIcon, BarChart2, Briefcase, User, Users, Settings } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useDashboardTab } from '@/hooks/use-dashboard-tab';
import DashboardClient from '@/components/dashboard/dashboard-client';
import { AnimatePresence, motion } from 'framer-motion';

function DashboardView() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { activeTab, setActiveTab } = useDashboardTab();

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

  const TabButton = ({ value, label, icon: Icon, isProfile = false }: { value: string, label: string, icon: React.ElementType, isProfile?: boolean }) => (
    <Button
      variant={'ghost'}
      size="icon"
      className={cn(
        "relative flex flex-col h-16 w-16 rounded-full transition-all duration-300 overflow-hidden group",
        "text-muted-foreground hover:text-foreground",
        isProfile && "hover:shadow-[0_0_15px_hsl(var(--primary)/0.8)]"
      )}
      onClick={() => setActiveTab(value)}
    >
      {activeTab === value && (
         <motion.div
            layoutId="active-tab-indicator"
            className="absolute inset-0 bg-primary/80 rounded-full z-0"
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
         />
      )}
       <div className={cn(
          "absolute z-10 inset-0 transition-colors flex flex-col items-center justify-center",
          activeTab === value ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-foreground'
       )}>
          <Icon className="h-5 w-5 mb-0.5" />
          <span className="text-[10px] font-semibold">{label}</span>
       </div>
    </Button>
  );

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex-1 p-6 md:p-12 bg-transparent pb-32">
        <DashboardClient />
      </main>
      <footer className="fixed bottom-4 left-0 right-0 z-40 h-24 pointer-events-none">
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-auto">
            <div className="flex items-center gap-2 rounded-full bg-card/60 p-1 shadow-lg backdrop-blur-lg border border-border/20">
              <TabButton value="home" label="Home" icon={HomeIcon} />
              <TabButton value="analyze" label="Analyze" icon={BarChart2} />
              <TabButton value="deals" label="Deals" icon={Briefcase} />
              <TabButton value="community" label="Community" icon={Users} />
              <TabButton value="profile" label="Profile" icon={User} isProfile />
            </div>
          </div>
      </footer>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <FirebaseClientProvider>
      <DashboardView />
    </FirebaseClientProvider>
  )
}
