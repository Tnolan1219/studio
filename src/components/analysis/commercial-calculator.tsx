
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  CartesianGrid
} from 'recharts';
import { useUser, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc, increment } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';
import type { Deal, UserProfile, UnitMixItem, ProFormaEntry, Plan } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ProFormaTable } from './pro-forma-table';
import { useProfileStore } from '@/hooks/use-profile-store';
import { useRouter } from 'next/navigation';


const lineItemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    amount: z.coerce.number().min(0),
    type: z.enum(['percent', 'fixed']).default('percent'),
});

const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(0),
  closingCosts: z.coerce.number().min(0),
  arv: z.coerce.number().min(0),
  downPayment: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  loanTerm: z.coerce.number().int().min(1),
  unitMix: z.array(z.object({ type: z.string().min(1), count: z.coerce.number().min(0), rent: z.coerce.number().min(0) })).min(1, 'At least one unit type is required.'),
  otherIncomes: z.array(lineItemSchema).optional(),
  operatingExpenses: z.array(lineItemSchema).optional(),
  capitalExpenditures: z.array(lineItemSchema).optional(),
  annualIncomeGrowth: z.coerce.number().min(0).max(100),
  annualExpenseGrowth: z.coerce.number().min(0).max(100),
  annualAppreciation: z.coerce.number().min(0).max(100),
  vacancy: z.coerce.number().min(0).max(100),
});

type FormData = z.infer<typeof formSchema>;

const calculateProForma = (values: FormData): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    const {
        purchasePrice, downPayment, interestRate, loanTerm,
        unitMix, otherIncomes, operatingExpenses, capitalExpenditures, vacancy,
        annualIncomeGrowth, annualExpenseGrowth, annualAppreciation
    } = values;

    if (!purchasePrice || !loanTerm) return [];

    const loanAmount = purchasePrice - downPayment;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    let currentGrossRent = unitMix.reduce((acc, unit) => acc + (unit.count * unit.rent), 0) * 12;
    let currentPropertyValue = values.arv;
    let currentLoanBalance = loanAmount;
    
    for (let year = 1; year <= 10; year++) {
        const currentOtherIncome = otherIncomes?.reduce((acc, item) => {
            if (item.type === 'fixed') return acc + item.amount * 12;
            return acc + (currentGrossRent * (item.amount / 100));
        }, 0) || 0;
        
        const grossPotentialRent = currentGrossRent + currentOtherIncome;
        const vacancyLoss = grossPotentialRent * (vacancy / 100);
        const effectiveGrossIncome = grossPotentialRent - vacancyLoss;

        const currentOpEx = operatingExpenses?.reduce((acc, item) => {
            if (item.type === 'fixed') return acc + item.amount * 12;
            return acc + (effectiveGrossIncome * (item.amount / 100));
        }, 0) || 0;
        
        const currentCapEx = capitalExpenditures?.reduce((acc, item) => {
            if (item.type === 'fixed') return acc + item.amount; // Assume annual for fixed
            return acc + (effectiveGrossIncome * (item.amount / 100));
        }, 0) || 0;
        
        const totalExpenses = currentOpEx + currentCapEx;
        const noi = effectiveGrossIncome - totalExpenses;

        let yearEndLoanBalance = currentLoanBalance;
        if(monthlyInterestRate > 0 && yearEndLoanBalance > 0) {
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
            grossPotentialRent,
            vacancyLoss,
            effectiveGrossIncome,
            operatingExpenses: totalExpenses,
            noi,
            debtService,
            cashFlowBeforeTax: noi - debtService,
            propertyValue: currentPropertyValue,
            loanBalance: yearEndLoanBalance > 0 ? yearEndLoanBalance : 0,
            equity: currentPropertyValue - (yearEndLoanBalance > 0 ? yearEndLoanBalance : 0),
        });
        
        currentGrossRent *= (1 + annualIncomeGrowth / 100);
        currentPropertyValue *= (1 + annualAppreciation / 100);
        currentLoanBalance = yearEndLoanBalance;
    }

    return proForma;
};


