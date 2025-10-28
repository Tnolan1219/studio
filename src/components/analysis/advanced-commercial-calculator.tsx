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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, DollarSign, BarChart2, TrendingUp, Handshake, Bot, TestTube2, Percent, Trash2, Plus, Info, Sparkles, SlidersHorizontal, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { InputWithIcon } from '../ui/input-with-icon';
import { Button } from '../ui/button';
import { useUser, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking, useDoc, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { Textarea } from '../ui/textarea';
import { ProFormaTable } from './pro-forma-table';
import type { ProFormaEntry, Deal, UserProfile } from '@/lib/types';
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
import { Label } from '../ui/label';

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
  exitCapRate: z.coerce.number().min(0).max(100),

  marketConditions: z.string().min(10, 'Please describe market conditions.'),
  isAdvanced: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;
type SensitivityVariable = 'vacancyRate' | 'purchasePrice' | 'annualIncomeGrowth' | 'exitCapRate' | 'interestRate' | 'downPayment';
type SensitivityMetric = 'irr' | 'equityMultiple' | 'cocReturn' | 'monthlyCashFlow' | 'capRate' | 'noi';


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
        if (Math.abs(df) < 1e-10) return NaN; // Avoid division by zero
        const x1 = x0 - f / df;
        if (Math.abs(x1 - x0) < tolerance) {
            return x1;
        }
        x0 = x1;
    }
    return NaN; // Failed to converge
}


const calculateProForma = (values: FormData, sensitivityOverrides: Partial<FormData> = {}): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    const combinedValues = { ...values, ...sensitivityOverrides };
    const {
        purchasePrice, rehabCost = 0, closingCosts = 0, downPayment, interestRate, loanTerm,
        unitMix, otherIncomes, operatingExpenses, vacancyRate,
        annualIncomeGrowth, annualExpenseGrowth, annualAppreciation
    } = combinedValues;

    if (!purchasePrice || !downPayment || !loanTerm) return [];

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

interface AdvancedCommercialCalculatorProps {
    deal?: Deal;
    onSave?: () => void;
    onCancel?: () => void;
    dealCount?: number;
}

