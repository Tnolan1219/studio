
'use client';

import { useMemo, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Home, Repeat, TestTube2 } from "lucide-react";
import RentalCalculator from "@/components/analysis/rental-calculator";
import FlipCalculator from "@/components/analysis/flip-calculator";
import CommercialCalculator from "@/components/analysis/commercial-calculator";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc } from 'firebase/firestore';
import type { Deal, UserProfile } from '@/lib/types';
import AdvancedCommercialCalculator from '../analysis/advanced-commercial-calculator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { useProfileStore } from '@/hooks/use-profile-store';


export default function AnalyzeTab() {
  const { user } = useUser();
  const firestore = useFirestore();

  // Zustand store for client-side state
  const { profileData, setProfileData, hasHydrated } = useProfileStore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  // Fetch from DB once to initialize the store
  const { data: remoteProfileData } = useDoc<UserProfile>(userProfileRef);

  // Effect to hydrate the store from Firestore once
  useEffect(() => {
    if (remoteProfileData && !profileData.email) {
      setProfileData(remoteProfileData);
    }
  }, [remoteProfileData, profileData.email, setProfileData]);


  const dealsQuery = useMemoFirebase(() => {
    if (!user || user.isAnonymous) return null;
    return query(collection(firestore, `users/${user.uid}/deals`));
  }, [firestore, user]);

  const { data: deals } = useCollection<Deal>(dealsQuery);
  const dealCount = useMemo(() => deals?.length ?? 0, [deals]);
  
  // Read from the Zustand store for immediate UI updates
  const hasAdvancedAccess = useMemo(() => {
    const plan = profileData?.plan;
    return plan === 'Pro' || plan === 'Executive' || plan === 'Elite';
  }, [profileData?.plan]);

  // Wait for the store to be hydrated from either Firestore or local state
  if (!hasHydrated) {
    return null; // Or a loading skeleton
  }

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <Tabs defaultValue="rental" className="w-full max-w-7xl">
        <TabsList className="w-fit mx-auto h-auto p-1.5 bg-muted/60 rounded-full grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="rental" className={cn("px-4 py-2 rounded-full", "data-[state=active]:text-primary data-[state=active]:shadow-[0_0_15px_hsl(var(--primary)/0.8)]")}>
            <Home className="mr-2 h-4 w-4" />
            Rental (1-4)
          </TabsTrigger>
          <TabsTrigger value="flip" className={cn("px-4 py-2 rounded-full", "data-[state=active]:text-primary data-[state=active]:shadow-[0_0_15px_hsl(var(--primary)/0.8)]")}>
            <Repeat className="mr-2 h-4 w-4" />
            House Flip
          </TabsTrigger>
          <TabsTrigger value="commercial-basic" className={cn("px-4 py-2 rounded-full", "data-[state=active]:text-primary data-[state=active]:shadow-[0_0_15px_hsl(var(--primary)/0.8)]")}>
            <Building className="mr-2 h-4 w-4" />
            Commercial
          </TabsTrigger>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <TabsTrigger value="commercial-advanced" className={cn("px-4 py-2 rounded-full plan-elite")} disabled={!hasAdvancedAccess}>
                  <TestTube2 className="mr-2 h-4 w-4" />
                  Advanced Commercial
                </TabsTrigger>
              </TooltipTrigger>
              {!hasAdvancedAccess && (
                <TooltipContent>
                  <p>Upgrade to Pro or Executive to access.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        </TabsList>
        <TabsContent value="rental" className="mt-6">
          <RentalCalculator dealCount={dealCount} />
        </TabsContent>
        <TabsContent value="flip" className="mt-6">
          <FlipCalculator dealCount={dealCount} />
        </TabsContent>
        <TabsContent value="commercial-basic" className="mt-6">
          <CommercialCalculator dealCount={dealCount} />
        </TabsContent>
         <TabsContent value="commercial-advanced" className="mt-6">
          <AdvancedCommercialCalculator dealCount={dealCount} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
