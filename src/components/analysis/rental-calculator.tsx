
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
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
} from 'recharts';
import { useUser, useFirestore } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';
import { ProFormaTable } from './pro-forma-table';
import type { ProFormaEntry } from '@/lib/types';


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
  sellingCosts: z.coerce.number().min(0).max(100),
  marketConditions: z.string().min(10, 'Please describe market conditions.'),
});

type FormData = z.infer<typeof formSchema>;

const calculateProForma = (values: FormData): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    const {
        purchasePrice, rehabCost, closingCosts, downPayment, interestRate, loanTerm,
        grossMonthlyIncome, vacancy, annualIncomeGrowth, annualExpenseGrowth,
        annualAppreciation, propertyTaxes, insurance, repairsAndMaintenance,
        capitalExpenditures, managementFee, otherExpenses
    } = values;

    const loanAmount = purchasePrice + rehabCost + closingCosts - downPayment;
    const monthlyInterestRate = interestRate / 100 / 12;
    const numberOfPayments = loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    let currentGrossRent = grossMonthlyIncome * 12;
    const arv = purchasePrice + rehabCost;
    
    // Expenses can be a mix of % of income and % of value.
    let currentOpEx = 
        (propertyTaxes / 100 * arv) + 
        (insurance / 100 * arv) + 
        (repairsAndMaintenance / 100 * currentGrossRent) + 
        (capitalExpenditures / 100 * currentGrossRent) + 
        (managementFee / 100 * currentGrossRent) + 
        (otherExpenses / 100 * currentGrossRent);

    let currentPropertyValue = arv;
    let currentLoanBalance = loanAmount;
    
    for (let year = 1; year <= 10; year++) {
        const vacancyLoss = currentGrossRent * (vacancy / 100);
        const effectiveGrossIncome = currentGrossRent - vacancyLoss;
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
        // Recalculate expenses that depend on income
        currentOpEx = 
            (propertyTaxes / 100 * arv * Math.pow(1 + annualAppreciation / 100, year -1)) + 
            (insurance / 100 * arv * Math.pow(1 + annualAppreciation / 100, year -1)) + 
            (repairsAndMaintenance / 100 * currentGrossRent) + 
            (capitalExpenditures / 100 * currentGrossRent) + 
            (managementFee / 100 * currentGrossRent) + 
            (otherExpenses / 100 * currentGrossRent);

        currentPropertyValue *= (1 + annualAppreciation / 100);
        currentLoanBalance = yearEndLoanBalance;
    }

    return proForma;
};


