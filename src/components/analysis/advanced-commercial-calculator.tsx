'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building, DollarSign, BarChart2, TrendingUp, Handshake, Bot, TestTube2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const UnderConstruction = ({ tabName }: { tabName: string }) => (
    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
        <div className="text-center">
            <h3 className="text-lg font-semibold">Under Construction</h3>
            <p className="text-sm text-muted-foreground">The "{tabName}" tab for the Advanced Model is coming soon.</p>
        </div>
    </div>
);


export default function AdvancedCommercialCalculator() {
    
  const tabs = [
    { value: 'overview', label: 'Overview', icon: Building },
    { value: 'income', label: 'Income', icon: DollarSign },
    { value: 'expenses', label: 'Expenses', icon: DollarSign },
    { value: 'financing', label: 'Financing', icon: BarChart2 },
    { value: 'capex', label: 'CapEx & Rehab', icon: TrendingUp },
    { value: 'projections', label: 'Projections', icon: TrendingUp },
    { value: 'returns', label: 'Returns', icon: Handshake },
    { value: 'sensitivity', label: 'Sensitivity', icon: TestTube2 },
  ];

  return (
    <CardContent>
        <p className="text-center text-sm text-muted-foreground mb-4">
            The full-featured Advanced Model is in development. This multi-tab interface will support detailed, year-by-year cash flow analysis, value-add projects, complex financing, and more.
        </p>
        <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-8 h-auto">
                {tabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className={cn("flex-col h-14")}>
                        <tab.icon className="w-5 h-5 mb-1" />
                        <span>{tab.label}</span>
                    </TabsTrigger>
                ))}
            </TabsList>
            {tabs.map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-6">
                    <UnderConstruction tabName={tab.label} />
                </TabsContent>
            ))}
        </Tabs>
    </CardContent>
  );
}
