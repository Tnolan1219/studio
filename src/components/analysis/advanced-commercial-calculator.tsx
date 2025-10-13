
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
import { Building, DollarSign, BarChart2, TrendingUp, Handshake, Bot, TestTube2, Percent, Trash2, Plus, Info, Sparkles, SlidersHorizontal } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

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
  rehabCost: z.coerce.number().optional().default(0),

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
  holdingLength: z.coerce.number().int().min(1).max(10),

  marketConditions: z.string().min(10, 'Please describe market conditions.'),
});

type FormData = z.infer<typeof formSchema>;

// Simplified IRR calculation using Newton-Raphson method
function calculateIRR(cashflows: number[], guess = 0.1) {
    const maxIterations = 100;
    const tolerance = 1e-6;
    let x0 = guess;

    for (let i = 0; i < maxIterations; i++) {
        let f = 0;
        let df = 0;
        for (let t = 0; t < cashflows.length; t++) {
            f += cashflows[t] / Math.pow(1 + x0, t);
            if (t !== 0) {
                df -= (t * cashflows[t]) / Math.pow(1 + x0, t + 1);
            }
        }
        const x1 = x0 - f / df;
        if (Math.abs(x1 - x0) < tolerance) {
            return x1;
        }
        x0 = x1;
    }
    return NaN; // Failed to converge
}


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
    { value: 'expenses', label: 'Expenses', icon: Percent },
    { value: 'financing', label: 'Financing', icon: BarChart2 },
    { value: 'projections', label: 'Projections', icon: TrendingUp },
    { value: 'returns', label: 'Returns', icon: Handshake },
    { value: 'sensitivity', label: 'Sensitivity', icon: SlidersHorizontal },
    { value: 'detailed_analysis', label: 'AI Analysis', icon: Sparkles },
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
      rehabCost: 250000,
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
      holdingLength: 10,
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

  const {
    monthlyCashFlow, cocReturn, capRate, noi, chartData, proFormaData,
    unleveredIRR, equityMultiple, netSaleProceeds, totalCashInvested,
    sensitivityData
  } = useMemo(() => {
      const { purchasePrice, downPayment, rehabCost = 0, closingCosts = 0, holdingLength, sellingCosts } = watchedValues;
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

      // Advanced metrics calculation
      let unleveredIRR = NaN;
      let equityMultiple = 0;
      let netSaleProceeds = 0;
      let totalCashInvested = downPayment + rehabCost + (purchasePrice * closingCosts/100);

      if (proForma.length >= holdingLength) {
          const exitYearEntry = proForma[holdingLength - 1];
          const exitCapRate = capRate / 100; // Simplified assumption
          const exitNOI = exitYearEntry.noi * (1 + watchedValues.annualExpenseGrowth/100); // Project NOI for year after hold
          
          const salePrice = exitNOI / exitCapRate;
          const saleCosts = salePrice * (sellingCosts / 100);
          const loanPayoff = exitYearEntry.loanBalance;
          netSaleProceeds = salePrice - saleCosts - loanPayoff;

          const cashflows = [-totalCashInvested];
          for (let i = 0; i < holdingLength -1; i++) {
              cashflows.push(proForma[i].cashFlowBeforeTax);
          }
          cashflows.push(proForma[holdingLength - 1].cashFlowBeforeTax + netSaleProceeds);
          
          unleveredIRR = calculateIRR(cashflows) * 100;

          const totalCashReturned = proForma.slice(0, holdingLength).reduce((sum, entry) => sum + entry.cashFlowBeforeTax, 0) + netSaleProceeds;
          equityMultiple = totalCashInvested > 0 ? totalCashReturned / totalCashInvested : 0;
      }
      
       // Sensitivity Analysis
      const sensitivityRanges = {
        vacancyRate: [-2, -1, 0, 1, 2],
        exitCapRate: [-0.5, -0.25, 0, 0.25, 0.5]
      };

      const sensitivityData = [];

      for(const vacancyModifier of sensitivityRanges.vacancyRate) {
        for(const capRateModifier of sensitivityRanges.exitCapRate) {
          const modifiedValues = {...watchedValues, vacancyRate: watchedValues.vacancyRate + vacancyModifier};
          const tempProForma = calculateProForma(modifiedValues);
          
          let tempIrr = NaN;
          let tempTotalCashFlow = 0;
          
          if(tempProForma.length >= holdingLength) {
            const exitEntry = tempProForma[holdingLength - 1];
            const exitNOI = exitEntry.noi * (1 + modifiedValues.annualIncomeGrowth / 100);
            const exitCap = (capRate/100) + (capRateModifier/100);
            const salePrice = exitNOI / exitCap;
            const saleCostsVal = salePrice * (modifiedValues.sellingCosts / 100);
            const proceeds = salePrice - saleCostsVal - exitEntry.loanBalance;

            const cashflows = [-totalCashInvested];
            for (let i = 0; i < holdingLength; i++) {
              cashflows.push(tempProForma[i].cashFlowBeforeTax);
            }
            cashflows[holdingLength] += proceeds - tempProForma[holdingLength -1].cashFlowBeforeTax; // add net proceeds to final cashflow
            
            tempIrr = calculateIRR(cashflows) * 100;
            tempTotalCashFlow = tempProForma.slice(0, holdingLength).reduce((sum, cf) => sum + cf.cashFlowBeforeTax, 0) + proceeds;
          }

          sensitivityData.push({
            id: `v${vacancyModifier}-c${capRateModifier}`,
            vacancy: `${modifiedValues.vacancyRate.toFixed(2)}%`,
            exitCap: `${((capRate) + capRateModifier).toFixed(2)}%`,
            irr: tempIrr,
            totalCashFlow: tempTotalCashFlow,
          });
        }
      }


      return {
          monthlyCashFlow, cocReturn, capRate, noi, chartData: cashFlowChartData, proFormaData: proForma,
          unleveredIRR, equityMultiple, netSaleProceeds, totalCashInvested,
          sensitivityData,
      };
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
            This multi-tab interface supports detailed, year-by-year cash flow analysis, value-add projects, complex financing, and more.
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
                            <CardHeader><CardTitle>Acquisition & Operating Expenses</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rehab & Initial Costs</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs (%)</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                </div>
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
                             <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <FormField name="holdingLength" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Holding Length (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualIncomeGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Income Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualExpenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="annualAppreciation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Appreciation</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Selling Costs</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="returns" className="mt-6">
                        <Card>
                            <CardHeader><CardTitle>Deal Returns & Profitability</CardTitle></CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-lg bg-muted">
                                        <p className="text-sm text-muted-foreground">Unlevered IRR</p>
                                        <p className="text-2xl font-bold">{unleveredIRR.toFixed(2)}%</p>
                                        <p className="text-xs text-muted-foreground">Internal Rate of Return</p>
                                    </div>
                                    <div className="p-4 rounded-lg bg-muted">
                                        <p className="text-sm text-muted-foreground">Equity Multiple</p>
                                        <p className="text-2xl font-bold">{equityMultiple.toFixed(2)}x</p>
                                        <p className="text-xs text-muted-foreground">Cash Invested vs. Returned</p>
                                    </div>
                                     <div className="p-4 rounded-lg bg-muted">
                                        <p className="text-sm text-muted-foreground">Total Cash Invested</p>
                                        <p className="text-xl font-bold">${totalCashInvested.toLocaleString()}</p>
                                    </div>
                                     <div className="p-4 rounded-lg bg-muted">
                                        <p className="text-sm text-muted-foreground">Net Sale Proceeds</p>
                                        <p className="text-xl font-bold">${netSaleProceeds.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Investor Waterfall</h4>
                                     <div className="flex flex-col items-center justify-center h-24 border-2 border-dashed rounded-lg bg-muted/20">
                                        <p className="text-sm text-muted-foreground">Investor waterfall modeling coming soon.</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                    <TabsContent value="sensitivity" className="mt-6">
                        <Card>
                            <CardHeader><CardTitle>Sensitivity Analysis</CardTitle><CardDescription>See how your returns change with different market assumptions.</CardDescription></CardHeader>
                            <CardContent>
                                <div className="border rounded-lg overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Vacancy</TableHead>
                                            <TableHead>Exit Cap Rate</TableHead>
                                            <TableHead className="text-right">IRR</TableHead>
                                            <TableHead className="text-right">Total Cash Flow</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sensitivityData.map(data => (
                                            <TableRow key={data.id} className={cn(data.vacancy === `${watchedValues.vacancyRate.toFixed(2)}%` && data.exitCap === `${capRate.toFixed(2)}%` && 'bg-primary/10')}>
                                                <TableCell>{data.vacancy}</TableCell>
                                                <TableCell>{data.exitCap}</TableCell>
                                                <TableCell className="text-right font-medium">{isNaN(data.irr) ? 'N/A' : `${data.irr.toFixed(2)}%`}</TableCell>
                                                <TableCell className="text-right">{data.totalCashFlow.toLocaleString('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: 0})}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                </div>
                            </CardContent>
                        </Card>
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
