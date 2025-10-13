'use client';

import { useActionState, useState, useMemo, useTransition } from 'react';
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
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { useUser, useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';
import { ProFormaTable } from './pro-forma-table';
import type { ProFormaEntry } from '@/lib/types';


const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(0),
  closingCosts: z.coerce.number().min(0),
  rehabCost: z.coerce.number().min(0),
  downPayment: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  loanTerm: z.coerce.number().int().min(1),
  grossMonthlyIncome: z.coerce.number().min(0),
  operatingExpenses: z.coerce.number().min(0), // as a % of EGI
  annualIncomeGrowth: z.coerce.number().min(0).max(100),
  annualExpenseGrowth: z.coerce.number().min(0).max(100),
  annualAppreciation: z.coerce.number().min(0).max(100),
  vacancy: z.coerce.number().min(0).max(100),
  sellingCosts: z.coerce.number().min(0).max(100),
  marketConditions: z.string().min(10, 'Please describe market conditions.'),
});

type FormData = z.infer<typeof formSchema>;

const calculateProForma = (values: FormData): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    const {
        purchasePrice, rehabCost, closingCosts, downPayment, interestRate, loanTerm,
        grossMonthlyIncome, vacancy, annualIncomeGrowth, annualExpenseGrowth,
        annualAppreciation, operatingExpenses
    } = values;

    const loanAmount = purchasePrice + rehabCost + closingCosts - downPayment;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    let currentGrossRent = grossMonthlyIncome * 12;
    let currentPropertyValue = purchasePrice + rehabCost;
    let currentLoanBalance = loanAmount;
    
    for (let year = 1; year <= 10; year++) {
        const vacancyLoss = currentGrossRent * (vacancy / 100);
        const effectiveGrossIncome = currentGrossRent - vacancyLoss;
        const currentOpEx = effectiveGrossIncome * (operatingExpenses / 100);
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
            grossPotentialRent: currentGrossRent,
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
        currentPropertyValue *= (1 + annualAppreciation / 100);
        currentLoanBalance = yearEndLoanBalance;
    }

    return proForma;
};