export default function AdvancedCommercialCalculator({ deal, onSave, onCancel, dealCount = 0 }: AdvancedCommercialCalculatorProps) {
    
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

  const [isAIPending, startAITransition] = useTransition();
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
  const [sensitivityVar1, setSensitivityVar1] = useState<SensitivityVariable>('exitCapRate');
  const [sensitivityVar2, setSensitivityVar2] = useState<SensitivityVariable>('annualIncomeGrowth');
  const [sensitivityMetric, setSensitivityMetric] = useState<SensitivityMetric>('irr');
  const isEditMode = !!deal;


   const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode ? deal : {
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
      exitCapRate: 5.5,
      marketConditions: 'Analyze this deal using advanced metrics. Consider value-add opportunities by renovating 10 units in Year 2 for a 20% rent premium. What would the IRR and Equity Multiple be over a 10 year hold?',
      isAdvanced: true,
    },
  });

  useEffect(() => {
    if (isEditMode) {
      form.reset(deal);
    }
  }, [deal, isEditMode, form]);

  const { fields: unitMixFields, append: appendUnit, remove: removeUnit } = useFieldArray({
    control: form.control,
    name: 'unitMix',
  });

  const handleGenerateInsights = () => {
    // AI feature disabled
  };

  const watchedValues = form.watch();

  const {
    monthlyCashFlow, cocReturn, capRate, noi, chartData, proFormaData,
    unleveredIRR, equityMultiple, netSaleProceeds, totalCashInvested,
    sensitivityData
  } = useMemo(() => {
      const { purchasePrice, downPayment, rehabCost = 0, closingCosts = 0, holdingLength, sellingCosts, exitCapRate } = watchedValues;
      const totalCashInvested = downPayment + (purchasePrice * (closingCosts / 100)) + rehabCost;
      const proForma = calculateProForma(watchedValues);
      
      const year1 = proForma[0] || {};
      const noi = year1.noi || 0;
      const monthlyCashFlow = (year1.cashFlowBeforeTax || 0) / 12;
      const cocReturn = totalCashInvested > 0 ? ((year1.cashFlowBeforeTax || 0) / totalCashInvested) * 100 : 0;
      const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;

      const cashFlowChartData = proForma.slice(0, 10).map(entry => ({
          year: `Year ${entry.year}`,
          cashFlow: parseFloat(entry.cashFlowBeforeTax.toFixed(2))
      }));

      // Advanced metrics calculation
      let unleveredIRR = NaN;
      let equityMultiple = 0;
      let netSaleProceeds = 0;

      if (proForma.length >= holdingLength) {
          const exitYearEntry = proForma[holdingLength - 1];
          const exitNOI = exitYearEntry.noi * (1 + watchedValues.annualIncomeGrowth/100);
          
          const salePrice = exitCapRate > 0 ? exitNOI / (exitCapRate / 100) : 0;
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
      
        const SENSITIVITY_RANGES: Record<SensitivityVariable, number[] | ((v: number) => number[])> = {
            purchasePrice: (v: number) => [v * -0.1, v * -0.05, 0, v * 0.05, v * 0.1].map(mod => v + mod),
            downPayment: (v: number) => [v * -0.1, v * -0.05, 0, v * 0.05, v * 0.1].map(mod => v + mod),
            vacancyRate: [-2, -1, 0, 1, 2].map(mod => watchedValues.vacancyRate + mod),
            annualIncomeGrowth: [-1, -0.5, 0, 0.5, 1].map(mod => watchedValues.annualIncomeGrowth + mod),
            exitCapRate: [-0.5, -0.25, 0, 0.25, 0.5].map(mod => watchedValues.exitCapRate + mod),
            interestRate: [-1, -0.5, 0, 0.5, 1].map(mod => watchedValues.interestRate + mod),
        };

        const getRange = (variable: SensitivityVariable) => {
            const rangeOrFn = SENSITIVITY_RANGES[variable];
            if (typeof rangeOrFn === 'function') {
                return rangeOrFn(watchedValues[variable] || 0);
            }
            return rangeOrFn;
        };
        
        const var1Range = getRange(sensitivityVar1);
        const var2Range = getRange(sensitivityVar2);

        const tableData = var1Range.map(val1 => {
            const row: Record<string, any> = {};
            var2Range.forEach(val2 => {
                const overrides: Partial<FormData> = {
                    [sensitivityVar1]: val1,
                    [sensitivityVar2]: val2,
                };
                
                const tempProForma = calculateProForma(watchedValues, overrides);
                
                const tempWatched = {...watchedValues, ...overrides};
                const tInvestment = (tempWatched.downPayment) + (tempWatched.purchasePrice * (tempWatched.closingCosts/100)) + (tempWatched.rehabCost);

                const y1 = tempProForma[0] || {};
                const mCashFlow = (y1.cashFlowBeforeTax || 0) / 12;
                const cReturn = tInvestment > 0 ? ((y1.cashFlowBeforeTax || 0) / tInvestment) * 100 : 0;
                const calculatedNOI = y1.noi || 0;
                const calculatedCapRate = tempWatched.purchasePrice > 0 ? (calculatedNOI / tempWatched.purchasePrice) * 100 : 0;

                let eMultiple = 0;
                let irr = NaN;

                if (tempProForma.length >= tempWatched.holdingLength) {
                    const exitEntry = tempProForma[tempWatched.holdingLength - 1];
                    const exitNOI = exitEntry.noi * (1 + tempWatched.annualIncomeGrowth / 100);
                    const exitCap = tempWatched.exitCapRate / 100;

                    const sPrice = exitCap > 0 ? exitNOI / exitCap : 0;
                    const sCosts = sPrice * (tempWatched.sellingCosts / 100);
                    const proceeds = sPrice - sCosts - exitEntry.loanBalance;

                    const cashflows = [-tInvestment];
                    for (let i = 0; i < tempWatched.holdingLength - 1; i++) cashflows.push(tempProForma[i].cashFlowBeforeTax);
                    cashflows.push(tempProForma[tempWatched.holdingLength - 1].cashFlowBeforeTax + proceeds);
                    
                    irr = calculateIRR(cashflows) * 100;
                    const totalReturned = tempProForma.slice(0, tempWatched.holdingLength).reduce((s, e) => s + e.cashFlowBeforeTax, 0) + proceeds;
                    eMultiple = tInvestment > 0 ? totalReturned / tInvestment : 0;
                }

                let outputValue: number;
                switch(sensitivityMetric) {
                    case 'irr': outputValue = irr; break;
                    case 'equityMultiple': outputValue = eMultiple; break;
                    case 'cocReturn': outputValue = cReturn; break;
                    case 'monthlyCashFlow': outputValue = mCashFlow; break;
                    case 'capRate': outputValue = calculatedCapRate; break;
                    case 'noi': outputValue = calculatedNOI; break;
                    default: outputValue = NaN;
                }
                
                row[val2] = outputValue;
            });
            row.label = val1;
            return row;
        });

      return {
          monthlyCashFlow, cocReturn, capRate, noi, chartData: cashFlowChartData, proFormaData: proForma,
          unleveredIRR, equityMultiple, netSaleProceeds, totalCashInvested,
          sensitivityData: { tableData, var1Range, var2Range },
      };
  }, [watchedValues, sensitivityVar1, sensitivityVar2, sensitivityMetric]);

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
    const dealId = isEditMode && deal ? deal.id : doc(collection(firestore, `users/${user.uid}/deals`)).id;

    const dealData = {
      ...formValues,
      id: dealId,
      dealType: 'Commercial Multifamily' as const,
      monthlyCashFlow: parseFloat(monthlyCashFlow.toFixed(2)),
      cocReturn: parseFloat(cocReturn.toFixed(2)),
      noi: parseFloat(noi.toFixed(2)),
      capRate: parseFloat(capRate.toFixed(2)),
      roi: parseFloat(unleveredIRR.toFixed(2)),
      netProfit: parseFloat(netSaleProceeds.toFixed(2)),
      userId: user.uid,
      createdAt: isEditMode ? deal.createdAt : serverTimestamp(),
      status: isEditMode ? deal.status : 'In Works',
      isPublished: isEditMode ? deal.isPublished : false,
      isAdvanced: true,
    };
    
    const dealRef = doc(firestore, `users/${user.uid}/deals`, dealId);
    
    if (isEditMode) {
        setDocumentNonBlocking(dealRef, dealData, { merge: true });
        toast({ title: 'Changes Saved', description: `${dealData.dealName} has been updated.` });
        if (onSave) onSave();
    } else {
        setDocumentNonBlocking(dealRef, dealData, { merge: true });
        toast({ title: 'Deal Saved!', description: `${dealData.dealName} has been added to your portfolio.` });
        form.reset();
    }
    setIsSaving(false);
  };
  
    const SENSITIVITY_OPTIONS: { value: SensitivityVariable, label: string, format: (v: number) => string }[] = [
        { value: 'exitCapRate', label: 'Exit Cap Rate', format: v => `${v.toFixed(2)}%` },
        { value: 'annualIncomeGrowth', label: 'Rent Growth', format: v => `${v.toFixed(1)}%` },
        { value: 'vacancyRate', label: 'Vacancy Rate', format: v => `${v.toFixed(1)}%` },
        { value: 'purchasePrice', label: 'Purchase Price', format: v => `$${(v/1000).toFixed(0)}k` },
        { value: 'interestRate', label: 'Interest Rate', format: v => `${v.toFixed(2)}%` },
        { value: 'downPayment', label: 'Down Payment', format: v => `$${(v/1000).toFixed(0)}k` },
    ];

    const METRIC_OPTIONS: { value: SensitivityMetric, label: string, format: (v: number) => string }[] = [
        { value: 'irr', label: 'IRR', format: v => isNaN(v) ? 'N/A' : `${v.toFixed(2)}%` },
        { value: 'equityMultiple', label: 'Equity Multiple', format: v => isNaN(v) ? 'N/A' : `${v.toFixed(2)}x` },
        { value: 'cocReturn', label: 'CoC Return (Y1)', format: v => isNaN(v) ? 'N/A' : `${v.toFixed(2)}%` },
        { value: 'monthlyCashFlow', label: 'Cash Flow (Y1, Monthly)', format: v => isNaN(v) ? 'N/A' : `$${v.toFixed(0)}` },
        { value: 'capRate', label: 'Cap Rate (Y1)', format: v => isNaN(v) ? 'N/A' : `${v.toFixed(2)}%` },
        { value: 'noi', label: 'NOI (Y1)', format: v => isNaN(v) ? 'N/A' : `$${v.toLocaleString(undefined, {maximumFractionDigits: 0})}` },
    ];
    
    const selectedMetric = METRIC_OPTIONS.find(m => m.value === sensitivityMetric);
    const allValues = sensitivityData.tableData.flatMap(row => Object.values(row).filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v))) as number[];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    
    const getColor = (value: number) => {
        if (isNaN(value) || !isFinite(value)) return 'bg-muted/20 text-muted-foreground';
        const range = max - min;
        if (range === 0) return 'bg-blue-500/20 text-blue-200'; // Neutral color if all values are the same
        const normalized = (value - min) / range;
        
        if (normalized > 0.66) return 'bg-green-500/20 text-green-200';
        if (normalized > 0.33) return 'bg-yellow-500/20 text-yellow-200';
        return 'bg-red-500/20 text-red-200';
    };


  return (
    <CardContent>
        <p className="text-center text-sm text-muted-foreground mb-4">
            This multi-tab interface supports detailed, year-by-year cash flow analysis, value-add projects, complex financing, and more.
        </p>
        <Form {...form}>
            <form>
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
                                <FormField name="exitCapRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Exit Cap Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
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
                            <CardHeader>
                                <CardTitle>Sensitivity Analysis</CardTitle>
                                <CardDescription>See how your returns change with different market assumptions.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-col md:flex-row gap-4 mb-6">
                                    <div className="flex-1 space-y-2">
                                        <Label>Vertical Axis (Rows)</Label>
                                        <Select value={sensitivityVar1} onValueChange={(v) => setSensitivityVar1(v as SensitivityVariable)}>
                                            <SelectTrigger><SelectValue placeholder="Select Variable" /></SelectTrigger>
                                            <SelectContent>
                                                {SENSITIVITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} disabled={opt.value === sensitivityVar2}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                     <div className="flex-1 space-y-2">
                                        <Label>Horizontal Axis (Columns)</Label>
                                        <Select value={sensitivityVar2} onValueChange={(v) => setSensitivityVar2(v as SensitivityVariable)}>
                                            <SelectTrigger><SelectValue placeholder="Select Variable" /></SelectTrigger>
                                            <SelectContent>
                                                {SENSITIVITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} disabled={opt.value === sensitivityVar1}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Label>Output Metric</Label>
                                        <Select value={sensitivityMetric} onValueChange={(v) => setSensitivityMetric(v as SensitivityMetric)}>
                                            <SelectTrigger><SelectValue placeholder="Select Metric" /></SelectTrigger>
                                            <SelectContent>
                                                {METRIC_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[150px] font-bold">{SENSITIVITY_OPTIONS.find(o => o.value === sensitivityVar1)?.label}</TableHead>
                                            {sensitivityData.var2Range.map((val, i) => (
                                                <TableHead key={i} className="text-center font-bold">{SENSITIVITY_OPTIONS.find(o => o.value === sensitivityVar2)?.format(val)}</TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sensitivityData.tableData.map((row, rowIndex) => (
                                            <TableRow key={rowIndex}>
                                                <TableCell className="font-medium">{SENSITIVITY_OPTIONS.find(o => o.value === sensitivityVar1)?.format(row.label)}</TableCell>
                                                {Object.keys(row).filter(k => k !== 'label').map((key, colIndex) => {
                                                    const isCenter = rowIndex === 2 && colIndex === 2;
                                                    return (
                                                        <TableCell key={colIndex} className={cn("text-center font-mono text-xs", getColor(row[key]), isCenter && 'ring-2 ring-primary ring-inset')}>
                                                            {selectedMetric ? selectedMetric.format(row[key]) : 'N/A'}
                                                        </TableCell>
                                                    );
                                                })}
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
                                <p className="text-sm text-muted-foreground mt-4"> AI Deal Assessment is coming soon. </p>
                            </CardContent>
                             <CardFooter>
                                <Button disabled className="w-full">
                                    Generate AI Insights
                                </Button>
                            </CardFooter>
                        </Card>
                    </TabsContent>

                </Tabs>
                <CardFooter className="flex justify-end gap-2 mt-6">
                    {isEditMode && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
                    <Button type="button" variant="secondary" onClick={handleSaveDeal} disabled={isAIPending || isSaving}> 
                        {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEditMode ? 'Save Changes' : 'Save Deal')} 
                    </Button>
                </CardFooter>
            </form>
        </Form>
    </CardContent>
  );
}
