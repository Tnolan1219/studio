'use client';

import { useActionState, useState, useMemo, useTransition } from 'react';
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
  CardFooter
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, DollarSign, BarChart2, TrendingUp, Handshake, Bot, TestTube2, Percent, Trash2, Plus, Info, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { InputWithIcon } from '../ui/input-with-icon';
import { Button } from '../ui/button';
import { useUser, useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';
import { ProFormaTable } from './pro-forma-table';
import type { ProFormaEntry } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';

const UnderConstruction = ({ tabName }: { tabName: string }) => (
    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-muted/20">
        <div className="text-center p-4">
            <TestTube2 className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">Feature Under Construction</h3>
            <p className="mt-2 text-sm text-muted-foreground">The "{tabName}" tab is part of the Advanced Model and is currently in development. It will soon offer in-depth analysis capabilities.</p>
        </div>
    </div>
);

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
  // Acquisition
  purchasePrice: z.coerce.number().min(1),
  closingCosts: z.coerce.number().min(0),

  // Income
  unitMix: z.array(unitMixSchema).min(1, 'At least one unit type is required.'),
  otherIncomes: z.array(lineItemSchema),
  
  // Expenses
  operatingExpenses: z.array(lineItemSchema),
  vacancyRate: z.coerce.number().min(0).max(100),
  
  // Financing
  downPayment: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  loanTerm: z.coerce.number().int().min(1),

  // Projections
  annualIncomeGrowth: z.coerce.number().min(0).max(100),
  annualExpenseGrowth: z.coerce.number().min(0).max(100),
  annualAppreciation: z.coerce.number().min(0).max(100),
  sellingCosts: z.coerce.number().min(0).max(100),
  rehabCost: z.coerce.number().optional().default(0),

  marketConditions: z.string().min(10, 'Please describe market conditions.'),
});

type FormData = z.infer<typeof formSchema>;


const calculateProForma = (values: FormData): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    const {
        purchasePrice, rehabCost = 0, closingCosts = 0, downPayment, interestRate, loanTerm,
        unitMix, otherIncomes, operatingExpenses, vacancyRate,
        annualIncomeGrowth, annualExpenseGrowth, annualAppreciation
    } = values;

    if (!purchasePrice || !downPayment || !loanTerm) return [];

    const loanAmount = purchasePrice + rehabCost + closingCosts - downPayment;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    let currentGrossRent = unitMix.reduce((acc: number, unit: { count: number; rent: number; }) => acc + (unit.count * unit.rent * 12), 0);
    const monthlyOtherIncome = otherIncomes.reduce((acc: number, item: { amount: number; }) => acc + item.amount, 0);
    let currentOtherIncome = monthlyOtherIncome * 12;

    const monthlyOpEx = operatingExpenses.reduce((acc: number, item: { amount: number; }) => acc + item.amount, 0);
    let currentOpEx = monthlyOpEx * 12;

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


