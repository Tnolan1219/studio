import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, Home, Repeat } from "lucide-react";
import RentalCalculator from "@/components/analysis/rental-calculator";
import FlipCalculator from "@/components/analysis/flip-calculator";
import CommercialCalculator from "@/components/analysis/commercial-calculator";
import { cn } from "@/lib/utils";

export default function AnalyzeTab() {
  return (
    <div className="flex flex-col items-center animate-fade-in">
      <Tabs defaultValue="rental" className="w-full max-w-4xl">
        <TabsList className="w-fit mx-auto h-auto p-1.5 bg-muted/60 rounded-full">
          <TabsTrigger value="rental" className={cn("px-6 py-2 rounded-full")}>
            <Home className="mr-2 h-4 w-4" />
            Rental (1-4)
          </TabsTrigger>
          <TabsTrigger value="flip" className={cn("px-6 py-2 rounded-full")}>
            <Repeat className="mr-2 h-4 w-4" />
            House Flip
          </TabsTrigger>
          <TabsTrigger value="commercial" className={cn("px-6 py-2 rounded-full")}>
            <Building className="mr-2 h-4 w-4" />
            Commercial
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rental" className="mt-6">
          <RentalCalculator />
        </TabsContent>
        <TabsContent value="flip" className="mt-6">
          <FlipCalculator />
        </TabsContent>
        <TabsContent value="commercial" className="mt-6">
          <CommercialCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
