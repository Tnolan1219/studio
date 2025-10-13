"use client";

import { useActionState, useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getDealAssessment } from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, BarChart2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
} from "recharts";
import { useUser, useFirestore } from "@/firebase";
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { InputWithIcon } from "../ui/input-with-icon";


const formSchema = z.object({
  dealName: z.string().min(3, "Please enter a name for the deal."),
  purchasePrice: z.coerce.number().min(0),
  arv: z.coerce.number().min(0, "ARV must be positive."),
  rehabCost: z.coerce.number().min(0),
  holdingCosts: z.coerce.number().min(0),
  sellingCosts: z.coerce.number().min(0),
  marketConditions: z.string().min(10, "Please describe market conditions."),
});

type FormData = z.infer<typeof formSchema>;

export default function FlipCalculator() {
  const [state, formAction] = useActionState(getDealAssessment, {
    message: "",
    assessment: null,
  });
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);


  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dealName: "Maple Street Flip",
      purchasePrice: 180000,
      arv: 280000,
      rehabCost: 40000,
      holdingCosts: 5000,
      sellingCosts: 14000, // 5% of ARV
      marketConditions: "Hot seller's market, properties are selling within 2 weeks. Good school district.",
    },
  });

  const onSubmit = (data: FormData) => {
    const formData = new FormData();
    const financialData = `
        Purchase Price: ${data.purchasePrice},
        After Repair Value (ARV): ${data.arv},
        Rehab Cost: ${data.rehabCost},
        Holding Costs: ${data.holdingCosts},
        Selling Costs: ${data.sellingCosts}
    `;
    formData.append("dealType", "House Flip");
    formData.append("financialData", financialData);
    formData.append("marketConditions", data.marketConditions);
    
    setIsLoading(true);
    formAction(formData);
  };
    
  useEffect(() => {
    if (state.message) {
        setIsLoading(false);
    }
  }, [state]);

  const watchedValues = form.watch();
  
  const { totalInvestment, netProfit, roi, chartData } = useMemo(() => {
    const { purchasePrice, rehabCost, holdingCosts, sellingCosts, arv } = watchedValues;
    const totalInvestment = purchasePrice + rehabCost + holdingCosts + sellingCosts;
    const netProfit = arv - totalInvestment;
    const roi = totalInvestment > 0 ? (netProfit / (purchasePrice + rehabCost)) * 100 : 0;

    const chartData = [
        { name: "Purchase", value: purchasePrice, fill: "hsl(var(--chart-1))" },
        { name: "Rehab", value: rehabCost, fill: "hsl(var(--chart-2))" },
        { name: "Holding", value: holdingCosts, fill: "hsl(var(--chart-3))" },
        { name: "Selling", value: sellingCosts, fill: "hsl(var(--chart-4))" },
        { name: "Profit", value: netProfit > 0 ? netProfit : 0, fill: "hsl(var(--primary))" }
    ];

    return { totalInvestment, netProfit, roi, chartData };
  }, [watchedValues]);

  const handleSaveDeal = async () => {
    if (!user) {
        toast({ title: "Authentication Required", description: "Please sign in to save deals.", variant: "destructive" });
        return;
    }
    if (user.isAnonymous) {
        toast({ title: "Guest Mode", description: "Cannot save deals as a guest. Please create an account.", variant: "destructive" });
        return;
    }

    const isFormValid = await form.trigger();
    if (!isFormValid) {
        toast({ title: "Invalid Data", description: "Please fill out all required fields correctly before saving.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    const dealData = {
        ...form.getValues(),
        dealType: "House Flip",
        netProfit: parseFloat(netProfit.toFixed(2)),
        roi: parseFloat(roi.toFixed(2)),
        userId: user.uid,
        createdAt: serverTimestamp(),
        status: 'In Works',
        isPublished: false,
    };

    const dealsCol = collection(firestore, `users/${user.uid}/deals`);
    addDocumentNonBlocking(dealsCol, dealData);
    toast({ title: "Deal Saved!", description: `${dealData.dealName} has been added to your portfolio.` });
    setIsSaving(false);
  };


  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>House Flip Analyzer</CardTitle>
        <CardDescription>
          Calculate the potential profit and ROI for your next house flip project.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input type="text" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="arv" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>After Repair Value (ARV)</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rehabilitation Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="holdingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Holding Costs (Taxes, Utilities)</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Selling Costs (Commissions, Fees)</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Market Conditions</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription>Describe local market trends, buyer demand, etc.</FormDescription> <FormMessage /> </FormItem> )} />
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div><p className="text-sm text-muted-foreground">Net Profit</p><p className="text-2xl font-bold">${netProfit.toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Return on Investment (ROI)</p><p className="text-2xl font-bold">{roi.toFixed(2)}%</p></div>
                        <div><p className="text-sm text-muted-foreground">Total Investment</p><p className="font-bold">${(purchasePrice + rehabCost).toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Total Costs</p><p className="font-bold">${(rehabCost + holdingCosts + sellingCosts).toFixed(2)}</p></div>
                    </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 size={20}/> Cost vs. Profit Breakdown</CardTitle></CardHeader>
                  <CardContent className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value/1000}k`}/>
                            <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <Tooltip
                                cursor={{fill: 'hsl(var(--secondary))'}}
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    borderColor: "hsl(var(--border))",
                                }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles size={20} className="text-primary"/> AI Deal Assessment</CardTitle></CardHeader>
                  <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ) : state.assessment ? (
                        <p className="text-sm text-muted-foreground">{state.assessment}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Click "Analyze Deal" to get an AI-powered assessment.</p>
                    )}
                    {state.message && !state.assessment && <p className="text-sm text-destructive">{state.message}</p>}
                  </CardContent>
                </Card>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="submit" disabled={isLoading || isSaving}>
              {isLoading ? "Analyzing..." : "Analyze Deal"}
            </Button>
            <Button variant="secondary" onClick={handleSaveDeal} disabled={isLoading || isSaving}>
              {isSaving ? "Saving..." : "Save Deal"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