const LineItemInput = ({ control, name, formLabel, fieldLabel, placeholder }: { control: any, name: any, formLabel: string, fieldLabel: string, placeholder: string }) => {
    const { fields, append, remove } = useFieldArray({ control, name });
    return (
        <div>
            <FormLabel>{formLabel}</FormLabel>
            {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[2fr,1fr,1fr,auto] gap-2 items-end mt-2">
                    <FormField control={control} name={`${name}.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">{fieldLabel}</FormLabel><FormControl><Input placeholder={placeholder} {...field} /></FormControl> </FormItem> )} />
                    <FormField control={control} name={`${name}.${index}.amount`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Amount</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
                    <FormField control={control} name={`${name}.${index}.type`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Type</FormLabel> <Select onValueChange={field.onChange} defaultValue={field.value}> <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl><SelectContent><SelectItem value="fixed">$</SelectItem><SelectItem value="percent">%</SelectItem></SelectContent></Select></FormItem> )} />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
            ))}
            <Button type="button" size="sm" variant="outline" onClick={() => append({ name: '', amount: 0, type: 'percent' })} className="mt-2 flex items-center gap-1"> <Plus size={16} /> Add Item </Button>
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
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isEditMode = !!deal;
  
  const [analysisResult, setAnalysisResult] = useState<{
      monthlyCashFlow: number;
      cocReturn: number;
      capRate: number;
      noi: number;
      dscr: number;
      totalInvestment: number;
      chartData: any[];
      proFormaData: ProFormaEntry[];
  } | null>(null);

   const { profileData, hasHydrated } = useProfileStore();
  
  const planRef = useMemoFirebase(() => {
    if (!profileData?.plan) return null;
    return doc(firestore, 'plans', profileData.plan.toLowerCase());
  }, [firestore, profileData?.plan]);
  const { data: planData } = useDoc<Plan>(planRef);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);


  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && deal && !deal.isAdvanced ? {
        ...deal,
        unitMix: deal.unitMix || [{type: 'Unit', count: 1, rent: deal.grossMonthlyIncome || 0}],
        operatingExpenses: deal.operatingExpenses || [],
        capitalExpenditures: deal.capitalExpenditures || [{ name: 'CapEx Reserves', amount: 5, type: 'percent' }],
        otherIncomes: deal.otherIncomes || [],
        annualIncomeGrowth: deal.annualIncomeGrowth || 3,
        annualExpenseGrowth: deal.annualExpenseGrowth || 2,
        annualAppreciation: deal.annualAppreciation || 3,
    } : {
      dealName: 'My Commercial Deal',
      purchasePrice: 1000000,
      closingCosts: 3,
      arv: 1200000,
      downPayment: 250000,
      interestRate: 7,
      loanTerm: 30,
      vacancy: 7,
      unitMix: [{type: 'Residential Unit', count: 10, rent: 1000}],
      otherIncomes: [],
      operatingExpenses: [
        {name: 'Property Taxes', amount: 8, type: 'percent'},
        {name: 'Insurance', amount: 2.5, type: 'percent'},
        {name: 'Maintenance', amount: 4, type: 'percent'},
        {name: 'Management Fee', amount: 5, type: 'percent'},
      ],
      capitalExpenditures: [{name: 'Replacement Reserves', amount: 5, type: 'percent'}],
      annualIncomeGrowth: 3,
      annualExpenseGrowth: 2,
      annualAppreciation: 3,
    },
  });
  
  const { fields: unitMixFields, append: appendUnit, remove: removeUnit } = useFieldArray({
    control: form.control,
    name: 'unitMix',
  });


  const handleAnalysis = (data: FormData) => {
     if (user?.isAnonymous || !profileData || !planData) {
        toast({ title: "Account Required", description: "Please create a full account to use the calculators."});
        return;
    }

    if (profileData.calculatorUses >= planData.maxCalculatorUses) {
        toast({
            title: 'Calculator Limit Reached',
            description: `You have used all ${planData.maxCalculatorUses} of your monthly calculator uses.`,
            action: (
              <Button onClick={() => router.push('/plans')}>Upgrade</Button>
            ),
        });
        return;
    }
    const proForma = calculateProForma(data);
    const year1 = proForma[0] || {};
    
    const grossMonthlyIncome = data.unitMix.reduce((acc, unit) => acc + unit.count * unit.rent, 0);

    const initialCapexCost = data.capitalExpenditures?.reduce((acc, item) => item.type === 'fixed' ? acc + item.amount : acc, 0) || 0;

    const totalInvestment = data.downPayment + (data.purchasePrice * (data.closingCosts / 100)) + initialCapexCost;
    
    const noi = year1.noi || 0;
    const monthlyCashFlow = (year1.cashFlowBeforeTax || 0) / 12;
    const cocReturn = totalInvestment > 0 ? ((year1.cashFlowBeforeTax || 0) / totalInvestment) * 100 : 0;
    const capRate = data.purchasePrice > 0 ? (noi / data.purchasePrice) * 100 : 0;
    const dscr = (year1.debtService || 0) > 0 ? (noi / (year1.debtService || 1)) : Infinity;

    const breakdownChartData = [
        { name: 'Income', value: grossMonthlyIncome, fill: 'hsl(var(--primary))' },
        { name: 'OpEx', value: (year1.operatingExpenses || 0) / 12, fill: 'hsl(var(--chart-5))' },
        { name: 'Mortgage', value: (year1.debtService || 0) / 12, fill: 'hsl(var(--chart-3))' },
        { name: 'Cash Flow', value: monthlyCashFlow > 0 ? monthlyCashFlow : 0, fill: 'hsl(var(--success))' },
    ];


    setAnalysisResult({ monthlyCashFlow, cocReturn, capRate, noi, chartData: breakdownChartData, dscr, totalInvestment, proFormaData: proForma });
    if (userProfileRef) {
        setDocumentNonBlocking(userProfileRef, { calculatorUses: increment(1) }, { merge: true });
    }
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

    if (!isEditMode && planData && profileData) {
        if (profileData.savedDeals >= planData.maxSavedDeals) {
            toast({
                title: `Deal Limit Reached for ${planData.name} Plan`,
                description: `You have saved ${profileData.savedDeals} of ${planData.maxSavedDeals} deals.`,
                action: (
                  <Button onClick={() => router.push('/plans')}>Upgrade</Button>
                ),
                variant: 'destructive',
            });
            return;
        }
    }

    setIsSaving(true);
    const formValues = form.getValues();
    const dealId = isEditMode && deal ? deal.id : doc(collection(firestore, `users/${user.uid}/deals`)).id;

    const grossMonthlyIncome = (formValues.unitMix.reduce((acc, unit) => acc + unit.count * unit.rent, 0));
    const rehabCost = formValues.capitalExpenditures?.reduce((acc, item) => item.type === 'fixed' ? acc + item.amount : acc, 0) || 0;

    const dealData: Partial<Deal> = {
      ...formValues,
      id: dealId,
      dealType: 'Commercial Multifamily' as const,
      grossMonthlyIncome,
      rehabCost,
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

    if (!isEditMode && userProfileRef) {
        setDocumentNonBlocking(userProfileRef, { savedDeals: increment(1) }, { merge: true });
    }

    toast({ title: isEditMode ? 'Changes Saved' : 'Deal Saved!', description: `${dealData.dealName} has been ${isEditMode ? 'updated' : 'added'}.` });
    if (isEditMode && onSave) onSave();
    else { form.reset(); setAnalysisResult(null); }
    setIsSaving(false);
  };
  
    const getMetricColor = (value: number, type: 'coc' | 'cap' | 'dscr' | 'cashflow') => {
        if (isNaN(value) || !isFinite(value)) return 'text-muted-foreground';
        switch (type) {
            case 'coc':
            case 'cap':
                if (value >= 8) return 'text-success';
                if (value >= 4) return 'text-yellow-500';
                return 'text-destructive';
            case 'dscr':
                if (value >= 1.25) return 'text-success';
                if (value >= 1.0) return 'text-yellow-500';
                return 'text-destructive';
            case 'cashflow':
                 if (value > 200) return 'text-success';
                 if (value > 0) return 'text-yellow-500';
                 return 'text-destructive';
            default:
                return 'text-foreground';
        }
    }


  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <div className="flex justify-between items-center">
            <div>
                 <CardTitle className="font-headline">{isEditMode ? `Editing: ${deal.dealName}` : 'Commercial Multifamily Analyzer'}</CardTitle>
                 <CardDescription>A quick analysis tool for commercial properties. Use monthly dollar amounts for income/expenses.</CardDescription>
            </div>
        </div>
      </CardHeader>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAnalysis)}>
            <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <Card>
                            <CardHeader><CardTitle className="text-lg font-headline">Purchase & Loan</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs (%)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="arv" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>After-Repair Value</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.01" {...field}/></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader><CardTitle className="text-lg font-headline">Projections</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-3 gap-4">
                                <FormField name="annualIncomeGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Income Growth</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualExpenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualAppreciation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Appreciation</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </div>
                   <Card>
                      <CardHeader><CardTitle className="text-lg font-headline">Income & Expenses</CardTitle></CardHeader>
                      <CardContent className="space-y-4">
                            <div>
                                <FormLabel>Unit Mix</FormLabel>
                                {unitMixFields.map((field, index) => (
                                    <div key={field.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end mt-2">
                                    <FormField control={form.control} name={`unitMix.${index}.type`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Type</FormLabel><FormControl><Input placeholder="e.g., 2BR" {...field} /></FormControl> </FormItem> )} />
                                    <FormField control={form.control} name={`unitMix.${index}.count`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs"># Units</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
                                    <FormField control={form.control} name={`unitMix.${index}.rent`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Rent/Mo</FormLabel><FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> </FormItem> )} />
                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeUnit(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                ))}
                                <Button type="button" size="sm" variant="outline" onClick={() => appendUnit({type: '', count: 1, rent: 0})} className="mt-2 flex items-center gap-1"><Plus size={16}/> Add Unit Type</Button>
                            </div>
                           <LineItemInput control={form.control} name="otherIncomes" formLabel="Other Income" fieldLabel="Income Source" placeholder="e.g., Laundry" />
                           <LineItemInput control={form.control} name="operatingExpenses" formLabel="Operating Expenses" fieldLabel="Expense Item" placeholder="e.g., Taxes" />
                           <LineItemInput control={form.control} name="capitalExpenditures" formLabel="Capital Expenditures" fieldLabel="CapEx Item" placeholder="e.g., Roof" />
                           <FormField name="vacancy" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                </div>
                {analysisResult && (
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle className="text-lg font-headline">Key Metrics & Breakdown</CardTitle>
                        </CardHeader>
                        <CardContent className="grid md:grid-cols-2 gap-6">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="p-3 bg-muted/50 rounded-lg"> <p className="text-sm text-muted-foreground">Cap Rate</p> <p className={cn("text-xl font-bold", getMetricColor(analysisResult.capRate, 'cap'))}>{analysisResult.capRate.toFixed(2)}%</p> </div>
                                <div className="p-3 bg-muted/50 rounded-lg"> <p className="text-sm text-muted-foreground">CoC Return (Y1)</p> <p className={cn("text-xl font-bold", getMetricColor(analysisResult.cocReturn, 'coc'))}>{analysisResult.cocReturn.toFixed(2)}%</p> </div>
                                <div className="p-3 bg-muted/50 rounded-lg"> <p className="text-sm text-muted-foreground">Monthly Cash Flow</p> <p className={cn("text-xl font-bold", getMetricColor(analysisResult.monthlyCashFlow, 'cashflow'))}>${analysisResult.monthlyCashFlow.toFixed(2)}</p> </div>
                                <div className="p-3 bg-muted/50 rounded-lg"> <p className="text-sm text-muted-foreground">NOI (Annual)</p> <p className="text-lg font-bold">${analysisResult.noi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                                <div className="p-3 bg-muted/50 rounded-lg"> <p className="text-sm text-muted-foreground">DSCR</p> <p className={cn("text-xl font-bold", getMetricColor(analysisResult.dscr, 'dscr'))}>{isFinite(analysisResult.dscr) ? `${analysisResult.dscr.toFixed(2)}x` : 'N/A'}</p> </div>
                                <div className="p-3 bg-muted/50 rounded-lg"> <p className="text-sm text-muted-foreground">Total Investment</p> <p className="text-lg font-bold">${analysisResult.totalInvestment.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                            </div>
                            <div className="h-[250px] w-full pt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysisResult.chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                                        <YAxis type="category" dataKey="name" width={60} />
                                        <Tooltip formatter={(val: number) => val.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} />
                                        <Bar dataKey="value">
                                            {analysisResult.chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.fill} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <ProFormaTable data={analysisResult.proFormaData} />
                        </CardFooter>
                    </Card>
                  )}
            </CardContent>
             <CardFooter className="flex justify-end gap-2">
                {isEditMode && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
                <Button type="submit">Run Analysis</Button>
                <Button type="button" variant="secondary" onClick={handleSaveDeal} disabled={isSaving}> {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEditMode ? 'Save Changes' : 'Save Deal')} </Button>
            </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