export default function AdvancedCommercialCalculator() {
    
  const tabs = [
    { value: 'overview', label: 'Overview', icon: Building },
    { value: 'income', label: 'Income', icon: DollarSign },
    { value: 'expenses', label: 'Expenses', icon: DollarSign },
    { value: 'financing', label: 'Financing', icon: BarChart2 },
    { value: 'projections', label: 'Projections', icon: TrendingUp },
    { value: 'returns', label: 'Returns', icon: Handshake },
    { value: 'sensitivity', label: 'Sensitivity', icon: TestTube2 },
    { value: 'detailed_analysis', label: 'Detailed Analysis', icon: Info },
  ];

   const [state, formAction] = useActionState(getDealAssessment, {
    message: '',
    assessment: null,
  });
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isPending, startTransition] = useTransition();
  const [isSaving, setIsSaving] = useState(false);

   const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      dealName: 'Advanced Commercial Center',
      purchasePrice: 5000000,
      closingCosts: 2,
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
      marketConditions: 'Analyze this deal using advanced metrics. Consider value-add opportunities by renovating 10 units in Year 2 for a 20% rent premium. What would the IRR and Equity Multiple be over a 10 year hold?',
    },
  });

  const { fields: unitMixFields, append: appendUnit, remove: removeUnit } = useFieldArray({
    control: form.control,
    name: 'unitMix',
  });

  const handleAnalyzeWrapper = (data: FormData) => {
    startTransition(() => {
        const proForma = calculateProForma(data);
        const year1 = proForma[0] || {};
        const financialData = `
            Advanced Analysis:
            Purchase Price: ${data.purchasePrice}, Rehab Cost: ${data.rehabCost}, Down Payment: ${data.downPayment},
            Year 1 Gross Potential Rent: ${year1.grossPotentialRent}, Year 1 NOI: ${year1.noi}, Year 1 Cash Flow: ${year1.cashFlowBeforeTax}
        `;

        const payload = new FormData();
        payload.append('dealType', 'Commercial Multifamily (Advanced)');
        payload.append('financialData', financialData);
        payload.append('marketConditions', data.marketConditions);
        formAction(payload);
    });
  };

  const watchedValues = form.watch();

  const { monthlyCashFlow, cocReturn, capRate, noi, chartData, proFormaData } = useMemo(() => {
    const { purchasePrice, downPayment, rehabCost = 0, closingCosts = 0 } = watchedValues;
    const proForma = calculateProForma(watchedValues);
    const year1 = proForma[0] || {};
    
    const totalInvestment = downPayment + (closingCosts/100 * purchasePrice) + rehabCost;
    const noi = year1.noi || 0;
    const monthlyCashFlow = (year1.cashFlowBeforeTax || 0) / 12;
    const cocReturn = totalInvestment > 0 ? ((year1.cashFlowBeforeTax || 0) / totalInvestment) * 100 : 0;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

    const cashFlowChartData = proForma.slice(0, 10).map(entry => ({
      year: `Year ${entry.year}`,
      cashFlow: parseFloat(entry.cashFlowBeforeTax.toFixed(2))
    }));

    return { monthlyCashFlow, cocReturn, capRate, noi, chartData: cashFlowChartData, proFormaData: proForma };
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

    setIsSaving(true);
    const dealData = {
      ...form.getValues(),
      dealType: 'Commercial Multifamily',
      monthlyCashFlow: parseFloat(monthlyCashFlow.toFixed(2)),
      cocReturn: parseFloat(cocReturn.toFixed(2)),
      noi: parseFloat(noi.toFixed(2)),
      capRate: parseFloat(capRate.toFixed(2)),
      userId: user.uid,
      createdAt: serverTimestamp(),
      status: 'In Works',
      isPublished: false,
    };

    const dealsCol = collection(firestore, `users/${user.uid}/deals`);
    addDocumentNonBlocking(dealsCol, dealData).catch(error => {
        toast({ title: 'Error Saving Deal', description: error.message, variant: 'destructive' });
    });
    toast({ title: 'Deal Saved!', description: `${dealData.dealName} has been added to your portfolio.` });
    setIsSaving(false);
  };


  return (
    <CardContent>
        <p className="text-center text-sm text-muted-foreground mb-4">
            This multi-tab interface will support detailed, year-by-year cash flow analysis, value-add projects, complex financing, and more.
        </p>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAnalyzeWrapper)}>
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value} className={cn("flex-col h-14")}>
                                <tab.icon className="w-5 h-5 mb-1" />
                                <span>{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    <TabsContent value="overview" className="mt-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <CardHeader><CardTitle>Key Metrics (Year 1)</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-2 gap-4">
                                    <div><p className="text-sm text-muted-foreground">Cap Rate</p><p className="text-2xl font-bold">{capRate.toFixed(2)}%</p></div>
                                    <div><p className="text-sm text-muted-foreground">CoC Return</p><p className="text-2xl font-bold">{cocReturn.toFixed(2)}%</p></div>
                                    <div><p className="text-sm text-muted-foreground">NOI (Annual)</p><p className="font-bold text-lg">${noi.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p></div>
                                    <div><p className="text-sm text-muted-foreground">Monthly Cash Flow</p><p className="font-bold text-lg">${monthlyCashFlow.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p></div>
                                </CardContent>
                            </Card>
                             <Card>
                                <CardHeader> <CardTitle className="flex items-center gap-2"> <BarChart2 size={20} /> 10-Year Cash Flow </CardTitle> </CardHeader>
                                <CardContent className="h-[200px] -ml-4 pr-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsBarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                        <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                                        <Tooltip
                                            cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                                            contentStyle={{ 
                                                backgroundColor: 'hsl(var(--background))', 
                                                border: '1px solid hsl(var(--border))',
                                                color: 'hsl(var(--foreground))'
                                            }}
                                        />
                                        <RechartsBar dataKey="cashFlow" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    </RechartsBarChart>
                                </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                        <div className="mt-6">
                            <ProFormaTable data={proFormaData} />
                        </div>
                    </TabsContent>

                     <TabsContent value="income" className="mt-6">
                        <Card>
                            <CardHeader><CardTitle>Income Sources</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                               <div>
                                    <FormLabel>Unit Mix</FormLabel>
                                    <FormDescription className="text-xs">Define the number of units and average rent for each type.</FormDescription>
                                    {unitMixFields.map((field, index) => (
                                        <div key={field.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end mt-2">
                                        <FormField control={form.control} name={`unitMix.${index}.type`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Type</FormLabel><FormControl><Input placeholder="e.g., 2BR" {...field} /></FormControl> </FormItem> )} />
                                        <FormField control={form.control} name={`unitMix.${index}.count`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs"># Units</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
                                        <FormField control={form.control} name={`unitMix.${index}.rent`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Avg. Rent</FormLabel><FormControl><InputWithIcon icon={<DollarSign size={14}/>} type="number" {...field} /></FormControl> </FormItem> )} />
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeUnit(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                        </div>
                                    ))}
                                    <Button type="button" size="sm" variant="outline" onClick={() => appendUnit({type: '', count: 0, rent: 0})} className="mt-2 flex items-center gap-1"><Plus size={16}/> Add Unit Type</Button>
                                </div>
                                <LineItemInput control={form.control} name="otherIncomes" formLabel="Other Income" fieldLabel="Income Source" placeholder="e.g., Laundry, Parking" icon={<DollarSign size={14}/>} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="expenses" className="mt-6">
                         <Card>
                            <CardHeader><CardTitle>Operating Expenses</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs (%)</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <LineItemInput control={form.control} name="operatingExpenses" formLabel="Recurring Monthly Expenses" fieldLabel="Expense Item" placeholder="e.g., Property Tax, Insurance" icon={<DollarSign size={14}/>} />
                                <FormField name="vacancyRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="financing" className="mt-6">
                        <Card>
                            <CardHeader><CardTitle>Financing Details</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Amortization (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="projections" className="mt-6">
                        <Card>
                            <CardHeader><CardTitle>Growth & Exit Assumptions</CardTitle></CardHeader>
                             <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <FormField name="annualIncomeGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Income Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualExpenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualAppreciation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Appreciation</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Selling Costs</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="returns" className="mt-6">
                        <UnderConstruction tabName="Returns & Investor Waterfalls" />
                    </TabsContent>
                    <TabsContent value="sensitivity" className="mt-6">
                        <UnderConstruction tabName="Sensitivity Analysis" />
                    </TabsContent>
                    <TabsContent value="detailed_analysis" className="mt-6">
                        <Card>
                            <CardHeader> <CardTitle className="flex items-center gap-2"> <Sparkles size={20} className="text-primary" /> AI Deal Assessment </CardTitle> </CardHeader>
                            <CardContent>
                            <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>AI Advisor Prompt</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription> e.g., "Analyze the pros and cons of a triple-net lease for this property." </FormDescription> <FormMessage /> </FormItem> )} />
                            {isPending ? (
                                <div className="space-y-2 mt-4"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-3/4" /> </div>
                            ) : state.assessment ? (
                                <div className="text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: state.assessment }} />
                            ) : (
                                <p className="text-sm text-muted-foreground mt-4"> Click "Run Analysis" to get an AI-powered assessment. </p>
                            )}
                            {state.message && !state.assessment && ( <p className="text-sm text-destructive mt-4">{state.message}</p> )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                </Tabs>
                <CardFooter className="flex justify-end gap-2 mt-6">
                    <Button type="submit" disabled={isPending || isSaving}> {isPending ? 'Analyzing...' : 'Run Analysis'} </Button>
                    <Button type="button" variant="secondary" onClick={handleSaveDeal} disabled={isPending || isSaving}> {isSaving ? 'Saving...' : 'Save Deal'} </Button>
                </CardFooter>
            </form>
        </Form>
    </CardContent>
  );
}

    