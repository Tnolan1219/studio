
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
import { Building, DollarSign, BarChart2, TrendingUp, Handshake, Bot, TestTube2, Percent, Trash2, Plus, Info, Sparkles, SlidersHorizontal, Loader2, PiggyBank, Scale, FileText, Banknote } from 'lucide-react';
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
  AreaChart,
  Area,
  Line,
  LineChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Label } from '../ui/label';

const unitMixSchema = z.object({
  type: z.string().min(1, "Unit type is required"),
  count: z.coerce.number().min(0),
  sqft: z.coerce.number().min(0).optional(),
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
  amortizationPeriod: z.coerce.number().int().min(1),
  interestOnlyPeriod: z.coerce.number().int().min(0),


  // Projections
  annualIncomeGrowth: z.coerce.number().min(0).max(100),
  annualExpenseGrowth: z.coerce.number().min(0).max(100),
  annualAppreciation: z.coerce.number().min(0).max(100),
  sellingCosts: z.coerce.number().min(0).max(100),
  holdingLength: z.coerce.number().int().min(1).max(30),
  exitCapRate: z.coerce.number().min(0).max(100),

  // Partnership
  preferredReturn: z.coerce.number().min(0).max(100),
  promoteHurdle: z.coerce.number().min(0).max(100),
  promoteSplit: z.coerce.number().min(0).max(100),

  marketConditions: z.string().optional(),
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
        purchasePrice, rehabCost = 0, closingCosts = 0, downPayment, interestRate, loanTerm, amortizationPeriod, interestOnlyPeriod,
        unitMix, otherIncomes, operatingExpenses, vacancyRate,
        annualIncomeGrowth, annualExpenseGrowth, annualAppreciation
    } = combinedValues;

    if (!purchasePrice || !downPayment || !amortizationPeriod) return [];

    const loanAmount = purchasePrice - downPayment;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = amortizationPeriod * 12;
    
    // Calculate P&I payment based on amortization period
    const principalAndInterestPayment = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1)
        : 0;

    let currentGrossRent = unitMix.reduce((acc: number, unit: { count: number; rent: number; }) => acc + (unit.count * unit.rent * 12), 0);
    const monthlyOtherIncome = otherIncomes.reduce((acc: number, item: { amount: number; }) => acc + item.amount, 0);
    let currentOtherIncome = monthlyOtherIncome * 12;

    let currentOpEx = operatingExpenses.reduce((acc, item) => acc + item.amount, 0) * 12;

    let currentPropertyValue = purchasePrice + rehabCost;
    let currentLoanBalance = loanAmount;
    
    for (let year = 1; year <= Math.max(values.holdingLength, 10); year++) {
        let annualDebtService = 0;
        let yearEndLoanBalance = currentLoanBalance;

        for (let month = 1; month <= 12; month++) {
            const currentMonthInLoan = (year - 1) * 12 + month;
            const interestPayment = yearEndLoanBalance * monthlyInterestRate;

            if (currentMonthInLoan <= interestOnlyPeriod * 12) {
                annualDebtService += interestPayment;
                // No principal reduction during I/O period
            } else {
                const principalPayment = principalAndInterestPayment - interestPayment;
                annualDebtService += principalAndInterestPayment;
                yearEndLoanBalance -= principalPayment;
            }
        }
        
        const grossPotentialRent = currentGrossRent + currentOtherIncome;
        const vacancyLoss = grossPotentialRent * (vacancyRate / 100);
        const effectiveGrossIncome = grossPotentialRent - vacancyLoss;
        const noi = effectiveGrossIncome - currentOpEx;

        proForma.push({
            year,
            grossPotentialRent: grossPotentialRent,
            vacancyLoss,
            effectiveGrossIncome,
            operatingExpenses: currentOpEx,
            noi,
            debtService: annualDebtService,
            cashFlowBeforeTax: noi - annualDebtService,
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

const ANALYSIS_TABS = [
    { value: 'overview', label: 'Overview', icon: FileText },
    { value: 'income', label: 'Income', icon: Banknote },
    { value: 'expenses', label: 'Expenses', icon: PiggyBank },
    { value: 'financing', label: 'Financing', icon: Scale },
    { value: 'return-analysis', label: 'Return Analysis', icon: Handshake },
];

const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
    return `$${value.toFixed(0)}`;
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];


export default function AdvancedCommercialCalculator({ deal, onSave, onCancel, dealCount = 0 }: AdvancedCommercialCalculatorProps) {
    
  const [activeTab, setActiveTab] = useState('assumptions');

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
    defaultValues: isEditMode && deal?.isAdvanced ? deal : {
      dealName: 'Advanced Commercial Center',
      // Acquisition
      purchasePrice: 5000000,
      closingCosts: 2,
      rehabCost: 250000,
      // Income
      unitMix: [
        { type: 'Studio', count: 10, rent: 1200, sqft: 500 },
        { type: '1BR', count: 20, rent: 1600, sqft: 750 },
        { type: '2BR', count: 10, rent: 2200, sqft: 1000 },
      ],
      otherIncomes: [{name: 'Laundry', amount: 500}],
      vacancyRate: 5,
      // Expenses
      operatingExpenses: [
        {name: 'Property Taxes', amount: 4000},
        {name: 'Insurance', amount: 1500},
        {name: 'Repairs & Maintenance', amount: 2500},
        {name: 'Management Fee', amount: 3500},
      ],
      // Financing
      downPayment: 1250000,
      interestRate: 7.5,
      loanTerm: 10,
      amortizationPeriod: 30,
      interestOnlyPeriod: 2,
      // Projections
      annualIncomeGrowth: 3,
      annualExpenseGrowth: 2,
      annualAppreciation: 4,
      holdingLength: 10,
      sellingCosts: 5,
      exitCapRate: 5.5,
       // Partnership
      preferredReturn: 8,
      promoteHurdle: 15,
      promoteSplit: 30,
      // Meta
      marketConditions: 'Analyze this deal using advanced metrics. Consider value-add opportunities by renovating 10 units in Year 2 for a 20% rent premium. What would the IRR and Equity Multiple be over a 10 year hold?',
      isAdvanced: true,
    },
  });

  useEffect(() => {
    if (isEditMode && deal?.isAdvanced) {
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
    sensitivityData, lpReturns, gpReturns,
    incomeBreakdownData, expenseBreakdownData
  } = useMemo(() => {
      const { purchasePrice, downPayment, rehabCost = 0, closingCosts = 0, holdingLength, sellingCosts, exitCapRate, preferredReturn, promoteHurdle, promoteSplit, unitMix, otherIncomes, operatingExpenses } = watchedValues;
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
      
      const incomeBreakdownData = [
          ...unitMix.map(u => ({ name: `${u.type} Rent`, value: u.count * u.rent })),
          ...otherIncomes.map(i => ({ name: i.name, value: i.amount }))
      ].filter(item => item.value > 0);

      const expenseBreakdownData = [...operatingExpenses.map(e => ({ name: e.name, value: e.amount }))].filter(item => item.value > 0);


      // Advanced metrics calculation
      let unleveredIRR = NaN;
      let equityMultiple = 0;
      let netSaleProceeds = 0;

      let lpCashFlows: number[] = [-totalCashInvested];
      let gpCashFlows: number[] = [0]; // GP has 0 initial investment in this simple model

      if (proForma.length >= holdingLength) {
          // --- Overall Deal Returns ---
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

          // --- Waterfall Calculation ---
          let lpCapitalAccount = totalCashInvested;
          for (let i = 0; i < holdingLength; i++) {
              const yearCF = proForma[i].cashFlowBeforeTax + (i === holdingLength - 1 ? netSaleProceeds : 0);
              
              const prefPayment = Math.min(yearCF, lpCapitalAccount * (preferredReturn / 100));
              let lpPref = prefPayment;
              let gpPref = 0;

              const remainingCfAfterPref = yearCF - prefPayment;
              
              const returnOfCapital = Math.min(remainingCfAfterPref, lpCapitalAccount);
              lpCapitalAccount -= returnOfCapital;
              lpPref += returnOfCapital;

              const remainingCfForSplit = remainingCfAfterPref - returnOfCapital;

              const dealIRRForHurdle = calculateIRR([-totalCashInvested, ...lpCashFlows.slice(1).map((cf, idx) => cf + (gpCashFlows[idx+1] || 0)), yearCF], 0.1) * 100;
              let lpSplit, gpSplit;
              
              if (dealIRRForHurdle > promoteHurdle) {
                  lpSplit = remainingCfForSplit * (1 - (promoteSplit / 100));
                  gpSplit = remainingCfForSplit * (promoteSplit / 100);
              } else {
                  lpSplit = remainingCfForSplit;
                  gpSplit = 0;
              }

              lpCashFlows.push(lpPref + lpSplit);
              gpCashFlows.push(gpPref + gpSplit);
          }
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
          lpReturns: {
              irr: calculateIRR(lpCashFlows) * 100,
              equityMultiple: totalCashInvested > 0 ? lpCashFlows.reduce((a, b) => a + b, 0) / totalCashInvested : 0,
          },
          gpReturns: {
              irr: gpCashFlows.reduce((a, b) => a + b, 0) > 0 ? calculateIRR(gpCashFlows) * 100 : Infinity, // Can be infinite if no GP investment
              equityMultiple: gpCashFlows.reduce((a, b) => a + b, 0),
          },
          incomeBreakdownData,
          expenseBreakdownData,
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
      createdAt: isEditMode && deal.createdAt ? deal.createdAt : serverTimestamp(),
      status: isEditMode && deal.status ? deal.status : 'In Works',
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

    const firstYearProForma = proFormaData[0] || {};
    const dscr = firstYearProForma.debtService > 0 ? (firstYearProForma.noi / firstYearProForma.debtService) : Infinity;

    const getReturnColor = (value: number, type: 'irr' | 'em') => {
        if (isNaN(value)) return 'text-muted-foreground';
        if (type === 'irr') {
            if (value >= 15) return 'text-success';
            if (value >= 8) return 'text-yellow-500';
            return 'text-destructive';
        }
        if (type === 'em') {
            if (value >= 2.2) return 'text-success';
            if (value >= 1.8) return 'text-yellow-500';
            return 'text-destructive';
        }
        return 'text-foreground';
    };


    return (
        <Card className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
                <CardTitle className="font-headline">{isEditMode ? `Editing: ${deal.dealName}` : 'Advanced Commercial Analyzer'}</CardTitle>
                <CardDescription>A professional underwriting suite for institutional-grade analysis.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form>
                        <div className="p-4 rounded-lg bg-primary/10 border border-primary/20 grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 shadow-[0_0_15px_hsl(var(--primary)/0.5)]">
                            <div className="text-center"> <p className="text-sm text-primary/80 font-headline">IRR</p> <p className="text-2xl font-bold text-primary">{unleveredIRR.toFixed(2)}%</p></div>
                            <div className="text-center"> <p className="text-sm text-primary/80 font-headline">Equity Multiple</p> <p className="text-2xl font-bold text-primary">{equityMultiple.toFixed(2)}x</p></div>
                            <div className="text-center"> <p className="text-sm text-primary/80 font-headline">Cap Rate (Y1)</p> <p className="text-2xl font-bold text-primary">{capRate.toFixed(2)}%</p></div>
                            <div className="text-center"> <p className="text-sm text-primary/80 font-headline">NOI (Y1)</p> <p className="text-2xl font-bold text-primary">${noi.toLocaleString(undefined, {maximumFractionDigits: 0})}</p></div>
                        </div>
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 lg:grid-cols-6 h-auto">
                            <TabsTrigger value="assumptions" className={cn("flex-col h-14")}>
                                    <TestTube2 className="w-5 h-5 mb-1" />
                                    <span>Assumptions</span>
                            </TabsTrigger>
                            {ANALYSIS_TABS.map(tab => (
                                    <TabsTrigger key={tab.value} value={tab.value} className={cn("flex-col h-14")} disabled={proFormaData.length === 0}>
                                        <tab.icon className="w-5 h-5 mb-1" />
                                        <span>{tab.label}</span>
                                    </TabsTrigger>
                                ))}
                            </TabsList>

                            <TabsContent value="assumptions" className="mt-6">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        <Card className="border-primary/20">
                                            <CardHeader><CardTitle className="font-headline text-primary">Acquisition & Rehab</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <div className="grid grid-cols-2 gap-4">
                                                    <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                    <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs (%)</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                </div>
                                                <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rehab & Initial Costs</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                            </CardContent>
                                        </Card>
                                        <Card className="border-primary/20">
                                            <CardHeader><CardTitle className="font-headline text-primary">Financing</CardTitle></CardHeader>
                                            <CardContent className="grid grid-cols-2 gap-4">
                                                <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="amortizationPeriod" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Amortization (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="interestOnlyPeriod" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Interest-Only Period (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                            </CardContent>
                                        </Card>
                                        <Card className="border-primary/20">
                                            <CardHeader>
                                                <CardTitle className="font-headline text-primary">Partnership & Equity Structure</CardTitle>
                                                <CardDescription>Model a 2-tier LP/GP waterfall distribution.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-3 gap-4">
                                                <FormField name="preferredReturn" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Preferred Return</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl><FormDescription className="text-xs">LP's "Pref"</FormDescription> <FormMessage /> </FormItem> )} />
                                                <FormField name="promoteHurdle" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>IRR Hurdle</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl><FormDescription className="text-xs">IRR Hurdle</FormDescription> <FormMessage /> </FormItem> )} />
                                                <FormField name="promoteSplit" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Promote Split</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl><FormDescription className="text-xs">GP % above hurdle</FormDescription> <FormMessage /> </FormItem> )} />
                                            </CardContent>
                                        </Card>
                                    </div>
                                    <div className="space-y-6">
                                        <Card className="border-primary/20">
                                            <CardHeader><CardTitle className="font-headline text-primary">Income</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <div>
                                                    <FormLabel>Unit Mix</FormLabel>
                                                    <FormDescription className="text-xs">Define the number of units and average rent for each type.</FormDescription>
                                                    {unitMixFields.map((field, index) => (
                                                        <div key={field.id} className="grid grid-cols-[1fr,1fr,1fr,1fr,auto] gap-2 items-end mt-2">
                                                        <FormField control={form.control} name={`unitMix.${index}.type`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Type</FormLabel><FormControl><Input placeholder="e.g., 2BR" {...field} /></FormControl> </FormItem> )} />
                                                        <FormField control={form.control} name={`unitMix.${index}.count`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs"># Units</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
                                                        <FormField control={form.control} name={`unitMix.${index}.sqft`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Sq.Ft.</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
                                                        <FormField control={form.control} name={`unitMix.${index}.rent`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Avg. Rent</FormLabel><FormControl><InputWithIcon icon={<DollarSign size={14}/>} type="number" {...field} /></FormControl> </FormItem> )} />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeUnit(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                                        </div>
                                                    ))}
                                                    <Button type="button" size="sm" variant="outline" onClick={() => appendUnit({type: '', count: 0, rent: 0, sqft: 0})} className="mt-2 flex items-center gap-1"><Plus size={16}/> Add Unit Type</Button>
                                                </div>
                                                <LineItemInput control={form.control} name="otherIncomes" formLabel="Other Income" fieldLabel="Income Source" placeholder="e.g., Laundry, Parking" icon={<DollarSign size={14}/>} />
                                            </CardContent>
                                        </Card>
                                        <Card className="border-primary/20">
                                            <CardHeader><CardTitle className="font-headline text-primary">Operating Expenses</CardTitle></CardHeader>
                                            <CardContent className="space-y-4">
                                                <LineItemInput control={form.control} name="operatingExpenses" formLabel="Recurring Monthly Expenses" fieldLabel="Expense Item" placeholder="e.g., Property Tax, Insurance" icon={<DollarSign size={14}/>} />
                                                <FormField name="vacancyRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                            </CardContent>
                                        </Card>
                                         <Card className="border-primary/20">
                                            <CardHeader><CardTitle className="font-headline text-primary">Projections & Exit</CardTitle></CardHeader>
                                            <CardContent className="grid grid-cols-3 gap-4">
                                                <FormField name="holdingLength" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Hold (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="annualIncomeGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Income Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="annualExpenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="annualAppreciation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Appreciation</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Selling Costs</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                                <FormField name="exitCapRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Exit Cap Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                                            </CardContent>
                                        </Card>
                                    </div>
                                </div>
                            </TabsContent>
                            
                            <TabsContent value="overview" className="mt-6 space-y-6">
                                {proFormaData.length > 0 ? (
                                    <>
                                        <ProFormaTable data={proFormaData} />
                                    </>
                                ) : (
                                    <p className="text-center text-muted-foreground p-8">Run an analysis from the Assumptions tab to see the pro forma.</p>
                                )}
                            </TabsContent>

                            <TabsContent value="income" className="mt-6">
                                {proFormaData.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                        <CardHeader>
                                            <CardTitle className='font-headline'>Income Growth Analysis</CardTitle>
                                            <CardDescription>Visualizing revenue streams and growth over the holding period.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className='h-[400px] w-full'>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={proFormaData} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="year" tickFormatter={(v) => `Year ${v}`} />
                                                        <YAxis tickFormatter={formatCurrency}/>
                                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={formatCurrency} />
                                                        <Legend />
                                                        <Line type="monotone" dataKey="grossPotentialRent" name="Gross Potential Rent" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                                                        <Line type="monotone" dataKey="effectiveGrossIncome" name="Effective Gross Income" stroke="hsl(var(--primary))" strokeWidth={2} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className='font-headline'>Monthly Income Breakdown (Year 1)</CardTitle>
                                        <CardDescription>Sources of gross monthly income.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className='h-[400px] w-full'>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={incomeBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label>
                                                        {incomeBreakdownData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={formatCurrency} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                                </div>
                                ) : null}
                            </TabsContent>

                            <TabsContent value="expenses" className="mt-6">
                                {proFormaData.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                        <CardHeader>
                                            <CardTitle className='font-headline'>Expense Growth Analysis</CardTitle>
                                            <CardDescription>Breakdown of operating expenses and debt service over time.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className='h-[350px] w-full'>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <RechartsBarChart data={proFormaData} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="year" tickFormatter={(v) => `Year ${v}`} />
                                                        <YAxis tickFormatter={formatCurrency} />
                                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={formatCurrency} />
                                                        <Legend />
                                                        <RechartsBar dataKey="operatingExpenses" stackId="a" name="Operating Expenses" fill="hsl(var(--chart-3))" />
                                                        <RechartsBar dataKey="debtService" stackId="a" name="Debt Service" fill="hsl(var(--chart-5))" />
                                                    </RechartsBarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                </Card>
                                <Card>
                                    <CardHeader>
                                        <CardTitle className='font-headline'>Monthly Expense Breakdown (Year 1)</CardTitle>
                                        <CardDescription>Composition of monthly operating expenses.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className='h-[350px] w-full'>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={expenseBreakdownData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                                         {expenseBreakdownData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={formatCurrency} />
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </CardContent>
                                </Card>
                                </div>
                                ) : null}
                            </TabsContent>
                            
                            <TabsContent value="financing" className="mt-6">
                                {proFormaData.length > 0 ? (
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className='font-headline'>Amortization & Equity</CardTitle>
                                            <CardDescription>Growth of equity versus the loan balance over time.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className='h-[350px] w-full'>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <LineChart data={proFormaData} margin={{ top: 10, right: 30, left: 30, bottom: 0 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="year" tickFormatter={(v) => `Year ${v}`} />
                                                        <YAxis tickFormatter={formatCurrency} />
                                                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))' }} formatter={formatCurrency} />
                                                        <Legend />
                                                        <Line type="monotone" dataKey="equity" name="Total Equity" stroke="hsl(var(--primary))" strokeWidth={2} />
                                                        <Line type="monotone" dataKey="loanBalance" name="Loan Balance" stroke="hsl(var(--destructive))" strokeWidth={2} />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className='font-headline'>Debt Service Coverage Ratio (DSCR)</CardTitle>
                                            <CardDescription>A key metric for lenders, showing the ability to cover debt payments.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className='text-center p-4 rounded-lg bg-muted'>
                                                <p className="text-sm text-muted-foreground">Year 1 DSCR</p>
                                                <p className="text-4xl font-bold">{dscr.toFixed(2)}x</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    (Lenders typically require {'>'} 1.25x)
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                                ) : null}
                            </TabsContent>

                            <TabsContent value="return-analysis" className="mt-6">
                                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                                    <Card className='lg:col-span-1'>
                                        <CardHeader><CardTitle className="font-headline">Overall Deal Returns</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="p-3 rounded-lg bg-muted">
                                                <p className="text-sm text-muted-foreground">Unlevered IRR</p>
                                                <p className={cn("text-xl font-bold", getReturnColor(unleveredIRR, 'irr'))}>{unleveredIRR.toFixed(2)}%</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted">
                                                <p className="text-sm text-muted-foreground">Equity Multiple</p>
                                                <p className={cn("text-xl font-bold", getReturnColor(equityMultiple, 'em'))}>{equityMultiple.toFixed(2)}x</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted">
                                                <p className="text-sm text-muted-foreground">Total Cash Invested</p>
                                                <p className="text-lg font-bold">${totalCashInvested.toLocaleString()}</p>
                                            </div>
                                            <div className="p-3 rounded-lg bg-muted">
                                                <p className="text-sm text-muted-foreground">Net Sale Proceeds</p>
                                                <p className="text-lg font-bold">${netSaleProceeds.toLocaleString()}</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                     <Card className='lg:col-span-1'>
                                        <CardHeader><CardTitle className="font-headline">Partnership Returns</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <p className="font-semibold">Limited Partner (LP)</p>
                                                <div className="p-3 mt-1 rounded-lg bg-blue-500/10">
                                                    <p className="text-sm text-blue-400">IRR</p>
                                                    <p className={cn("text-xl font-bold", getReturnColor(lpReturns.irr, 'irr'))}>{lpReturns.irr.toFixed(2)}%</p>
                                                </div>
                                                 <div className="p-3 mt-2 rounded-lg bg-blue-500/10">
                                                    <p className="text-sm text-blue-400">Equity Multiple</p>
                                                    <p className={cn("text-xl font-bold", getReturnColor(lpReturns.equityMultiple, 'em'))}>{lpReturns.equityMultiple.toFixed(2)}x</p>
                                                </div>
                                            </div>
                                             <div>
                                                <p className="font-semibold">General Partner (GP)</p>
                                                <div className="p-3 mt-1 rounded-lg bg-green-500/10">
                                                    <p className="text-sm text-green-400">IRR</p>
                                                    <p className={cn("text-xl font-bold", getReturnColor(gpReturns.irr, 'irr'))}>{isFinite(gpReturns.irr) ? `${gpReturns.irr.toFixed(2)}%` : 'N/A'}</p>
                                                </div>
                                                 <div className="p-3 mt-2 rounded-lg bg-green-500/10">
                                                    <p className="text-sm text-green-400">Total Profit</p>
                                                    <p className="text-xl font-bold text-green-300">${gpReturns.equityMultiple.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className='lg:col-span-1'>
                                        <CardHeader>
                                            <CardTitle className="font-headline">Sensitivity Analysis</CardTitle>
                                            <CardDescription>How returns change with different assumptions.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-col gap-2 mb-4">
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Vertical Axis (Rows)</Label>
                                                    <Select value={sensitivityVar1} onValueChange={(v) => setSensitivityVar1(v as SensitivityVariable)}>
                                                        <SelectTrigger className="h-8"><SelectValue placeholder="Select Variable" /></SelectTrigger>
                                                        <SelectContent>
                                                            {SENSITIVITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} disabled={opt.value === sensitivityVar2}>{opt.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Horizontal Axis (Columns)</Label>
                                                    <Select value={sensitivityVar2} onValueChange={(v) => setSensitivityVar2(v as SensitivityVariable)}>
                                                        <SelectTrigger className="h-8"><SelectValue placeholder="Select Variable" /></SelectTrigger>
                                                        <SelectContent>
                                                            {SENSITIVITY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value} disabled={opt.value === sensitivityVar1}>{opt.label}</SelectItem>)}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <Label className="text-xs">Output Metric</Label>
                                                    <Select value={sensitivityMetric} onValueChange={(v) => setSensitivityMetric(v as SensitivityMetric)}>
                                                        <SelectTrigger className="h-8"><SelectValue placeholder="Select Metric" /></SelectTrigger>
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
                                                        <TableHead className="w-[100px] text-xs font-bold">{SENSITIVITY_OPTIONS.find(o => o.value === sensitivityVar1)?.label}</TableHead>
                                                        {sensitivityData.var2Range.map((val, i) => (
                                                            <TableHead key={i} className="text-center text-xs font-bold">{SENSITIVITY_OPTIONS.find(o => o.value === sensitivityVar2)?.format(val)}</TableHead>
                                                        ))}
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {sensitivityData.tableData.map((row, rowIndex) => (
                                                        <TableRow key={rowIndex}>
                                                            <TableCell className="font-mono text-xs">{SENSITIVITY_OPTIONS.find(o => o.value === sensitivityVar1)?.format(row.label)}</TableCell>
                                                            {Object.keys(row).filter(k => k !== 'label').map((key, colIndex) => {
                                                                const isCenter = rowIndex === 2 && colIndex === 2;
                                                                return (
                                                                    <TableCell key={colIndex} className={cn("text-center font-mono text-xs p-1", getColor(row[key]), isCenter && 'ring-2 ring-primary ring-inset')}>
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
                                </div>
                            </TabsContent>
                        </Tabs>
                        <CardFooter className="flex justify-end gap-2 mt-6">
                            {isEditMode && <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>}
                            <Button type="button" variant="secondary" onClick={handleSaveDeal} disabled={isSaving}> 
                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : (isEditMode ? 'Save Changes' : 'Save Deal')} 
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

    