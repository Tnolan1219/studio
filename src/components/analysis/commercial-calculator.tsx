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
import { Sparkles, BarChart2, DollarSign, Percent, Trash2 } from 'lucide-react';
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
import { useUser, useFirestore } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';

const unitMixSchema = z.object({
  type: z.string(),
  count: z.coerce.number().min(0),
  rent: z.coerce.number().min(0),
});

const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(1),
  unitMix: z.array(unitMixSchema).min(1, 'At least one unit type is required.'),
  otherIncome: z.coerce.number().min(0),
  vacancyRate: z.coerce.number().min(0).max(100),
  operatingExpenses: z.coerce.number().min(0),
  loanAmount: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  loanTerm: z.coerce.number().int().min(1),
  holdPeriod: z.coerce.number().min(1).max(10),
  rentGrowth: z.coerce.number().min(0).max(100),
  expenseGrowth: z.coerce.number().min(0).max(100),
  marketConditions: z.string().min(10, 'Please describe market conditions.'),
});

type FormData = z.infer<typeof formSchema>;
type UnitMix = z.infer<typeof unitMixSchema>;

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
      unitMix: [
        { type: 'Studio', count: 10, rent: 1200 },
        { type: '1BR', count: 20, rent: 1600 },
        { type: '2BR', count: 10, rent: 2200 },
      ],
      otherIncome: 5000,
      vacancyRate: 5,
      operatingExpenses: 150000,
      loanAmount: 3750000,
      interestRate: 7.5,
      loanTerm: 30,
      holdPeriod: 5,
      rentGrowth: 3,
      expenseGrowth: 2,
      marketConditions: 'High-traffic downtown area with strong retail demand. What are the pros and cons of a triple-net lease for this property?',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'unitMix',
  });

  const handleAnalyzeWrapper = (data: FormData) => {
    startTransition(() => {
        const { purchasePrice, unitMix, vacancyRate, otherIncome, operatingExpenses } = data;
        const gpr = unitMix.reduce((acc, unit) => acc + (unit.count * unit.rent * 12), 0);
        const egi = gpr * (1 - vacancyRate / 100) + (otherIncome * 12);
        const noi = egi - operatingExpenses;

        const financialData = `
            Purchase Price: ${purchasePrice},
            Gross Potential Rent: ${gpr.toFixed(2)},
            Vacancy: ${vacancyRate}%, Operating Expenses: ${operatingExpenses},
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

  const { noi, cashFlow, cocReturn, capRate, chartData } = useMemo(() => {
    const { purchasePrice, unitMix, vacancyRate, otherIncome, operatingExpenses, loanAmount, interestRate, loanTerm, holdPeriod, rentGrowth, expenseGrowth } = watchedValues;
    const initialEquity = purchasePrice - loanAmount;

    if (purchasePrice <= 0 || initialEquity <= 0) {
        return { noi: 0, cashFlow: 0, cocReturn: 0, capRate: 0, chartData: [] };
    }
    
    // PMT formula for debt service
    const monthlyRate = interestRate / 100 / 12;
    const numPayments = loanTerm * 12;
    const pmt = monthlyRate > 0 ? (monthlyRate * loanAmount) / (1 - Math.pow(1 + monthlyRate, -numPayments)) : 0;
    const annualDebtService = pmt * 12;

    let gpr = unitMix.reduce((acc, unit) => acc + (unit.count * unit.rent * 12), 0);
    const egi = gpr * (1 - vacancyRate / 100) + (otherIncome * 12);
    const noi = egi - operatingExpenses;
    const cashFlow = noi - annualDebtService;
    const cocReturn = (cashFlow / initialEquity) * 100;
    const capRate = (noi / purchasePrice) * 100;

    const projections = [];
    let currentGpr = gpr;
    let currentExpenses = operatingExpenses;
    for (let i = 1; i <= holdPeriod; i++) {
        const currentEgi = currentGpr * (1 - vacancyRate / 100) + (otherIncome * 12);
        const currentNoi = currentEgi - currentExpenses;
        const currentCf = currentNoi - annualDebtService;
        projections.push({ year: `Year ${i}`, cashFlow: parseFloat(currentCf.toFixed(2))});
        currentGpr *= (1 + rentGrowth / 100);
        currentExpenses *= (1 + expenseGrowth / 100);
    }
    
    return { 
        noi,
        cashFlow, 
        cocReturn: isNaN(cocReturn) || !isFinite(cocReturn) ? 0 : cocReturn, 
        capRate: isNaN(capRate) || !isFinite(capRate) ? 0 : capRate,
        chartData: projections 
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
    const { dealName, purchasePrice, unitMix, otherIncome, vacancyRate, operatingExpenses, loanAmount, interestRate, loanTerm } = form.getValues();
    const dealData = {
      dealName,
      purchasePrice,
      unitMix,
      otherIncome,
      vacancyRate,
      operatingExpenses,
      loanAmount,
      interestRate,
      loanTerm,
      noi,
      monthlyCashFlow: cashFlow / 12,
      cocReturn,
      capRate,
      dealType: 'Commercial Multifamily',
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
        <CardTitle>Commercial Multifamily Analyzer (Simple Mode)</CardTitle>
        <CardDescription> A lightweight analysis for quick underwriting of multifamily deals. </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleAnalyzeWrapper)}>
           <CardContent className="grid md:grid-cols-3 gap-x-8 gap-y-4">
            
            <div className="md:col-span-2 space-y-4">
                <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                
                <div>
                    <FormLabel>Unit Mix</FormLabel>
                    <FormDescription>Define the number of units and average rent for each type.</FormDescription>
                    {fields.map((field, index) => (
                        <div key={field.id} className="grid grid-cols-[1fr,1fr,1fr,auto] gap-2 items-end mt-2">
                           <FormField control={form.control} name={`unitMix.${index}.type`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Type</FormLabel><FormControl><Input placeholder="e.g., 2BR" {...field} /></FormControl> </FormItem> )} />
                           <FormField control={form.control} name={`unitMix.${index}.count`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs"># Units</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
                           <FormField control={form.control} name={`unitMix.${index}.rent`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Avg. Rent</FormLabel><FormControl><InputWithIcon icon={<DollarSign size={14}/>} type="number" {...field} /></FormControl> </FormItem> )} />
                           <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                        </div>
                    ))}
                    <Button type="button" size="sm" variant="outline" onClick={() => append({type: '', count: 0, rent: 0})} className="mt-2">Add Unit Type</Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <FormField name="vacancyRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="otherIncome" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Other Income (Monthly)</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
                
                <FormField name="operatingExpenses" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Operating Expenses (Annual)</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                
                <div className="grid grid-cols-3 gap-4">
                    <FormField name="loanAmount" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Amount</FormLabel> <FormControl><InputWithIcon icon={<DollarSign size={16}/>} type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Amort. (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
                 <div className="grid grid-cols-3 gap-4">
                    <FormField name="holdPeriod" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Hold Period (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="rentGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rent Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                    <FormField name="expenseGrowth" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Expense Growth</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>

            </div>

            <div className="space-y-6 md:col-span-1">
              <Card>
                <CardHeader><CardTitle>Key Metrics (Year 1)</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div> <p className="text-sm text-muted-foreground">Cap Rate</p> <p className="text-2xl font-bold">{capRate.toFixed(2)}%</p> </div>
                  <div> <p className="text-sm text-muted-foreground">CoC Return</p> <p className="text-2xl font-bold">{cocReturn.toFixed(2)}%</p> </div>
                  <div> <p className="text-sm text-muted-foreground">NOI (Annual)</p> <p className="font-bold">${noi.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p> </div>
                  <div> <p className="text-sm text-muted-foreground">Annual Cash Flow</p> <p className="font-bold">${cashFlow.toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</p> </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader> <CardTitle className="flex items-center gap-2"> <BarChart2 size={20} /> Cash Flow Projection </CardTitle> </CardHeader>
                <CardContent className="h-[200px] -ml-4">
                  <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value/1000}k`} />
                        <Tooltip
                            cursor={{ fill: 'hsla(var(--primary), 0.1)' }}
                            contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                        />
                        <Bar dataKey="cashFlow" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader> <CardTitle className="flex items-center gap-2"> <Sparkles size={20} className="text-primary" /> AI Deal Assessment </CardTitle> </CardHeader>
                <CardContent>
                  <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>AI Advisor Prompt</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription> e.g., "Analyze the pros and cons of a triple-net lease for this property." </FormDescription> <FormMessage /> </FormItem> )} />
                  {isPending ? (
                    <div className="space-y-2 mt-4"> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-full" /> <Skeleton className="h-4 w-3/4" /> </div>
                  ) : state.assessment ? (
                    <div className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: state.assessment.replace(/\n/g, '<br />') }} />
                  ) : (
                    <p className="text-sm text-muted-foreground mt-4"> Click "Run Analysis" to get an AI-powered assessment. </p>
                  )}
                  {state.message && !state.assessment && ( <p className="text-sm text-destructive mt-4">{state.message}</p> )}
                </CardContent>
              </Card>

            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending || isSaving}> {isPending ? 'Analyzing...' : 'Run Analysis'} </Button>
            <Button variant="secondary" onClick={handleSaveDeal} disabled={isPending || isSaving}> {isSaving ? 'Saving...' : 'Save Deal'} </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
