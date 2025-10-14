'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getDealAssessment } from '@/lib/actions';
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
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, BarChart2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
} from 'recharts';
import { useUser, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';
import type { Deal, UserProfile } from '@/lib/types';


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
  marketConditions: z.string().min(10, 'Please describe market conditions.'),
});

type FormData = z.infer<typeof formSchema>;

interface FlipCalculatorProps {
    deal?: Deal;
    onSave?: () => void;
    onCancel?: () => void;
    dealCount?: number;
}

export default function FlipCalculator({ deal, onSave, onCancel, dealCount = 0 }: FlipCalculatorProps) {
  const [isPending, startTransition] = useTransition();
  const [aiResult, setAiResult] = useState<{message: string, assessment: string | null} | null>(null);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: profileData } = useDoc<UserProfile>(userProfileRef);

  const [isSaving, setIsSaving] = useState(false);
  const isEditMode = !!deal;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
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
      marketConditions: "What are the risks of flipping in a cooling market? Suggest value-add renovations for this property type.",
    },
  });

  useEffect(() => {
    if (isEditMode && deal) {
      form.reset(deal);
    }
  }, [deal, isEditMode, form]);

  const handleAnalyzeWrapper = (data: FormData) => {
    startTransition(async () => {
        const result = await getDealAssessment({
          dealType: 'House Flip',
          financialData: `
            Purchase Price: ${data.purchasePrice}, After Repair Value (ARV): ${data.arv},
            Rehab Cost: ${data.rehabCost}, Holding Length: ${data.holdingLength} months,
            Selling Costs: ${data.sellingCosts}%
        `,
          marketConditions: data.marketConditions,
        });
        setAiResult(result);
    });
  };

  const watchedValues = form.watch();

  const { netProfit, roi, chartData, totalInvestment } = useMemo(() => {
    const { purchasePrice, rehabCost, closingCosts, holdingLength, interestRate, downPayment, propertyTaxes, insurance, otherExpenses, sellingCosts, arv, loanTerm } = watchedValues;

    const loanAmount = purchasePrice - downPayment;
    const acquisitionCosts = (closingCosts/100) * purchasePrice;

    const holdingCosts = (
        (propertyTaxes/100 * purchasePrice / 12) +
        (insurance/100 * purchasePrice / 12) +
        (otherExpenses / holdingLength)
    ) * holdingLength;

    const financingCosts = loanTerm > 0 ? (loanAmount * (interestRate/100) * (holdingLength/12)) : 0;
    
    const totalCashNeeded = downPayment + rehabCost + acquisitionCosts + holdingCosts + financingCosts;
    const finalSellingCosts = (sellingCosts/100) * arv;
    
    const totalCosts = purchasePrice + rehabCost + acquisitionCosts + holdingCosts + financingCosts + finalSellingCosts;
    const netProfit = arv - totalCosts;
    const roi = totalCashNeeded > 0 ? (netProfit / totalCashNeeded) * 100 : 0;

    const chartData = [
      { name: 'Purchase', value: purchasePrice, fill: 'hsl(var(--chart-1))' },
      { name: 'Rehab', value: rehabCost, fill: 'hsl(var(--chart-2))' },
      { name: 'Holding', value: holdingCosts, fill: 'hsl(var(--chart-3))' },
      { name: 'Financing', value: financingCosts, fill: 'hsl(var(--chart-4))' },
      { name: 'Selling', value: finalSellingCosts, fill: 'hsl(var(--chart-5))' },
      { name: 'Profit', value: netProfit > 0 ? netProfit : 0, fill: 'hsl(var(--primary))' },
    ];

    return { totalInvestment: totalCashNeeded, netProfit, roi, chartData };
  }, [watchedValues]);

  const handleSaveDeal = async () => {
    if (!user) {
      toast({ title: 'Authentication Required', description: 'Please sign in to save deals.', variant: 'destructive' });
      return;
    }
     if (user.isAnonymous) {
        toast({ title: 'Guest Mode', description: 'Cannot save deals as a guest. Please create an account.', variant: 'destructive' });
        return;
    }

    const isFormValid = await form.trigger();
    if (!isFormValid) {
      toast({ title: 'Invalid Data', description: 'Please fill out all required fields correctly before saving.', variant: 'destructive' });
      return;
    }

    if (!isEditMode) {
      const plan = profileData?.plan || 'Free';
      const limits = { Free: 5, Pro: 15, Executive: Infinity };
      if (dealCount >= limits[plan]) {
        toast({
            title: `Deal Limit Reached for ${plan} Plan`,
            description: `You have ${dealCount} deals. Please upgrade your plan to save more.`,
            variant: 'destructive',
        });
        return;
      }
    }

    setIsSaving(true);
    const formValues = form.getValues();
    const dealData = {
      ...formValues,
      dealType: 'House Flip' as const,
      netProfit: parseFloat(netProfit.toFixed(2)),
      roi: parseFloat(roi.toFixed(2)),
      userId: user.uid,
      createdAt: isEditMode && deal ? deal.createdAt : serverTimestamp(),
      status: isEditMode && deal ? deal.status : 'In Works',
      isPublished: isEditMode && deal ? deal.isPublished : false,
    };
    
    if (isEditMode && deal) {
        const dealRef = doc(firestore, `users/${user.uid}/deals`, deal.id);
        setDocumentNonBlocking(dealRef, dealData, { merge: true });
        toast({ title: 'Changes Saved', description: `${dealData.dealName} has been updated.` });
        if (onSave) onSave();
    } else {
        const dealsCol = collection(firestore, `users/${user.uid}/deals`);
        addDocumentNonBlocking(dealsCol, dealData);
        toast({ title: 'Deal Saved!', description: `${dealData.dealName} has been added to your portfolio.` });
        form.reset();
    }
    setIsSaving(false);
  };
  
  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline">{isEditMode ? `Editing: ${deal.dealName}` : 'House Flip Analyzer'}</CardTitle>
        <CardDescription>{isEditMode ? 'Update the details for your house flip.' : 'Calculate the potential profit and ROI for your next house flip project.'}</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAnalyzeWrapper)}>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <Card>
                      <CardHeader><CardTitle className="text-lg">Purchase & Rehab</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                          <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs (%)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Rehab Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="arv" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>After Repair Value (ARV)</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                  <Card>
                      <CardHeader><CardTitle className="text-lg">Financing</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                          <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.01" {...field}/></FormControl> <FormMessage /> </FormItem> )} />
                           <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
              </div>

              <div className="space-y-4">
                 <Card>
                    <CardHeader><CardTitle className="text-lg">Holding & Selling Costs</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <FormField name="holdingLength" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Holding (Months)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="propertyTaxes" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Prop. Taxes (%/yr)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="insurance" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Insurance (%/yr)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="otherExpenses" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Other Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Selling Costs (% of ARV)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </CardContent>
                </Card>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <Card>
                <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div> <p className="text-sm text-muted-foreground">Net Profit</p> <p className="text-2xl font-bold">${netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                  <div> <p className="text-sm text-muted-foreground">ROI on Cash</p> <p className="text-2xl font-bold">{roi.toFixed(2)}%</p> </div>
                  <div> <p className="text-sm text-muted-foreground">Total Cash Invested</p> <p className="font-bold">${totalInvestment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                  <div> <p className="text-sm text-muted-foreground">ARV</p> <p className="font-bold">${watchedValues.arv.toLocaleString()}</p> </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader> <CardTitle className="flex items-center gap-2"> <BarChart2 size={20} /> Cost vs. Profit Breakdown </CardTitle> </CardHeader>
                <CardContent className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }} >
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={value => `$${value / 1000}k`} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                      <Tooltip 
                        cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                        contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                      <Bar dataKey="value" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
            <div className="mt-6">
               <Card>
                <CardHeader> <CardTitle className="flex items-center gap-2"> <Sparkles size={20} className="text-primary" /> AI Deal Assessment </CardTitle> </CardHeader>
                <CardContent>
                  <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>AI Advisor Prompt</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription> e.g., "What are the risks of flipping in this market?" or "Suggest value-add renovations for this property." </FormDescription> <FormMessage /> </FormItem> )} />
                  {isPending ? (
                    <div className="space-y-2 mt-4"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-3/4" /> </div>
                  ) : aiResult?.assessment ? (
                    <div className="text-sm text-muted-foreground mt-4 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: aiResult.assessment }} />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-4"> Click "Run Analysis" to get an AI-powered assessment. </p>
                  )}
                  {aiResult?.message && !aiResult.assessment && ( <p className="text-sm text-destructive mt-4">{aiResult.message}</p> )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            {isEditMode && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
            <Button type="submit" disabled={isPending || isSaving}> {isPending ? 'Analyzing...' : 'Run Analysis'} </Button>
            <Button variant="secondary" onClick={handleSaveDeal} disabled={isPending || isSaving}> {isSaving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Save Deal')} </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
