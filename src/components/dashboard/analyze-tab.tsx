
'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Home, Repeat, TestTube2 } from "lucide-react";
import RentalCalculator from "@/components/analysis/rental-calculator";
import FlipCalculator from "@/components/analysis/flip-calculator";
import CommercialCalculator from "@/components/analysis/commercial-calculator";
import { cn } from "@/lib/utils";
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Deal } from '@/lib/types';
import AdvancedCommercialCalculator from '../analysis/advanced-commercial-calculator';


export default function AnalyzeTab() {
  const { user } = useUser();
  const firestore = useFirestore();

  const dealsQuery = useMemoFirebase(() => {
    if (!user || user.isAnonymous) return null;
    return query(collection(firestore, `users/${user.uid}/deals`));
  }, [firestore, user]);

  const { data: deals } = useCollection<Deal>(dealsQuery);
  const dealCount = useMemo(() => deals?.length ?? 0, [deals]);

  return (
    <div className="flex flex-col items-center animate-fade-in">
      <Tabs defaultValue="rental" className="w-full max-w-7xl">
        <TabsList className="w-fit mx-auto h-auto p-1.5 bg-muted/60 rounded-full grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="rental" className={cn("px-4 py-2 rounded-full")}>
            <Home className="mr-2 h-4 w-4" />
            Rental (1-4)
          </TabsTrigger>
          <TabsTrigger value="flip" className={cn("px-4 py-2 rounded-full")}>
            <Repeat className="mr-2 h-4 w-4" />
            House Flip
          </TabsTrigger>
          <TabsTrigger value="commercial-basic" className={cn("px-4 py-2 rounded-full")}>
            <Building className="mr-2 h-4 w-4" />
            Commercial
          </TabsTrigger>
           <TabsTrigger value="commercial-advanced" className={cn("px-4 py-2 rounded-full")}>
            <TestTube2 className="mr-2 h-4 w-4" />
            Advanced Commercial
          </TabsTrigger>
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
