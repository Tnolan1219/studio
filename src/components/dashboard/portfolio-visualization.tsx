
'use client';

import type { Deal } from '@/lib/types';
import { Building, Home, Repeat, TrendingUp, TrendingDown, Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from 'next/link';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';

const PROPERTY_ICONS: Record<string, React.ElementType> = {
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
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="bg-card/60 backdrop-blur-sm overflow-hidden h-full transition-all duration-300 hover:shadow-primary/20 hover:scale-105 cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="truncate text-base">{deal.dealName}</CardTitle>
                <CardDescription className="text-xs">{deal.dealType}</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                  <div className="relative w-16 h-16">
                    <Icon className="w-full h-full text-muted-foreground/20" />
                    <div className="absolute bottom-0 left-0 w-full overflow-hidden" style={{ height: equityFillHeight }}>
                      <Icon className="w-full h-full text-primary" />
                    </div>
                  </div>
                  <div className="text-right">
                      <p className="text-xs text-muted-foreground">
                          {deal.dealType === 'House Flip' ? 'Est. Profit' : 'Monthly Cash Flow'}
                      </p>
                      <div className={cn("flex items-center justify-end gap-1 text-xl font-bold", cashFlow >= 0 ? 'text-success' : 'text-destructive')}>
                          <span>{cashFlow.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0, })}</span>
                          {cashFlow >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                      </div>
                  </div>
              </CardContent>
            </Card>
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
    </Link>
  );
};


export const PortfolioVisualization = ({ deals }: { deals: Deal[] }) => {
  if (!deals || deals.length === 0) {
    return (
        <Card className="bg-card/60 backdrop-blur-sm min-h-[250px]">
            <CardHeader>
                <CardTitle>My Portfolio</CardTitle>
                <CardDescription>An interactive overview of your investment properties.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground pt-8">
                    <Briefcase className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Your portfolio is empty.</p>
                    <p className="text-sm">Analyze and save a deal to see it here.</p>
                </div>
            </CardContent>
        </Card>
    );
  }

  return (
    <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
            <CardTitle>My Portfolio</CardTitle>
            <CardDescription>An interactive overview of your investment properties. Click a property to view details.</CardDescription>
        </CardHeader>
        <CardContent>
            <Carousel opts={{
                align: "start",
                loop: false,
            }}>
                <CarouselContent className="-ml-4 py-4">
                    {deals.map(deal => (
                        <CarouselItem key={deal.id} className="md:basis-1/2 lg:basis-1/3 pl-4">
                            <PropertyCard deal={deal} />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
            </Carousel>
        </CardContent>
    </Card>
  );
};
