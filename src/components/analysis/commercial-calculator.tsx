
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
import { Sparkles, BarChart2, DollarSign, Percent, Trash2, Plus, Loader2 } from 'lucide-react';
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
import { collection, serverTimestamp, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { InputWithIcon } from '../ui/input-with-icon';
import type { Deal, UserProfile, LineItem, UnitMixItem } from '@/lib/types';


const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(0),
  closingCosts: z.coerce.number().min(0),
  arv: z.coerce.number().min(0),
  downPayment: z.coerce.number().min(0),
  interestRate: z.coerce.number().min(0).max(100),
  loanTerm: z.coerce.number().int().min(1),
  vacancy: z.coerce.number().min(0).max(100),
  unitMix: z.array(z.object({ type: z.string().min(1), count: z.coerce.number().min(0), rent: z.coerce.number().min(0) })).min(1, 'At least one unit type is required.'),
  otherIncomes: z.array(z.object({ name: z.string().min(1), amount: z.coerce.number().min(0) })).optional(),
  operatingExpenses: z.array(z.object({ name: z.string().min(1), amount: z.coerce.number().min(0) })).optional(),
  capitalExpenditures: z.array(z.object({ name: z.string().min(1), amount: z.coerce.number().min(0) })).optional(),
  marketConditions: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const LineItemInput = ({ control, name, formLabel, fieldLabel, placeholder }: { control: any, name: any, formLabel: string, fieldLabel: string, placeholder: string }) => {
    const { fields, append, remove } = useFieldArray({ control, name });
    return (
        <div>
            <FormLabel>{formLabel}</FormLabel>
            {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[2fr,1fr,auto] gap-2 items-end mt-2">
                    <FormField control={control} name={`${name}.${index}.name`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">{fieldLabel}</FormLabel><FormControl><Input placeholder={placeholder} {...field} /></FormControl> </FormItem> )} />
                    <FormField control={control} name={`${name}.${index}.amount`} render={({ field }) => ( <FormItem> <FormLabel className="text-xs">Amount ($/mo)</FormLabel><FormControl><Input type="number" {...field} /></FormControl> </FormItem> )} />
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
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isEditMode = !!deal;
  
  const [analysisResult, setAnalysisResult] = useState<{
      monthlyCashFlow: number;
      cocReturn: number;
      capRate: number;
      noi: number;
      chartData: any[];
  } | null>(null);
   const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: profileData } = useDoc<UserProfile>(userProfileRef);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && deal && !deal.isAdvanced ? {
        ...deal,
        unitMix: deal.unitMix || [{type: 'Unit', count: 1, rent: deal.grossMonthlyIncome || 0}],
        operatingExpenses: deal.operatingExpenses || [],
        capitalExpenditures: [{ name: 'Rehab/CapEx', amount: deal.rehabCost || 0}],
        otherIncomes: deal.otherIncomes || [],
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
      operatingExpenses: [],
      capitalExpenditures: [{name: 'Initial Rehab', amount: 50000}],
    },
  });
  
  const { fields: unitMixFields, append: appendUnit, remove: removeUnit } = useFieldArray({
    control: form.control,
    name: 'unitMix',
  });


  const handleAnalysis = (data: FormData) => {
    const totalMonthlyUnitIncome = data.unitMix.reduce((acc, unit) => acc + unit.count * unit.rent, 0);
    const totalOtherMonthlyIncome = data.otherIncomes?.reduce((acc, item) => acc + item.amount, 0) || 0;
    const grossMonthlyIncome = totalMonthlyUnitIncome + totalOtherMonthlyIncome;
    
    const annualGrossIncome = grossMonthlyIncome * 12;
    const vacancyLoss = annualGrossIncome * (data.vacancy / 100);
    const effectiveGrossIncome = annualGrossIncome - vacancyLoss;
    
    const totalMonthlyOpEx = data.operatingExpenses?.reduce((acc, item) => acc + item.amount, 0) || 0;
    const totalOpEx = totalMonthlyOpEx * 12;
    
    const noi = effectiveGrossIncome - totalOpEx;

    const loanAmount = data.purchasePrice - data.downPayment;
    const monthlyInterestRate = data.interestRate / 100 / 12;
    const numberOfPayments = data.loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    const cashFlowBeforeTax = noi - debtService;
    const monthlyCashFlow = cashFlowBeforeTax / 12;
    
    const rehabCost = data.capitalExpenditures?.reduce((acc, item) => acc + item.amount, 0) || 0;
    const totalInvestment = data.downPayment + (data.purchasePrice * (data.closingCosts / 100)) + rehabCost;
    const cocReturn = totalInvestment > 0 ? (cashFlowBeforeTax / totalInvestment) * 100 : 0;
    
    const capRateOnARV = data.arv > 0 ? (noi / data.arv) * 100 : 0;
    
    const breakdownChartData = [
        { name: 'Income', value: grossMonthlyIncome, fill: 'hsl(var(--primary))' },
        { name: 'OpEx', value: totalMonthlyOpEx, fill: 'hsl(var(--chart-5))' },
        { name: 'Mortgage', value: debtService / 12, fill: 'hsl(var(--chart-3))' },
        { name: 'Cash Flow', value: monthlyCashFlow > 0 ? monthlyCashFlow : 0, fill: 'hsl(var(--success))' },
    ];


    setAnalysisResult({ monthlyCashFlow, cocReturn, capRate: capRateOnARV, noi, chartData: breakdownChartData });
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

    const grossMonthlyIncome = (formValues.unitMix.reduce((acc, unit) => acc + unit.count * unit.rent, 0)) + (formValues.otherIncomes?.reduce((acc, item) => acc + item.amount, 0) || 0);
    const rehabCost = formValues.capitalExpenditures?.reduce((acc, item) => acc + item.amount, 0) || 0;

    const dealData = {
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
                 <CardDescription>A quick analysis tool for commercial properties. Use monthly dollar amounts for income/expenses.</CardDescription>
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
                          <FormField name="arv" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>After-Repair Value</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" step="0.01" {...field}/></FormControl> <FormMessage /> </FormItem> )} />
                          <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Yrs)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
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
                           <LineItemInput control={form.control} name="operatingExpenses" formLabel="Operating Expenses (Monthly)" fieldLabel="Expense Item" placeholder="e.g., Taxes" />
                           <LineItemInput control={form.control} name="capitalExpenditures" formLabel="Capital Expenditures (One-Time)" fieldLabel="CapEx Item" placeholder="e.g., Roof" />
                           <FormField name="vacancy" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy</FormLabel> <FormControl><InputWithIcon icon="%" iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                      </CardContent>
                  </Card>
                  {analysisResult && (
                    <Card>
                        <CardHeader><CardTitle className="text-lg font-headline">Key Metrics & Breakdown</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div> <p className="text-sm text-muted-foreground">Cap Rate (ARV)</p> <p className="text-2xl font-bold">{analysisResult.capRate.toFixed(2)}%</p> </div>
                                <div> <p className="text-sm text-muted-foreground">CoC Return (Y1)</p> <p className="text-2xl font-bold">{analysisResult.cocReturn.toFixed(2)}%</p> </div>
                                <div> <p className="text-sm text-muted-foreground">Monthly Cash Flow</p> <p className="text-xl font-bold">${analysisResult.monthlyCashFlow.toFixed(2)}</p> </div>
                                <div> <p className="text-sm text-muted-foreground">NOI (Annual)</p> <p className="font-bold">${analysisResult.noi.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p> </div>
                            </div>
                             <div className="h-[200px] w-full pt-4">
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
                    </Card>
                  )}
                </div>
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
