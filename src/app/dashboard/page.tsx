
'use client';

import { useDashboardTab } from '@/hooks/use-dashboard-tab';
import { HomeIcon, BarChart2, Briefcase, Users, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUser } from '@/firebase/auth/use-user';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AnimatePresence, motion } from 'framer-motion';
import { Header } from '@/components/header';
import DashboardClient from '@/components/dashboard/dashboard-client';
import { FirebaseDataInitializer } from '@/firebase/data-initializer';
import { FirebaseClientProvider } from '@/firebase';


function TabButton({ value, label, icon: Icon, isProfile = false }: { value: string; label: string; icon: React.ElementType; isProfile?: boolean }) {
    const { activeTab, setActiveTab } = useDashboardTab();
    const { user, isUserLoading } = useUser();
    const isActive = activeTab === value;

    return (
      <Button
        variant="ghost"
        className={cn(
            "relative flex-col h-14 w-16 rounded-full transition-colors duration-300 ease-in-out overflow-hidden",
            isActive ? "text-black" : "text-muted-foreground hover:text-foreground"
        )}
        onClick={() => setActiveTab(value)}
      >
        <AnimatePresence>
            {isActive && (
                <motion.div
                    layoutId="active-tab-background"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute inset-0 bg-cyan-400 rounded-full z-0 active-tab-glow"
                />
            )}
        </AnimatePresence>
        <div className="relative z-10 flex flex-col items-center">
            {isProfile && !isUserLoading && user ? (
                 <Avatar className="w-6 h-6">
                    <AvatarImage src={user.photoURL ?? ''} />
                    <AvatarFallback>{user.displayName?.charAt(0) ?? '?'}</AvatarFallback>
                </Avatar>
            ) : (
                <Icon className="w-5 h-5" />
            )}
            <span className="text-[10px] mt-1">{label}</span>
        </div>
      </Button>
    );
  }

function DashboardView() {
    return (
        <div className="flex min-h-screen w-full flex-col">
          <Header />
          <main className="flex-1 p-6 md:p-12 bg-transparent pb-40">
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
            <FirebaseDataInitializer />
            <DashboardView />
        </FirebaseClientProvider>
    )
}
