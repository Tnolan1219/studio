
'use client';

import type { Deal } from '@/lib/types';
import { Building, Home, Repeat, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from 'next/link';

const PROPERTY_ICONS = {
  'Rental Property': Home,
  'House Flip': Repeat,
  'Commercial Multifamily': Building,
};

const PropertyCard = ({ deal }: { deal: Deal }) => {
  const Icon = PROPERTY_ICONS[deal.dealType] || Home;

  let equity = 0;
  let totalValue = 0;
  let remainingDebt = 0;
  let cashFlow = deal.monthlyCashFlow ?? (deal.netProfit ? deal.netProfit / 12 : 0) ?? 0;
  let equityPercentage = 0;

  if (deal.dealType === 'House Flip') {
    const loanAmount = deal.purchasePrice - deal.downPayment;
    totalValue = deal.arv;
    const totalInvestment = deal.downPayment + deal.rehabCost + (deal.purchasePrice * (deal.closingCosts / 100));
    equity = deal.arv - (deal.purchasePrice - deal.downPayment) - deal.rehabCost - (deal.purchasePrice * (deal.closingCosts/100));
    remainingDebt = loanAmount;
    equityPercentage = totalValue > 0 ? (equity / totalValue) * 100 : 0;
  } else { // Rental & Commercial
    const loanAmount = deal.purchasePrice - deal.downPayment;
    totalValue = deal.arv > 0 ? deal.arv : deal.purchasePrice + deal.rehabCost;
    equity = totalValue - loanAmount;
    remainingDebt = loanAmount;
    equityPercentage = totalValue > 0 ? (equity / totalValue) * 100 : 0;
  }
  
  const equityFillHeight = `${Math.max(0, Math.min(100, equityPercentage))}%`;

  return (
    <Link href={`/dashboard/deals/${deal.id}`} passHref>
        <Card className="bg-card/60 backdrop-blur-sm overflow-hidden h-full transition-all duration-300 hover:shadow-primary/20 hover:scale-105 cursor-pointer">
            <CardHeader>
                <CardTitle className="truncate text-lg">{deal.dealName}</CardTitle>
                <CardDescription>{deal.dealType}</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-between items-center">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="relative w-20 h-20">
                                <Icon className="w-full h-full text-muted-foreground/20" />
                                <div 
                                    className="absolute bottom-0 left-0 w-full overflow-hidden" 
                                    style={{ height: equityFillHeight }}
                                >
                                    <Icon className="w-full h-full text-primary" />
                                </div>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <div className="space-y-1 text-sm">
                                <p><span className="font-semibold">Value:</span> {totalValue.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                                <p><span className="font-semibold">Equity:</span> {equity.toLocaleString('en-US', { style: 'currency', currency: 'USD' })} ({equityPercentage.toFixed(1)}%)</p>
                                <p><span className="font-semibold">Debt:</span> {remainingDebt.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
                            </div>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                        {deal.dealType === 'House Flip' ? 'Est. Profit' : 'Monthly Cash Flow'}
                    </p>
                    <div
                        className={cn(
                            "flex items-center justify-end gap-1 text-2xl font-bold",
                            cashFlow >= 0 ? 'text-success' : 'text-destructive'
                        )}
                    >
                        <span>
                            {cashFlow.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                                maximumFractionDigits: 0,
                            })}
                        </span>
                        {cashFlow >= 0 ? (
                            <TrendingUp className="h-6 w-6" />
                        ) : (
                            <TrendingDown className="h-6 w-6" />
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    </Link>
  );
};


export const PortfolioVisualization = ({ deals }: { deals: Deal[] }) => {
  return (
    <Card className="bg-card/30 backdrop-blur-sm">
        <CardHeader>
            <CardTitle>My Portfolio</CardTitle>
            <CardDescription>A visual representation of your investment properties. Click a property to view details.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {deals.map(deal => (
                <PropertyCard key={deal.id} deal={deal} />
            ))}
        </CardContent>
    </Card>
  );
};