export default function RentalCalculator() {
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
      dealName: 'My Next Rental',
      purchasePrice: 250000,
      closingCosts: 3,
      rehabCost: 10000,
      arv: 280000,
      downPayment: 50000,
      interestRate: 6.5,
      loanTerm: 30,
      grossMonthlyIncome: 2200,
      propertyTaxes: 1.2,
      insurance: 0.5,
      repairsAndMaintenance: 5,
      vacancy: 5,
      capitalExpenditures: 5,
      managementFee: 8,
      otherExpenses: 2,
      annualIncomeGrowth: 3,
      annualExpenseGrowth: 2,
      annualAppreciation: 3,
      sellingCosts: 6,
      marketConditions: 'Analyze the rental market in the 90210 zip code. What are the average rents for a 3-bedroom house?',
    },
  });

  const handleAnalyzeWrapper = (data: FormData) => {
    startTransition(() => {
        const proForma = calculateProForma(data);
        const year1 = proForma[0] || {};
        const monthlyExpenses = (year1.operatingExpenses || 0) / 12;

        const financialData = `
            Purchase Price: ${data.purchasePrice}, Rehab: ${data.rehabCost}, ARV: ${data.arv},
            Down Payment: ${data.downPayment}, Interest Rate: ${data.interestRate}%, Loan Term: ${data.loanTerm} years,
            Gross Monthly Income: ${data.grossMonthlyIncome}, Total Monthly Expenses: ${monthlyExpenses.toFixed(2)}
        `;

        const formData = new FormData();
        formData.append('dealType', 'Rental Property');
        formData.append('financialData', financialData);
        formData.append('marketConditions', data.marketConditions);
        formAction(formData);
    });
  };

  const watchedValues = form.watch();

  const { monthlyCashFlow, cocReturn, capRate, noi, chartData, proFormaData } = useMemo(() => {
    const { purchasePrice, rehabCost, closingCosts, downPayment, grossMonthlyIncome } = watchedValues;
    const proForma = calculateProForma(watchedValues);
    const year1 = proForma[0] || {};
    
    const totalInvestment = downPayment + (closingCosts/100 * purchasePrice) + rehabCost;
    const noi = year1.noi || 0;
    const monthlyCashFlow = (year1.cashFlowBeforeTax || 0) / 12;
    const cocReturn = totalInvestment > 0 ? ((monthlyCashFlow * 12) / totalInvestment) * 100 : 0;
    const arv = purchasePrice + rehabCost;
    const capRate = arv > 0 ? (noi / arv) * 100 : 0;

    const chartData = [
        { name: 'Income', value: grossMonthlyIncome, fill: 'hsl(var(--primary))' },
        { name: 'Expenses', value: (year1.operatingExpenses || 0) / 12, fill: 'hsl(var(--destructive))' },
        { name: 'Mortgage', value: (year1.debtService || 0) / 12, fill: 'hsl(var(--accent))' },
        { name: 'Cash Flow', value: monthlyCashFlow > 0 ? monthlyCashFlow : 0, fill: 'hsl(var(--chart-2))' },
    ];

    return { monthlyCashFlow, cocReturn, capRate, noi, chartData, proFormaData: proForma };
  }, [watchedValues]);

  const handleSaveDeal = async () => {
    if (!user || !firestore) {
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
      dealType: 'Rental Property',
      monthlyCashFlow: parseFloat(monthlyCashFlow.toFixed(2)),
      cocReturn: parseFloat(cocReturn.toFixed(2)),
      noi: parseFloat(noi.toFixed(2)),
      capRate: parseFloat(capRate.toFixed(2)),
      userId: user.uid,
      createdAt: serverTimestamp(),
      status: 'In Works',
      isPublished: false,
    };

    try {
        await addDoc(collection(firestore, `users/${user.uid}/deals`), dealData);
        toast({ title: 'Deal Saved!', description: `${dealData.dealName} has been added to your portfolio.` });
    } catch (error) {
        console.error("Error saving deal:", error);
        toast({ title: 'Error Saving Deal', description: 'Could not save the deal. Please try again.', variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="font-headline">Rental Property Analyzer (BRRRR Method)</CardTitle>
        <CardDescription>
          Analyze a rental property purchase, including rehab, using the BRRRR (Buy, Rehab, Rent, Refinance, Repeat) strategy.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAnalyzeWrapper)}>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                  <Card>
                      <CardHeader><CardTitle className="text-lg">Purchase & Loan</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                          <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="closingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Closing Costs</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.1" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="rehabCost" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rehab Costs</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.01" {...field}/></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="arv" control={form.control} render={({ field }) => ( <FormItem className="col-span-2"> <FormLabel>After Repair Value (ARV)</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                   <Card>
                      <CardHeader><CardTitle className="text-lg">Income</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                           <FormField name="grossMonthlyIncome" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Gross Monthly Income</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
              </div>

              <div className="space-y-4">
                   <Card>
                      <CardHeader><CardTitle className="text-lg">Operating Expenses (% of Income/Value)</CardTitle></CardHeader>
                      <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <FormField name="propertyTaxes" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Taxes (% ARV)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="insurance" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Insurance (% ARV)</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="repairsAndMaintenance" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Maintenance</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="vacancy" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="capitalExpenditures" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>CapEx</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="managementFee" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Management</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="otherExpenses" control={form.control} render={({ field }) => ( <FormItem className="col-span-3"> <FormLabel>Other Expenses</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Projections</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <FormField name="annualIncomeGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Income Growth</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="annualExpenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="annualAppreciation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Appreciation</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                        <FormField name="sellingCosts" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Selling Costs</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    </CardContent>
                  </Card>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mt-6">
                <Card>
                    <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div> <p className="text-sm text-muted-foreground">Monthly Cash Flow</p> <p className="text-2xl font-bold">${monthlyCashFlow.toFixed(2)}</p> </div>
                      <div> <p className="text-sm text-muted-foreground">CoC Return</p> <p className="text-2xl font-bold">{cocReturn.toFixed(2)}%</p> </div>
                      <div> <p className="text-sm text-muted-foreground">NOI (Annual)</p> <p className="font-bold">${noi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                      <div> <p className="text-sm text-muted-foreground">Cap Rate</p> <p className="font-bold">{capRate.toFixed(2)}%</p> </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2"> <BarChart2 size={20} /> Monthly Breakdown </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={value => `$${value}`} />
                          <Tooltip 
                            cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>
            
            <div className="mt-6">
                <ProFormaTable data={proFormaData} />
            </div>

            <div className="mt-6">
                 <Card>
                    <CardHeader> <CardTitle className="flex items-center gap-2"> <Sparkles size={20} className="text-primary" /> AI Deal Assessment </CardTitle> </CardHeader>
                    <CardContent>
                      <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>AI Advisor Prompt</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription> e.g., "Analyze market conditions for zip code 90210," or "Suggest financing options for a first-time investor." </FormDescription> <FormMessage /> </FormItem> )} />
                      {isPending ? (
                        <div className="space-y-2 mt-4"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-3/4" /> </div>
                      ) : state.assessment ? (
                        <div className="text-sm text-muted-foreground mt-4 prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: state.assessment }} />
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
