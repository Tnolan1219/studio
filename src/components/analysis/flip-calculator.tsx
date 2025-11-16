
'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, BarChart2, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
} from 'recharts';
import { useUser, useFirestore, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';
import type { Deal, UserProfile, Plan } from '@/lib/types';
import { useProfileStore } from '@/hooks/use-profile-store';
import { useRouter } from 'next/navigation';


const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(0),
  arv: z.coerce.number().min(0, 'ARV must be positive.'),
  rehabCost: z.coerce.number().min(0),
  closingCosts: z.coerce.number().min(0),
  holdingLength: z.coerce.number().min(1, 'Holding length must be at least 1 month.'),
  interestRate: z.coerce.number().min(0),
  loanTerm: z.coerce.number().min(1),
  downPayment: z.coerce.number().min(0),
  propertyTaxes: z.coerce.number().min(0),
  insurance: z.coerce.number().min(0),
  otherExpenses: z.coerce.number().min(0),
  sellingCosts: z.coerce.number().min(0),
  marketConditions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FlipCalculatorProps {
    deal?: Deal;
    onSave?: () => void;
    onCancel?: () => void;
}

export default function FlipCalculator({ deal, onSave, onCancel }: FlipCalculatorProps) {
  const [analysisResult, setAnalysisResult] = useState<{
      netProfit: number;
      roi: number;
      totalInvestment: number;
      chartData: any[];
  } | null>(null);

  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const { profileData, hasHydrated, incrementCalculatorUses } = useProfileStore();
  
  const [isAIPending, startAITransition] = useTransition();
  const [aiResult, setAiResult] = useState<{message: string, assessment: string | null} | null>(null);

  const planRef = useMemoFirebase(() => {
    if (!profileData?.plan) return null;
    const planId = profileData.plan.toLowerCase();
    if (planId === 'free') return null;
    return doc(firestore, 'plans', planId);
  }, [firestore, profileData?.plan]);
  const { data: planData } = useDoc<Plan>(planRef);
  
  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!deal;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && deal ? deal : {
      dealName: 'Maple Street Flip',
      purchasePrice: 180000,
      arv: 280000,
      rehabCost: 40000,
      closingCosts: 2,
      holdingLength: 6,
      interestRate: 8,
      loanTerm: 1,
      downPayment: 45000,
      propertyTaxes: 1.2,
      insurance: 0.5,
      otherExpenses: 1000,
      sellingCosts: 6,
      marketConditions: "Fixer-upper in a transitioning neighborhood. Good comps support ARV.",
    },
  });

  const handleAnalysis = (data: FormData, skipTrack: boolean = false) => {
     if (!skipTrack && (user?.isAnonymous || !profileData || !hasHydrated)) {
        toast({ title: "Account Required", description: "Please create a full account to use the calculators."});
        return;
    }
    
    const maxUses = planData?.maxCalculatorUses ?? (profileData?.plan === 'Free' ? 25 : Infinity);

    if (!skipTrack && hasHydrated && maxUses > 0 && (profileData?.calculatorUses || 0) >= maxUses) {
        toast({
            title: 'Calculator Limit Reached',
            description: `You have used all ${maxUses} of your monthly calculator uses.`,
            action: (
              <Button onClick={() => router.push('/plans')}>Upgrade</Button>
            ),
        });
        return;
    }

    const { purchasePrice, rehabCost, closingCosts, holdingLength, interestRate, downPayment, propertyTaxes, insurance, otherExpenses, sellingCosts, arv, loanTerm } = data;

    const loanAmount = purchasePrice - downPayment;
    const acquisitionCosts = (closingCosts/100) * purchasePrice;

    const holdingCosts = (
        (propertyTaxes/100 * purchasePrice / 12) +
        (insurance/100 * purchasePrice / 12)
    ) * holdingLength + otherExpenses;

    const financingCosts = loanTerm > 0 ? (loanAmount * (interestRate/100) * (holdingLength/12)) : 0;
    
    const totalCashInvested = downPayment + rehabCost + acquisitionCosts + holdingCosts + financingCosts;
    const totalProjectCosts = purchasePrice + rehabCost + acquisitionCosts + holdingCosts + financingCosts;
    const finalSellingCosts = (sellingCosts/100) * arv;

    const netProfit = arv - totalProjectCosts - finalSellingCosts;
    const roi = totalCashInvested > 0 ? (netProfit / totalCashInvested) * 100 : 0;

    const chartData = [
      { name: 'Purchase', value: purchasePrice, fill: 'hsl(var(--chart-1))' },
      { name: 'Rehab', value: rehabCost, fill: 'hsl(var(--chart-2))' },
      { name: 'Holding', value: holdingCosts, fill: 'hsl(var(--chart-3))' },
      { name: 'Financing', value: financingCosts, fill: 'hsl(var(--chart-4))' },
      { name: 'Selling', value: finalSellingCosts, fill: 'hsl(var(--chart-5))' },
      { name: 'Profit', value: netProfit > 0 ? netProfit : 0, fill: 'hsl(var(--primary))' },
    ];
    
    setAnalysisResult({
        netProfit,
        roi,
        totalInvestment: totalCashInvested,
        chartData,
    });
    setAiResult(null); // Clear previous AI results
    
    if (!skipTrack && userProfileRef) {
        incrementCalculatorUses();
        const profileUpdate = { calculatorUses: increment(1) };
        setDocumentNonBlocking(userProfileRef, profileUpdate, { merge: true });
    }
  };
  
  useEffect(() => {
    if (isEditMode && deal) {
      form.reset(deal);
      handleAnalysis(deal, true);
    }
  }, [deal, isEditMode, form]);

  const handleSaveDeal = async () => {
    if (!analysisResult) {
      toast({ title: 'Analysis Required', description: 'Please run the analysis before saving.', variant: 'destructive' });
      return;
    }
    if (!user || user.isAnonymous) {
      toast({ title: user ? 'Guest Mode': 'Authentication Required', description: 'Please create an account to save deals.', variant: 'destructive' });
      return;
    }

    const isFormValid = await form.trigger();
    if (!isFormValid) {
      toast({ title: 'Invalid Data', description: 'Please fill out all required fields correctly before saving.', variant: 'destructive' });
      return;
    }
    
    const maxDeals = planData?.maxSavedDeals ?? (profileData?.plan === 'Free' ? 5 : Infinity);

    if (!isEditMode && hasHydrated && maxDeals > 0 && (profileData?.savedDeals || 0) >= maxDeals) {
        toast({
            title: `Deal Limit Reached for ${profileData?.plan} Plan`,
            description: `You have saved ${profileData?.savedDeals} of ${maxDeals} deals.`,
            action: <Button onClick={() => router.push('/plans')}>Upgrade</Button>,
            variant: 'destructive',
        });
        return;
    }

    setIsSaving(true);
    const formValues = form.getValues();
    const dealId = isEditMode && deal ? deal.id : doc(collection(firestore, `users/${user.uid}/deals`)).id;

    const dealData: Omit<Deal, 'createdAt'> & { createdAt?: any } = {
      ...formValues,
      id: dealId,
      dealType: 'House Flip' as const,
      netProfit: parseFloat(analysisResult.netProfit.toFixed(2)),
      roi: parseFloat(analysisResult.roi.toFixed(2)),
      userId: user.uid,
      status: isEditMode && deal ? deal.status : 'In Works',
      isPublished: isEditMode && deal ? deal.isPublished : false,
      // Default values for other deal types
      monthlyCashFlow: 0,
      cocReturn: 0,
      noi: 0,
      capRate: 0,
      grossMonthlyIncome: 0,
      repairsAndMaintenance: 0,
      vacancy: 0,
      capitalExpenditures: 0,
      managementFee: 0,
      annualIncomeGrowth: 0,
      annualExpenseGrowth: 0,
      annualAppreciation: 0,
    };
    
    if (!isEditMode) {
        dealData.createdAt = serverTimestamp();
    }

    const dealRef = doc(firestore, `users/${user.uid}/deals`, dealId);
    setDocumentNonBlocking(dealRef, dealData, { merge: true });

    if (!isEditMode && userProfileRef) {
        useProfileStore.getState().incrementSavedDeals();
        const profileUpdate = { savedDeals: increment(1) };
        setDocumentNonBlocking(userProfileRef, profileUpdate, { merge: true });
    }

    if (isEditMode) {
        toast({ title: 'Changes Saved', description: `${dealData.dealName} has been updated.` });
        if (onSave) onSave();
    } else {
        toast({ title: 'Deal Saved!', description: `${dealData.dealName} has been added to your portfolio.` });
        form.reset();
        setAnalysisResult(null);
    }
    setIsSaving(false);
  };
  
    const handleGenerateInsights = (userQuery?: string) => {
        if (!analysisResult) return;

        startAITransition(async () => {
            const financialData = `ARV: ${form.getValues('arv')}, Rehab Cost: ${form.getValues('rehabCost')}, Net Profit: ${analysisResult.netProfit.toFixed(0)}, ROI: ${analysisResult.roi.toFixed(2)}%`;
            const prompt = userQuery || form.getValues('marketConditions') || 'No specific market conditions provided.';

            const response = await fetch('/api/openai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, dealData: financialData }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("AI Insight Error:", errorText);
                setAiResult({ message: "Failed to get AI insights. Please try again.", assessment: null });
                return;
            }

            const data = await response.json();
            setAiResult({ message: "Success", assessment: data.text });
        });
    };

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline">{isEditMode ? `Editing: ${deal.dealName}` : 'House Flip Analyzer'}</CardTitle>
        <CardDescription>{isEditMode ? 'Update the details for your house flip.' : 'Calculate the potential profit and ROI for your next house flip project.'}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => handleAnalysis(data))}>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <Card>
                      <CardHeader><CardTitle className="text-lg font-headline">Purchase & Rehab</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                          <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Acquisition Costs (%)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Rehab Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="arv" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>After Repair Value (ARV)</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader><CardTitle className="text-lg font-headline">Financing</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                          <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.01" {...field}/></FormControl> <FormMessage /> </FormItem> )} />
                           <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
              </div>

              <div className="space-y-4">
                 <Card>
                    <CardHeader><CardTitle className="text-lg font-headline">Holding & Selling Costs</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <FormField name="holdingLength" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Holding (Months)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="propertyTaxes" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Prop. Taxes (%/yr)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="insurance" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Insurance (%/yr)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="otherExpenses" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Other Total Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormDescription className="text-xs">e.g. utilities, HOA</FormDescription> <FormMessage /> </FormItem> )} />
                        <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Selling Costs (% of ARV)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </CardContent>
                </Card>
                {analysisResult && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Sparkles size={20} className="text-primary"/>
                                AI Deal Insights
                            </CardTitle>
                             <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Market Conditions & User Notes</FormLabel> <FormControl><Input {...field} /></FormControl> <FormDescription>Provide context for the AI (e.g., "hot market," "needs cosmetic updates").</FormDescription></FormItem> )}/>
                        </CardHeader>
                        <CardContent>
                             {isAIPending ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : aiResult && aiResult.assessment ? (
                                <div className="text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: aiResult.assessment }} />
                            ) : (
                                <p className="text-sm text-muted-foreground">Click the button below to get an AI-powered analysis of this deal's strengths and weaknesses.</p>
                            )}
                        </CardContent>
                        <CardFooter className="flex-col items-stretch gap-2">
                            <Button type="button" onClick={() => handleGenerateInsights()} disabled={isAIPending || !analysisResult} className="w-full">
                                {isAIPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {isAIPending ? 'Generating...' : 'Analyze This Deal'}
                            </Button>
                             {analysisResult && !isAIPending && (
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                                    <Button type="button" size="sm" variant="outline" onClick={() => handleGenerateInsights("How can I reduce my rehab costs without sacrificing quality?")}>How can I reduce rehab costs?</Button>
                                    <Button type="button" size="sm" variant="outline" onClick={() => handleGenerateInsights("What are the biggest risks with this flip?")}>What are the biggest risks?</Button>
                                </div>
                            )}
                        </CardFooter>
                    </Card>
                )}
              </div>
            </div>

            {analysisResult && (
                <div className="grid md:grid-cols-2 gap-6 mt-6">
                <Card>
                    <CardHeader><CardTitle className="font-headline">Key Metrics</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                    <div> <p className="text-sm text-muted-foreground">Net Profit</p> <p className="text-2xl font-bold">${analysisResult.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                    <div> <p className="text-sm text-muted-foreground">ROI on Cash</p> <p className="text-2xl font-bold">{analysisResult.roi.toFixed(2)}%</p> </div>
                    <div> <p className="text-sm text-muted-foreground">Total Cash Invested</p> <p className="font-bold">${analysisResult.totalInvestment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                    <div> <p className="text-sm text-muted-foreground">ARV</p> <p className="font-bold">${form.getValues('arv').toLocaleString()}</p> </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader> <CardTitle className="font-headline flex items-center gap-2"> <BarChart2 size={20} /> Cost vs. Profit Breakdown </CardTitle> </CardHeader>
                    <CardContent className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analysisResult.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }} >
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={value => `$${value / 1000}k`} />
                        <YAxis type="category" dataKey="name" stroke="hsl(var(--foreground))" fontSize={12} width={80} />
                        <Tooltip
                            cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                color: 'hsl(var(--foreground))'
                            }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    </CardContent>
                </Card>
                </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {isEditMode && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
            <Button type="submit">Run Analysis</Button>
            <Button variant="secondary" onClick={handleSaveDeal} disabled={isSaving || !hasHydrated}> 
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEditMode ? 'Save Changes' : 'Save Deal')} 
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
