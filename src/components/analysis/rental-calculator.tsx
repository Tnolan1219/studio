"use client";

import { useActionState, useEffect, useState, useMemo, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { getDealAssessment } from "@/lib/actions";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, BarChart2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import {
  ResponsiveContainer,
  BarChart,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  CartesianGrid,
} from "recharts";
import { useUser, useFirestore } from "@/firebase";
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { InputWithIcon } from "../ui/input-with-icon";


const formSchema = z.object({
  dealName: z.string().min(3, "Please enter a name for the deal."),
  purchasePrice: z.coerce.number().min(0, "Purchase price must be positive."),
  downPayment: z.coerce.number().min(0, "Down payment must be positive."),
  interestRate: z.coerce.number().min(0).max(100, "Interest rate must be between 0 and 100."),
  loanTerm: z.coerce.number().int().min(1, "Loan term must be at least 1 year."),
  monthlyIncome: z.coerce.number().min(0, "Monthly income must be positive."),
  monthlyExpenses: z.coerce.number().min(0, "Monthly expenses must be positive."),
  marketConditions: z.string().min(10, "Please describe market conditions."),
});

type FormData = z.infer<typeof formSchema>;

export default function RentalCalculator() {
  const [state, formAction] = useActionState(getDealAssessment, {
    message: "",
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
      dealName: "My Next Rental",
      purchasePrice: 250000,
      downPayment: 50000,
      interestRate: 6.5,
      loanTerm: 30,
      monthlyIncome: 2200,
      monthlyExpenses: 800,
      marketConditions:
        "Stable rental market with 3% annual appreciation. Low vacancy rates.",
    },
  });

  const onSubmit = (data: FormData) => {
    const formData = new FormData();
    const financialData = `
        Purchase Price: ${data.purchasePrice}, 
        Down Payment: ${data.downPayment}, 
        Interest Rate: ${data.interestRate}%, 
        Loan Term: ${data.loanTerm} years, 
        Monthly Income: ${data.monthlyIncome}, 
        Monthly Expenses: ${data.monthlyExpenses}
    `;
    formData.append("dealType", "Rental Property");
    formData.append("financialData", financialData);
    formData.append("marketConditions", data.marketConditions);
    
    startTransition(() => {
      formAction(formData);
    });
  };
    
  const watchedValues = form.watch();

  const { monthlyCashFlow, cocReturn, mortgagePayment, loanAmount, chartData } = useMemo(() => {
    const { purchasePrice, downPayment, interestRate, loanTerm, monthlyIncome, monthlyExpenses } = watchedValues;
    const loanAmount = purchasePrice - downPayment;
    const monthlyInterestRate = (interestRate / 100) / 12;
    const numberOfPayments = loanTerm * 12;
    
    const mortgagePayment = loanAmount > 0 && monthlyInterestRate > 0 
      ? loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments)) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) 
      : 0;
    
    const totalMonthlyExpenses = monthlyExpenses + mortgagePayment;
    const monthlyCashFlow = monthlyIncome - totalMonthlyExpenses;
    const annualCashFlow = monthlyCashFlow * 12;
    const cocReturn = downPayment > 0 ? (annualCashFlow / downPayment) * 100 : 0;
    
    const chartData = [
      { name: "Income", value: monthlyIncome, fill: "hsl(var(--primary))" },
      { name: "Expenses", value: monthlyExpenses, fill: "hsl(var(--destructive))" },
      { name: "Mortgage", value: parseFloat(mortgagePayment.toFixed(2)), fill: "hsl(var(--accent))" },
      { name: "Cash Flow", value: monthlyCashFlow > 0 ? parseFloat(monthlyCashFlow.toFixed(2)) : 0, fill: "hsl(var(--chart-2))" }
    ];

    return { monthlyCashFlow, cocReturn, mortgagePayment, loanAmount, chartData };
  }, [watchedValues]);

  const handleSaveDeal = async () => {
    if (!user) {
        toast({ title: "Authentication Required", description: "Please sign in to save deals.", variant: "destructive" });
        return;
    }
    if (user.isAnonymous) {
        toast({ title: "Guest Mode", description: "Cannot save deals as a guest. Please create an account.", variant: "destructive" });
        return;
    }

    const isFormValid = await form.trigger();
    if (!isFormValid) {
        toast({ title: "Invalid Data", description: "Please fill out all required fields correctly before saving.", variant: "destructive" });
        return;
    }

    setIsSaving(true);
    const dealData = {
        ...form.getValues(),
        dealType: "Rental Property",
        monthlyCashFlow: parseFloat(monthlyCashFlow.toFixed(2)),
        cocReturn: parseFloat(cocReturn.toFixed(2)),
        userId: user.uid,
        createdAt: serverTimestamp(),
        status: 'In Works',
        isPublished: false,
    };

    const dealsCol = collection(firestore, `users/${user.uid}/deals`);
    addDocumentNonBlocking(dealsCol, dealData);
    toast({ title: "Deal Saved!", description: `${dealData.dealName} has been added to your portfolio.` });
    setIsSaving(false);
  };


  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Rental Property Analyzer</CardTitle>
        <CardDescription>
          Enter the details of the rental property to calculate cash flow, ROI, and get an AI-powered assessment.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField name="dealName" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Deal Name</FormLabel> <FormControl><Input type="text" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="purchasePrice" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Purchase Price</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="downPayment" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Down Payment</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="interestRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Interest Rate</FormLabel> <FormControl><InputWithIcon icon="%" type="number" step="0.01" iconPosition="right" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="loanTerm" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Loan Term (Years)</FormLabel> <FormControl><Input type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="monthlyIncome" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Total Monthly Income</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="monthlyExpenses" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Total Monthly Expenses (ex. mortgage)</FormLabel> <FormControl><InputWithIcon icon="$" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
              <FormField name="marketConditions" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Market Conditions</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription>Describe local market trends, appreciation, etc.</FormDescription> <FormMessage /> </FormItem> )} />
            </div>
            
            <div className="space-y-6">
                <Card>
                    <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div><p className="text-sm text-muted-foreground">Monthly Cash Flow</p><p className="text-2xl font-bold">${monthlyCashFlow.toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">CoC Return</p><p className="text-2xl font-bold">{cocReturn.toFixed(2)}%</p></div>
                        <div><p className="text-sm text-muted-foreground">Monthly Mortgage</p><p className="font-bold">${mortgagePayment.toFixed(2)}</p></div>
                        <div><p className="text-sm text-muted-foreground">Loan Amount</p><p className="font-bold">${loanAmount.toFixed(2)}</p></div>
                    </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><BarChart2 size={20}/> Monthly Breakdown</CardTitle></CardHeader>
                  <CardContent className="h-[200px]">
                      <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(value) => `$${value}`} />
                            <Tooltip
                                cursor={{fill: 'hsl(var(--secondary))'}}
                                contentStyle={{
                                    backgroundColor: "hsl(var(--background))",
                                    borderColor: "hsl(var(--border))",
                                }}
                            />
                            <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                          </BarChart>
                      </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles size={20} className="text-primary"/> AI Deal Assessment</CardTitle></CardHeader>
                  <CardContent>
                    {isPending ? (
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ) : state.assessment ? (
                        <p className="text-sm text-muted-foreground">{state.assessment}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Click "Analyze Deal" to get an AI-powered assessment.</p>
                    )}
                    {state.message && !state.assessment && <p className="text-sm text-destructive">{state.message}</p>}
                  </CardContent>
                </Card>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending || isSaving}>
              {isPending ? "Analyzing..." : "Analyze Deal"}
            </Button>
            <Button variant="secondary" onClick={handleSaveDeal} disabled={isPending || isSaving}>
              {isSaving ? "Saving..." : "Save Deal"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
