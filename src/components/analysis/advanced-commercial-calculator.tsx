'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Building, DollarSign, BarChart2, TrendingUp, Handshake, Bot, TestTube2, Percent, Trash2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { InputWithIcon } from '../ui/input-with-icon';
import { Button } from '../ui/button';

const UnderConstruction = ({ tabName }: { tabName: string }) => (
    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <div className="text-center">
            <h3 className="text-lg font-semibold">Under Construction</h3>
            <p className="text-sm text-muted-foreground">The "{tabName}" tab for the Advanced Model is coming soon.</p>
        </div>
    </div>
);

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
  // Acquisition
  purchasePrice: z.coerce.number().min(1),
  closingCosts: z.coerce.number().min(0),

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
});

type FormData = z.infer<typeof formSchema>;

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
    { value: 'expenses', label: 'Expenses', icon: DollarSign },
    { value: 'financing', label: 'Financing', icon: BarChart2 },
    { value: 'projections', label: 'Projections', icon: TrendingUp },
    { value: 'returns', label: 'Returns', icon: Handshake },
    { value: 'sensitivity', label: 'Sensitivity', icon: TestTube2 },
  ];

   const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchasePrice: 5000000,
      closingCosts: 2,
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
    },
  });

  const { fields: unitMixFields, append: appendUnit, remove: removeUnit } = useFieldArray({
    control: form.control,
    name: 'unitMix',
  });


  return (
    <CardContent>
        <p className="text-center text-sm text-muted-foreground mb-4">
            The full-featured Advanced Model is in development. This multi-tab interface will support detailed, year-by-year cash flow analysis, value-add projects, complex financing, and more.
        </p>
        <Form {...form}>
            <form>
                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 h-auto">
                        {tabs.map(tab => (
                            <TabsTrigger key={tab.value} value={tab.value} className={cn("flex-col h-14")}>
                                <tab.icon className="w-5 h-5 mb-1" />
                                <span>{tab.label}</span>
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    
                    <TabsContent value="overview" className="mt-6">
                        <UnderConstruction tabName="Overview" />
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
                            <CardHeader><CardTitle>Operating Expenses</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <LineItemInput control={form.control} name="operatingExpenses" formLabel="Recurring Monthly Expenses" fieldLabel="Expense Item" placeholder="e.g., Property Tax, Insurance" icon={<DollarSign size={14}/>} />
                                <FormField name="vacancyRate" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Vacancy Rate</FormLabel> <FormControl><InputWithIcon icon={<Percent size={14}/>} iconPosition="right" type="number" {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="financing" className="mt-6">
                        <UnderConstruction tabName="Financing" />
                    </TabsContent>
                    <TabsContent value="capex" className="mt-6">
                        <UnderConstruction tabName="CapEx & Rehab" />
                    </TabsContent>
                    <TabsContent value="projections" className="mt-6">
                        <UnderConstruction tabName="Projections" />
                    </TabsContent>
                    <TabsContent value="returns" className="mt-6">
                        <UnderConstruction tabName="Returns" />
                    </TabsContent>
                    <TabsContent value="sensitivity" className="mt-6">
                        <UnderConstruction tabName="Sensitivity" />
                    </TabsContent>

                </Tabs>
                <CardFooter className="flex justify-end gap-2 mt-6">
                    <Button type="button" disabled>Analyze</Button>
                    <Button type="button" variant="secondary" disabled>Save Deal</Button>
                </CardFooter>
            </form>
        </Form>
    </CardContent>
  );
}
