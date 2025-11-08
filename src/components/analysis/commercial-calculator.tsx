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

const unitMixSchema = z.object({
  type: z.string().min(1, "Unit type is required"),
  count: z.coerce.number().min(0),
  rent: z.coerce.number().min(0),
});

const lineItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount: z.coerce.number().min(0),
})

const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(1),
  unitMix: z.array(unitMixSchema).min(1, 'At least one unit type is required.'),
  otherIncomes: z.array(lineItemSchema),
  operatingExpenses: z.array(lineItemSchema),
  vacancyRate: z.coerce.number().min(0).max(100),
  downPayment: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  loanTerm: z.coerce.number().int().min(1),
  annualIncomeGrowth: z.coerce.number().min(0).max(100),
  annualExpenseGrowth: z.coerce.number().min(0).max(100),
  annualAppreciation: z.coerce.number().min(0).max(100),
  sellingCosts: z.coerce.number().min(0).max(100),
  marketConditions: z.string().min(10, 'Please describe market conditions.'),
  rehabCost: z.coerce.number().optional().default(0),
  closingCosts: z.coerce.number().optional().default(0),
  isAdvanced: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

const calculateProForma = (values: FormData): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    const {
        purchasePrice, rehabCost = 0, closingCosts = 0, downPayment, interestRate, loanTerm,
        unitMix, otherIncomes, operatingExpenses, vacancyRate,
        annualIncomeGrowth, annualExpenseGrowth, annualAppreciation
    } = values;

    if (!purchasePrice || !loanTerm) return [];

    const loanAmount = purchasePrice - downPayment;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    let currentGrossRent = unitMix.reduce((acc: number, unit: { count: number; rent: number; }) => acc + (unit.count * unit.rent * 12), 0);
    const monthlyOtherIncome = otherIncomes.reduce((acc: number, item: { amount: number; }) => acc + item.amount, 0);
    let currentOtherIncome = monthlyOtherIncome * 12;
    let currentOpEx = operatingExpenses.reduce((acc, item) => acc + item.amount, 0) * 12;


    let currentPropertyValue = purchasePrice + rehabCost;
    let currentLoanBalance = loanAmount;
    
    for (let year = 1; year <= 10; year++) {
        const grossPotentialRent = currentGrossRent + currentOtherIncome;
        const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
        const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
        const noi = effectiveGrossIncome - currentOpEx;

        let yearEndLoanBalance = currentLoanBalance;
        if(monthlyInterestRate > 0) {
            for (let i = 0; i < 12; i++) {
                const interestPayment = yearEndLoanBalance * monthlyInterestRate;
                const principalPayment = (debtService / 12) - interestPayment;
                yearEndLoanBalance -= principalPayment;
            }
        } else {
            yearEndLoanBalance = 0;
        }

        proForma.push({
            year,
            grossPotentialRent: grossPotentialRent,
            vacancyLoss,
            effectiveGrossIncome,
            operatingExpenses: currentOpEx,
            noi,
            debtService,
            cashFlowBeforeTax: noi - debtService,
            propertyValue: currentPropertyValue,
            loanBalance: yearEndLoanBalance > 0 ? yearEndLoanBalance : 0,
            equity: currentPropertyValue - (yearEndLoanBalance > 0 ? yearEndLoanBalance : 0),
        });
        
        currentGrossRent *= (1 + annualIncomeGrowth / 100);
        currentOtherIncome *= (1 + annualIncomeGrowth / 100);
        currentOpEx *= (1 + annualExpenseGrowth / 100);
        currentPropertyValue *= (1 + annualAppreciation / 100);
        currentLoanBalance = yearEndLoanBalance;
    }

    return proForma;
};