export default function CommercialCalculator() {
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
      dealName: 'Downtown Commercial Center',
      purchasePrice: 5000000,
      closingCosts: 2,
      rehabCost: 250000,
      downPayment: 1250000,
      interestRate: 7.5,
      loanTerm: 25,
      grossMonthlyIncome: 45000,
      operatingExpenses: 35,
      vacancy: 7,
      annualIncomeGrowth: 2.5,
      annualExpenseGrowth: 2,
      annualAppreciation: 3.5,
      sellingCosts: 4,
      marketConditions: 'High-traffic downtown area with strong retail demand and new city-led revitalization projects ongoing. What are the pros and cons of a triple-net lease for this property?',
    },
  });

  const handleAnalyzeWrapper = (data: FormData) => {
    startTransition(() => {
        const egi = data.grossMonthlyIncome * 12 * (1 - data.vacancy / 100);
        const noi = egi * (1 - data.operatingExpenses / 100);

        const financialData = `
            Purchase Price: ${data.purchasePrice}, Rehab: ${data.rehabCost},
            Gross Annual Income: ${data.grossMonthlyIncome * 12},
            Vacancy: ${data.vacancy}%, Operating Expenses: ${data.operatingExpenses}% of EGI,
            Calculated Year 1 NOI: ${noi.toFixed(2)}
        `;

        const formData = new FormData();
        formData.append('dealType', 'Commercial Multifamily');
        formData.append('financialData', financialData);
        formData.append('marketConditions', data.marketConditions);
        formAction(formData);
    });
  };

  const watchedValues = form.watch();

  const { monthlyCashFlow, cocReturn, capRate, noi, pieData, proFormaData } = useMemo(() => {
    const { purchasePrice, rehabCost, closingCosts, downPayment } = watchedValues;
    const proForma = calculateProForma(watchedValues);
    const year1 = proForma[0] || {};

    const totalInvestment = downPayment + (closingCosts/100 * purchasePrice) + rehabCost;
    const noi = year1.noi || 0;
    const monthlyCashFlow = (year1.cashFlowBeforeTax || 0) / 12;
    const cocReturn = totalInvestment > 0 ? ((monthlyCashFlow * 12) / totalInvestment) * 100 : 0;
    const capRate = purchasePrice > 0 ? (noi / (purchasePrice + rehabCost)) * 100 : 0;

    const pieData = [
      { name: 'Total Investment', value: totalInvestment, fill: 'hsl(var(--chart-1))'},
      { name: 'Loan Amount', value: (purchasePrice + rehabCost + (closingCosts/100 * purchasePrice)) - downPayment, fill: 'hsl(var(--chart-2))'},
    ];

    return { monthlyCashFlow, cocReturn, capRate, noi, pieData, proFormaData: proForma };
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
      // We need to add arv for commercial even if its the same as purchase + rehab
      arv: form.getValues().purchasePrice + form.getValues().rehabCost,
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
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Commercial Multifamily Analyzer</CardTitle>
        <CardDescription> Analyze large-scale commercial properties by focusing on NOI and key return metrics. </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAnalyzeWrapper)}>
           <CardContent className="grid md:grid-cols-2 gap-x-6 gap-y-4">
            <div className="space-y-4 col-span-2 md:col-span-1">
                 <Card><CardHeader><CardTitle className="text-lg">Purchase & Loan</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rehab Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.01" {...field}/></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </CardContent>
                </Card>
                 <Card><CardHeader><CardTitle className="text-lg">Income & Expenses</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                         <FormField name="grossMonthlyIncome" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Gross Monthly Income</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                         <FormField name="vacancy" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                         <FormField name="operatingExpenses" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Operating Expenses</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl><FormDescription>As a percentage of Effective Gross Income.</FormDescription> <FormMessage /> </FormItem> )} />
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6 col-span-2 md:col-span-1">
              <Card>
                <CardHeader><CardTitle>Key Metrics (Year 1)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div> <p className="text-sm text-muted-foreground">Cap Rate</p> <p className="text-2xl font-bold">{capRate.toFixed(2)}%</p> </div>
                  <div> <p className="text-sm text-muted-foreground">CoC Return</p> <p className="text-2xl font-bold">{cocReturn.toFixed(2)}%</p> </div>
                  <div> <p className="text-sm text-muted-foreground">NOI (Annual)</p> <p className="font-bold">${noi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                  <div> <p className="text-sm text-muted-foreground">Monthly Cash Flow</p> <p className="font-bold">${monthlyCashFlow.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader> <CardTitle className="flex items-center gap-2"> <BarChart2 size={20} /> Capital Stack </CardTitle> </CardHeader>
                <CardContent className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label >
                        {pieData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={entry.fill} /> ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}/>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
               <Card><CardHeader><CardTitle className="text-lg">Projections</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <FormField name="annualIncomeGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Income Growth</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="annualExpenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="annualAppreciation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Appreciation</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Selling Costs</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </CardContent>
              </Card>
            </div>
            <div className="col-span-2">
                <ProFormaTable data={proFormaData} />
            </div>
            <div className="col-span-2">
              <Card>
                <CardHeader> <CardTitle className="flex items-center gap-2"> <Sparkles size={20} className="text-primary" /> AI Deal Assessment </CardTitle> </CardHeader>
                <CardContent>
                  <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem className="hidden"> <FormControl><Input type="text" {...field} /></FormControl> </FormItem> )} />
                  <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>AI Advisor Prompt</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription> e.g., "Analyze the pros and cons of a triple-net lease for this property." </FormDescription> <FormMessage /> </FormItem> )} />
                  {isPending ? (
                    <div className="space-y-2 mt-4"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-3/4" /> </div>
                  ) : state.assessment ? (
                    <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">{state.assessment}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-4"> Click "Analyze with AI" to get an AI-powered assessment. </p>
                  )}
                  {state.message && !state.assessment && ( <p className="text-sm text-destructive mt-4">{state.message}</p> )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending || isSaving}> {isPending ? 'Analyzing with AI...' : 'Analyze with AI'} </Button>
            <Button variant="secondary" onClick={handleSaveDeal} disabled={isPending || isSaving}> {isSaving ? 'Saving...' : 'Save Deal'} </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
