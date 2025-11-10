
'use client';

import { useState, useMemo, useTransition, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Sparkles, BarChart2, DollarSign, Percent, Trash2, Plus, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { useUser, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';
import { ProFormaTable } from './pro-forma-table';
import type { ProFormaEntry, Deal, UserProfile, LineItem, UnitMixItem } from '@/lib/types';
import { Switch } from '@/components/ui/switch';
import AdvancedCommercialCalculator from './advanced-commercial-calculator';
import { Label } from '@/components/ui/label';

const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(0),
  closingCosts: z.coerce.number().min(0),
  rehabCost: z.coerce.number().min(0),
  arv: z.coerce.number().min(0),
  downPayment: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  loanTerm: z.coerce.number().int().min(1),
  grossMonthlyIncome: z.coerce.number().min(0),
  propertyTaxes: z.coerce.number().min(0),
  insurance: z.coerce.number().min(0),
  repairsAndMaintenance: z.coerce.number().min(0),
  vacancy: z.coerce.number().min(0).max(100),
  capitalExpenditures: z.coerce.number().min(0),
  managementFee: z.coerce.number().min(0).max(100),
  otherExpenses: z.coerce.number().min(0),
  annualIncomeGrowth: z.coerce.number().min(0).max(100),
  annualExpenseGrowth: z.coerce.number().min(0).max(100),
  annualAppreciation: z.coerce.number().min(0).max(100),
  holdingLength: z.coerce.number().int().min(1).max(30),
  sellingCosts: z.coerce.number().min(0).max(100),
  marketConditions: z.string().min(10, 'Please describe market conditions.'),
  unitMix: z.array(z.object({ type: z.string(), count: z.coerce.number(), rent: z.coerce.number() })).optional(),
  otherIncomes: z.array(z.object({ name: z.string(), amount: z.coerce.number() })).optional(),
  operatingExpenses: z.array(z.object({ name: z.string(), amount: z.coerce.number() })).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CommercialCalculatorProps {
    deal?: Deal;
    onSave?: () => void;
    onCancel?: () => void;
    dealCount?: number;
}

export default function CommercialCalculator({ deal, onSave, onCancel, dealCount = 0 }: CommercialCalculatorProps) {
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditMode = !!deal;
  
  // Hooks for Basic Mode
  const [analysisResult, setAnalysisResult] = useState<{
      monthlyCashFlow: number;
      cocReturn: number;
      capRate: number;
      noi: number;
  } | null>(null);
   const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: profileData } = useDoc<UserProfile>(userProfileRef);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && deal ? deal : {
      dealName: 'My Commercial Deal',
      purchasePrice: 1000000,
      closingCosts: 3,
      rehabCost: 50000,
      downPayment: 250000,
      interestRate: 7,
      loanTerm: 30,
      grossMonthlyIncome: 10000,
      vacancy: 7,
      propertyTaxes: 15, // as % of GMI
      insurance: 5, // as % of GMI
      repairsAndMaintenance: 8,
      managementFee: 5,
      otherExpenses: 2,
    },
  });

  useEffect(() => {
    // Set mode based on deal prop on initial load
    if (isEditMode && deal?.isAdvanced) {
      setIsAdvancedMode(true);
    }
  }, [isEditMode, deal]);

  if (isAdvancedMode) {
    return (
        <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
                 <div className="flex justify-between items-center">
                    <div>
                        <CardTitle className="font-headline">{isEditMode ? `Editing: ${deal.dealName}` : 'Advanced Commercial Analyzer'}</CardTitle>
                        <CardDescription>A professional underwriting suite for institutional-grade analysis.</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Label htmlFor="advanced-mode-toggle">Advanced Mode</Label>
                        <Switch id="advanced-mode-toggle" checked={true} onCheckedChange={() => setIsAdvancedMode(false)} />
                    </div>
                </div>
            </CardHeader>
            <AdvancedCommercialCalculator deal={deal} onSave={onSave} onCancel={onCancel} dealCount={dealCount} />
        </Card>
    );
  }

  const handleAnalysis = (data: FormData) => {
    const annualGrossIncome = data.grossMonthlyIncome * 12;
    const vacancyLoss = annualGrossIncome * (data.vacancy / 100);
    const effectiveGrossIncome = annualGrossIncome - vacancyLoss;
    
    const totalOpExPercent = data.propertyTaxes + data.insurance + data.repairsAndMaintenance + data.managementFee + data.otherExpenses;
    const totalOpEx = effectiveGrossIncome * (totalOpExPercent / 100);
    
    const noi = effectiveGrossIncome - totalOpEx;

    const loanAmount = data.purchasePrice - data.downPayment;
    const monthlyInterestRate = data.interestRate / 100 / 12;
    const numberOfPayments = data.loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    const cashFlowBeforeTax = noi - debtService;
    const monthlyCashFlow = cashFlowBeforeTax / 12;
    
    const totalInvestment = data.downPayment + (data.purchasePrice * (data.closingCosts / 100)) + data.rehabCost;
    const cocReturn = totalInvestment > 0 ? (cashFlowBeforeTax / totalInvestment) * 100 : 0;
    
    const capRate = data.purchasePrice > 0 ? (noi / data.purchasePrice) * 100 : 0;

    setAnalysisResult({ monthlyCashFlow, cocReturn, capRate, noi });
  };
  
   const handleSaveDeal = async () => {
    if (!analysisResult) {
        toast({ title: 'Analysis Required', description: 'Please run the analysis before saving.', variant: 'destructive' });
        return;
    }
    if (!user || user.isAnonymous) {
        toast({ title: user ? 'Guest Mode' : 'Authentication Required', description: 'Please create an account to save deals.', variant: 'destructive' });
        return;
    }

    const isFormValid = await form.trigger();
    if (!isFormValid) {
        toast({ title: 'Invalid Data', description: 'Please fill out all required fields correctly.', variant: 'destructive' });
        return;
    }

    if (!isEditMode) {
        const plan = profileData?.plan || 'Free';
        const limits = { Free: 5, Pro: 15, Executive: Infinity };
        if (dealCount >= limits[plan]) {
            toast({ title: `Deal Limit Reached for ${plan} Plan`, description: `You have ${dealCount} deals. Please upgrade your plan.`, variant: 'destructive' });
            return;
        }
    }

    setIsSaving(true);
    const formValues = form.getValues();
    const dealId = isEditMode && deal ? deal.id : doc(collection(firestore, `users/${user.uid}/deals`)).id;

    const dealData = {
      ...formValues,
      id: dealId,
      dealType: 'Commercial Multifamily' as const,
      monthlyCashFlow: parseFloat(analysisResult.monthlyCashFlow.toFixed(2)),
      cocReturn: parseFloat(analysisResult.cocReturn.toFixed(2)),
      noi: parseFloat(analysisResult.noi.toFixed(2)),
      capRate: parseFloat(analysisResult.capRate.toFixed(2)),
      userId: user.uid,
      createdAt: isEditMode && deal ? deal.createdAt : serverTimestamp(),
      status: isEditMode && deal ? deal.status : 'In Works',
      isPublished: isEditMode && deal ? deal.isPublished : false,
      isAdvanced: false,
    };
    
    const dealRef = doc(firestore, `users/${user.uid}/deals`, dealId);
    setDocumentNonBlocking(dealRef, dealData, { merge: true });

    toast({ title: isEditMode ? 'Changes Saved' : 'Deal Saved!', description: `${dealData.dealName} has been ${isEditMode ? 'updated' : 'added'}.` });
    if (isEditMode && onSave) onSave();
    else { form.reset(); setAnalysisResult(null); }
    setIsSaving(false);
  };

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                 <CardTitle className="font-headline">{isEditMode ? `Editing: ${deal.dealName}` : 'Commercial Multifamily Analyzer'}</CardTitle>
                 <CardDescription>A quick analysis tool for commercial properties. Use percentages for expense estimations.</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
                <Label htmlFor="advanced-mode-toggle">Advanced Mode</Label>
                <Switch id="advanced-mode-toggle" onCheckedChange={() => setIsAdvancedMode(true)} />
            </div>
        </div>
      </CardHeader>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAnalysis)}>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                     <Card>
                      <CardHeader><CardTitle className="text-lg font-headline">Purchase & Loan</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                          <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs (%)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rehab Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.01" {...field}/></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader><CardTitle className="text-lg font-headline">Income & Expenses (% of GMI)</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                           <FormField name="grossMonthlyIncome" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Gross Monthly Income</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                           <FormField name="vacancy" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="propertyTaxes" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Taxes</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="insurance" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Insurance</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="repairsAndMaintenance" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Maintenance</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="managementFee" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Management</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="otherExpenses" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Other Expenses</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                  {analysisResult && (
                    <Card>
                        <CardHeader><CardTitle className="text-lg font-headline">Key Metrics (Year 1)</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div> <p className="text-sm text-muted-foreground">Cap Rate</p> <p className="text-2xl font-bold">{analysisResult.capRate.toFixed(2)}%</p> </div>
                             <div> <p className="text-sm text-muted-foreground">CoC Return</p> <p className="text-2xl font-bold">{analysisResult.cocReturn.toFixed(2)}%</p> </div>
                            <div> <p className="text-sm text-muted-foreground">Monthly Cash Flow</p> <p className="text-xl font-bold">${analysisResult.monthlyCashFlow.toFixed(2)}</p> </div>
                            <div> <p className="text-sm text-muted-foreground">NOI (Annual)</p> <p className="font-bold">${analysisResult.noi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                        </CardContent>
                    </Card>
                  )}
                </div>
            </CardContent>
             <CardFooter className="flex justify-end gap-2">
                {isEditMode && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
                <Button type="submit">Run Analysis</Button>
                <Button variant="secondary" onClick={handleSaveDeal} disabled={isSaving}> {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEditMode ? 'Save Changes' : 'Save Deal')} </Button>
            </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

    