const LineItemInput = ({ control, name, formLabel, fieldLabel, placeholder, icon }: { control: any, name: any, formLabel: string, fieldLabel: string, placeholder: string, icon: React.ReactNode }) => {
    const { fields, append, remove } = useFieldArray({ control, name });
    return (
        <div>
            <FormLabel>{formLabel}</FormLabel>
            {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr,1fr,auto] gap-2 items-end mt-2">
                    <FormField control={control} name={`${name}.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">{fieldLabel}</FormLabel><FormControl><Input placeholder={placeholder} {...field} /></FormControl> </FormItem> )} />
                    <FormField control={control} name={`${name}.${index}.amount`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Amount (Monthly)</FormLabel><FormControl><InputWithIcon icon={icon} type="number" {...field} /></FormControl> </FormItem> )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', amount: 0 })} className="mt-2 flex items-center gap-1"> <Plus size={16} /> Add Item </Button>
        </div>
    );
};

interface CommercialCalculatorProps {
    deal?: Deal;
    onSave?: () => void;
    onCancel?: () => void;
    dealCount?: number;
}

export default function CommercialCalculator({ deal, onSave, onCancel, dealCount = 0 }: CommercialCalculatorProps) {
  const [aiResult, setAiResult] = useState<{message: string, assessment: string | null} | null>(null);
  const [isAIPending, startAITransition] = useTransition();

  const [analysisResult, setAnalysisResult] = useState<{
      monthlyCashFlow: number;
      cocReturn: number;
      capRate: number;
      noi: number;
      chartData: any[];
      proFormaData: ProFormaEntry[];
  } | null>(null);


  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const isEditMode = !!deal;
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: profileData } = useDoc<UserProfile>(userProfileRef);

  useEffect(() => {
    if (isEditMode) {
      setIsAdvancedMode(!!deal.isAdvanced);
    }
  }, [isEditMode, deal]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dealName: 'Downtown Commercial Center',
      purchasePrice: 5000000,
      unitMix: [
        { type: 'Studio', count: 10, rent: 1200 },
        { type: '1BR', count: 20, rent: 1600 },
        { type: '2BR', count: 10, rent: 2200 },
      ],
      otherIncomes: [{name: 'Laundry', amount: 500}],
      operatingExpenses: [
        {name: 'Property Taxes', amount: 4000},
        {name: 'Insurance', amount: 1500},
        {name: 'Repairs & Maintenance', amount: 2500},
        {name: 'Management Fee', amount: 3500},
      ],
      vacancyRate: 5,
      downPayment: 1250000,
      interestRate: 7.5,
      loanTerm: 30,
      annualIncomeGrowth: 3,
      annualExpenseGrowth: 2,
      annualAppreciation: 4,
      sellingCosts: 5,
      marketConditions: 'High-traffic downtown area with strong retail demand. What are the pros and cons of a triple-net lease for this property?',
      isAdvanced: false,
    },
  });
  
  useEffect(() => {
    if (isEditMode && deal) {
      form.reset(deal);
      handleAnalysis(deal);
    }
  }, [deal, isEditMode, form.reset]);

  const handleAnalysis = (data: FormData) => {
    const { purchasePrice, downPayment, rehabCost = 0, closingCosts = 0 } = data;
    const proForma = calculateProForma(data);
    const year1 = proForma[0] || {};
    
    const totalInvestment = downPayment + rehabCost + (closingCosts/100 * purchasePrice);
    const noi = year1.noi || 0;
    const monthlyCashFlow = (year1.cashFlowBeforeTax || 0) / 12;
    const cocReturn = totalInvestment > 0 ? ((year1.cashFlowBeforeTax || 0) / totalInvestment) * 100 : 0;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

    const cashFlowChartData = proForma.slice(0, 10).map(entry => ({
      year: `Year ${entry.year}`,
      cashFlow: parseFloat(entry.cashFlowBeforeTax.toFixed(2))
    }));
    
    setAnalysisResult({
        monthlyCashFlow, cocReturn, capRate, noi, chartData: cashFlowChartData, proFormaData: proForma
    });
  };

  const handleGenerateInsights = () => {
    if (!analysisResult) {
        toast({
            title: 'Run Analysis First',
            description: 'Please run the local analysis before generating AI insights.',
            variant: 'destructive'
        });
        return;
    }
    const data = form.getValues();
    startAITransition(async () => {
        const result = await getDealAssessment({
          dealType: 'Commercial Multifamily',
          financialData: `
            Purchase Price: ${data.purchasePrice},
            Year 1 NOI: ${analysisResult.noi.toFixed(2)},
            Year 1 Cap Rate: ${analysisResult.capRate.toFixed(2)}%,
            Year 1 CoC Return: ${analysisResult.cocReturn.toFixed(2)}%
        `,
          marketConditions: data.marketConditions,
        });
        setAiResult(result);
    });
  };

  const handleSaveDeal = async () => {
    if (!analysisResult) {
        toast({ title: 'Analysis Required', description: 'Please run the analysis first.', variant: 'destructive' });
        return;
    }
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
    const dealId = isEditMode && deal ? deal.id : doc(collection(firestore, `users/${user.uid}/deals`)).id;

    const dealData: Deal = {
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
      isAdvanced: false, // Simple calculator always saves as non-advanced
      // Defaulting unused fields
      arv: 0,
      repairsAndMaintenance: 0,
      capitalExpenditures: 0,
      managementFee: 0,
      annualAppreciation: formValues.annualAppreciation || 0,
      annualExpenseGrowth: formValues.annualExpenseGrowth || 0,
      annualIncomeGrowth: formValues.annualIncomeGrowth || 0,
      grossMonthlyIncome: 0,
      holdingLength: 0,
      insurance: 0,
      netProfit: 0,
      propertyTaxes: 0,
      roi: 0,
      sellingCosts: formValues.sellingCosts || 0,
    };
    
    const dealRef = doc(firestore, `users/${user.uid}/deals`, dealId);
    setDocumentNonBlocking(dealRef, dealData, { merge: true });

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

  if (isAdvancedMode) {
      return <AdvancedCommercialCalculator deal={deal} onSave={onSave} onCancel={onCancel} dealCount={dealCount} />;
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                 <CardTitle className="font-headline">{isEditMode ? `Editing: ${deal.dealName}` : 'Commercial Multifamily Analyzer'}</CardTitle>
                 <CardDescription> A lightweight analysis for quick underwriting of multifamily deals. </CardDescription>
            </div>
             <div className="flex items-center space-x-2">
                <Label htmlFor="analysis-mode">Simple</Label>
                <Switch id="analysis-mode" checked={isAdvancedMode} onCheckedChange={setIsAdvancedMode} />
                <Label htmlFor="analysis-mode">Advanced</Label>
            </div>
        </div>
      </CardHeader>
      
      {isAdvancedMode ? (
        <AdvancedCommercialCalculator deal={deal} onSave={onSave} onCancel={onCancel} dealCount={dealCount} />
      ) : (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAnalysis)}>
            <CardContent className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Property & Purchase</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Income</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <FormLabel>Unit Mix</FormLabel>
                                    <FormDescription className="text-xs">Define the number of units and average rent for each type.</FormDescription>
                                    {form.getValues('unitMix').map((field, index) => (
                                        <div key={index} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end mt-2">
                                        <FormField control={form.control} name={`unitMix.${index}.type`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Type</FormLabel><FormControl><Input placeholder="e.g., 2BR" {...field} /></FormControl> </FormItem> )} />
                                        <FormField control={form.control} name={`unitMix.${index}.count`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs"># Units</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
                                        <FormField control={form.control} name={`unitMix.${index}.rent`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Avg. Rent</FormLabel><FormControl><InputWithIcon icon={<DollarSign size={14}/>} type="number" {...field} /></FormControl> </FormItem> )} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => form.setValue('unitMix', form.getValues('unitMix').filter((_, i) => i !== index))}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    ))}
                                    <Button type="button" size="sm" variant="outline" onClick={() => form.setValue('unitMix', [...form.getValues('unitMix'), {type: '', count: 0, rent: 0}])} className="mt-2 flex items-center gap-1"><Plus size={16}/> Add Unit Type</Button>
                                </div>
                                <LineItemInput control={form.control} name="otherIncomes" formLabel="Other Income" fieldLabel="Income Source" placeholder="e.g., Laundry, Parking" icon={<DollarSign size={14}/>} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle className="text-lg">Expenses</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <LineItemInput control={form.control} name="operatingExpenses" formLabel="Operating Expenses" fieldLabel="Expense Item" placeholder="e.g., Property Tax, Insurance" icon={<DollarSign size={14}/>} />
                                <FormField name="vacancyRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </div>
                    <div className="space-y-6">
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Financing</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-3 gap-4">
                                <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Amort. (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Projections</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-2 gap-4">
                                <FormField name="annualIncomeGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Income Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualExpenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualAppreciation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Appreciation</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Selling Costs</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
                
                {analysisResult && (
                    <>
                    <Card>
                        <CardHeader><CardTitle>Key Metrics (Year 1)</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div><p className="text-sm text-muted-foreground">Cap Rate</p><p className="text-2xl font-bold">{analysisResult.capRate.toFixed(2)}%</p></div>
                            <div><p className="text-sm text-muted-foreground">CoC Return</p><p className="text-2xl font-bold">{analysisResult.cocReturn.toFixed(2)}%</p></div>
                            <div><p className="text-sm text-muted-foreground">NOI (Annual)</p><p className="font-bold text-lg">${analysisResult.noi.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p></div>
                            <div><p className="text-sm text-muted-foreground">Monthly Cash Flow</p><p className="font-bold text-lg">${analysisResult.monthlyCashFlow.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p></div>
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader> <CardTitle className="flex items-center gap-2"> <BarChart2 size={20} /> 10-Year Cash Flow Projection </CardTitle> </CardHeader>
                        <CardContent className="h-[250px] -ml-4 pr-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysisResult.chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis dataKey="year" stroke="hsl(var(--foreground))" fontSize={12} />
                                <YAxis stroke="hsl(var(--foreground))" fontSize={12} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                                <Tooltip
                                    cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        border: '1px solid hsl(var(--border))',
                                        color: 'hsl(var(--foreground))'
                                    }}
                                />
                                <Bar dataKey="cashFlow" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <ProFormaTable data={analysisResult.proFormaData} />
                    </>
                )}
                
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles size={20} className="text-primary" /> AI Deal Assessment
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <FormField
                            name="marketConditions"
                            control={form.control}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Market Conditions & Questions for AI</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="e.g., The local market is seeing strong job growth. What are the risks of rising interest rates for this deal?" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        {isAIPending ? (
                             <div className="mt-4 p-4 rounded-lg bg-muted/50 flex items-center justify-center">
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                <span>Generating insights...</span>
                            </div>
                        ) : aiResult ? (
                            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                                {aiResult.assessment ? (
                                    <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: aiResult.assessment }} />
                                ) : (
                                    <p className="text-destructive">{aiResult.message}</p>
                                )}
                            </div>
                        ) : null}
                    </CardContent>
                    <CardFooter className="flex justify-end">
                        <Button type="button" onClick={handleGenerateInsights} disabled={isAIPending}>
                            {isAIPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            Generate AI Insights
                        </Button>
                    </CardFooter>
                </Card>

            </CardContent>
            <CardFooter className="flex justify-end gap-2">
                {isEditMode && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
                <Button type="submit">Run Analysis</Button>
                <Button variant="secondary" onClick={handleSaveDeal} disabled={isAIPending || isSaving}> {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEditMode ? 'Save Changes' : 'Save Deal')} </Button>
            </CardFooter>
            </form>
        </Form>
      )}
    </Card>
  );
}
