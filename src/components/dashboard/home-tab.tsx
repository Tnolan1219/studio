
'use client';

import { useMemo } from "react";
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Deal } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { DollarSign, Home, TrendingUp, Briefcase } from "lucide-react";
import { QuickTips } from "./quick-tips";
import { PortfolioVisualization } from "./portfolio-visualization";

export function HomeTab() {
    const { user } = useUser();
    const firestore = useFirestore();

    const dealsQuery = useMemoFirebase(() => {
        if (!user || user.isAnonymous) return null;
        return query(collection(firestore, `users/${user.uid}/deals`));
    }, [firestore, user]);

    const { data: deals, isLoading: areDealsLoading } = useCollection<Deal>(dealsQuery);

    const portfolioMetrics = useMemo(() => {
        if (!deals) return { portfolioValue: 0, estimatedEquity: 0, annualCashFlow: 0, totalDeals: 0 };

        const portfolioValue = deals.reduce((acc, deal) => acc + (deal.arv || deal.purchasePrice), 0);
        const totalDebt = deals.reduce((acc, deal) => {
            const loanAmount = deal.purchasePrice - deal.downPayment;
            return acc + (loanAmount > 0 ? loanAmount : 0);
        }, 0);
        const estimatedEquity = portfolioValue - totalDebt;
        
        const annualCashFlow = deals
            .filter(deal => deal.dealType !== 'House Flip')
            .reduce((acc, deal) => acc + (deal.monthlyCashFlow || 0) * 12, 0);

        return {
            portfolioValue,
            estimatedEquity,
            annualCashFlow,
            totalDeals: deals.length,
        };
    }, [deals]);
    
    const kpiData = [
        { title: "Portfolio Value", value: portfolioMetrics.portfolioValue, icon: DollarSign, description: "Estimated current value of all deals" },
        { title: "Estimated Equity", value: portfolioMetrics.estimatedEquity, icon: Home, description: "Value minus outstanding loan balances" },
        { title: "Annual Cash Flow", value: portfolioMetrics.annualCashFlow, icon: TrendingUp, description: "Pre-tax cash flow from all rentals" },
        { title: "Total Deals", value: portfolioMetrics.totalDeals, icon: Briefcase, description: "Number of deals in your portfolio" },
    ];

    const getWelcomeName = () => {
        if (!user) return "Guest";
        if (user.isAnonymous) return "Guest";
        return user.displayName?.split(' ')[0] || user.email?.split('@')[0] || "User";
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                 <h1 className="text-3xl font-bold font-headline">
                    Welcome back, {getWelcomeName()}!
                </h1>
                <p className="text-muted-foreground">Here's a snapshot of your portfolio.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map((kpi, i) => (
                    <Card key={i} className="bg-card/60 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold">
                                {['Portfolio Value', 'Estimated Equity', 'Annual Cash Flow'].includes(kpi.title)
                                    ? `$${kpi.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                                    : kpi.value
                                }
                            </div>
                            <p className="text-xs text-muted-foreground">{kpi.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <QuickTips />

            <PortfolioVisualization deals={deals || []} />
            
        </div>
    )
}
