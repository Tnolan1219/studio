'use client';

import { useActionState, useEffect, useState, useMemo, useTransition } from 'react';
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

const formSchema = z.object({
  dealName: z.string().min(3, 'Please enter a name for the deal.'),
  purchasePrice: z.coerce.number().min(0),
  noi: z.coerce.number().min(0),
  marketConditions: z.string().min(10, 'Please describe market conditions.'),
});

type FormData = z.infer<typeof formSchema>;

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

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
      noi: 350000,
      marketConditions:
        'High-traffic downtown area with strong retail demand and new city-led revitalization projects ongoing.',
    },
  });

  const onSubmit = (data: FormData) => {
    const formData = new FormData();
    const financialData = `
        Purchase Price: ${data.purchasePrice},
        Net Operating Income (NOI): ${data.noi}
    `;
    formData.append('dealType', 'Commercial Multifamily');
    formData.append('financialData', financialData);
    formData.append('marketConditions', data.marketConditions);

    startTransition(() => {
      formAction(formData);
    });
  };

  const watchedValues = form.watch();

  const { capRate, valuePerSqFt, pieData } = useMemo(() => {
    const { purchasePrice, noi } = watchedValues;
    const capRate = purchasePrice > 0 ? (noi / purchasePrice) * 100 : 0;
    // Assuming a placeholder for SqFt for demonstration
    const placeholderSqFt = 50000;
    const valuePerSqFt = purchasePrice / placeholderSqFt;

    const pieData = [
      { name: 'Income Potential', value: noi },
      { name: 'Initial Investment', value: purchasePrice },
    ];

    return { capRate, valuePerSqFt, pieData };
  }, [watchedValues]);

  const handleSaveDeal = async () => {
    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to save deals.',
        variant: 'destructive',
      });
      return;
    }
    if (user.isAnonymous) {
      toast({
        title: 'Guest Mode',
        description: 'Cannot save deals as a guest. Please create an account.',
        variant: 'destructive',
      });
      return;
    }

    const isFormValid = await form.trigger();
    if (!isFormValid) {
      toast({
        title: 'Invalid Data',
        description:
          'Please fill out all required fields correctly before saving.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    const dealData = {
      ...form.getValues(),
      dealType: 'Commercial Multifamily',
      capRate: parseFloat(capRate.toFixed(2)),
      userId: user.uid,
      createdAt: serverTimestamp(),
      status: 'In Works',
      isPublished: false,
    };

    const dealsCol = collection(firestore, `users/${user.uid}/deals`);
    addDocumentNonBlocking(dealsCol, dealData);
    toast({
      title: 'Deal Saved!',
      description: `${dealData.dealName} has been added to your portfolio.`,
    });
    setIsSaving(false);
  };

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
      <CardHeader>
        <CardTitle>Commercial Multifamily Analyzer</CardTitle>
        <CardDescription>
          Analyze commercial properties by focusing on Net Operating Income
          (NOI) and Cap Rate.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form
          onSubmit={e => {
            e.preventDefault();
            form.handleSubmit(onSubmit)();
          }}
        >
          <CardContent className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                name="dealName"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    {' '}
                    <FormLabel>Deal Name</FormLabel>{' '}
                    <FormControl>
                      <Input type="text" {...field} />
                    </FormControl>{' '}
                    <FormMessage />{' '}
                  </FormItem>
                )}
              />
              <FormField
                name="purchasePrice"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    {' '}
                    <FormLabel>Purchase Price</FormLabel>{' '}
                    <FormControl>
                      <InputWithIcon icon="$" type="number" {...field} />
                    </FormControl>{' '}
                    <FormMessage />{' '}
                  </FormItem>
                )}
              />
              <FormField
                name="noi"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    {' '}
                    <FormLabel>Net Operating Income (NOI)</FormLabel>{' '}
                    <FormControl>
                      <InputWithIcon icon="$" type="number" {...field} />
                    </FormControl>{' '}
                    <FormDescription>
                      Annual income after all operating expenses.
                    </FormDescription>{' '}
                    <FormMessage />{' '}
                  </FormItem>
                )}
              />
              <FormField
                name="marketConditions"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    {' '}
                    <FormLabel>Market Conditions</FormLabel>{' '}
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>{' '}
                    <FormDescription>
                      Describe local market trends, comparable sales, etc.
                    </FormDescription>{' '}
                    <FormMessage />{' '}
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Key Metrics</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cap Rate</p>
                    <p className="text-2xl font-bold">{capRate.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Value / SqFt
                    </p>
                    <p className="text-2xl font-bold">
                      ${valuePerSqFt.toFixed(2)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart2 size={20} /> Investment Overview
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {pieData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          borderColor: 'hsl(var(--border))',
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles size={20} className="text-primary" /> AI Deal
                    Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isPending ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  ) : state.assessment ? (
                    <p className="text-sm text-muted-foreground">
                      {state.assessment}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Click "Analyze Deal" to get an AI-powered assessment.
                    </p>
                  )}
                  {state.message && !state.assessment && (
                    <p className="text-sm text-destructive">{state.message}</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="submit" disabled={isPending || isSaving}>
              {isPending ? 'Analyzing...' : 'Analyze Deal'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleSaveDeal}
              disabled={isPending || isSaving}
            >
              {isSaving ? 'Saving...' : 'Save Deal'}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
