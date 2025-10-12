import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

export default function CommercialCalculator() {
  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Commercial Multifamily Analyzer</CardTitle>
        <CardDescription>
          This calculator is in beta. Full features coming soon!
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Construction className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="text-xl font-semibold">Under Construction</h3>
        <p className="text-muted-foreground">We're hard at work building this feature for you.</p>
      </CardContent>
    </Card>
  );
}
