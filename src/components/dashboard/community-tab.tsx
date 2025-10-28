
"use client";

import { useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Deal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import Link from 'next/link';

const getProfitabilityClass = (deal: Deal) => {
    const metric = deal.cocReturn ?? deal.roi ?? deal.capRate ?? 0;
    if (metric > 10) return 'border-green-500/50 hover:border-green-500';
    if (metric > 6) return 'border-orange-500/50 hover:border-orange-500';
    return 'border-red-500/50 hover:border-red-500';
};

const CommunityDealCard = ({ deal }: { deal: Deal }) => {
    let metric, metricLabel;

    switch(deal.dealType) {
        case 'Rental Property':
            metric = deal.cocReturn;
            metricLabel = 'CoC Return';
            break;
        case 'House Flip':
            metric = deal.roi;
            metricLabel = 'ROI';
            break;
        case 'Commercial Multifamily':
            metric = deal.capRate;
            metricLabel = 'Cap Rate';
            break;
        default:
            metric = 0;
            metricLabel = 'Return';
    }

    const cashFlowValue = deal.monthlyCashFlow ?? deal.netProfit ?? deal.noi ?? 0;
    const cashFlowLabel = deal.dealType === 'House Flip' ? 'Net Profit' : 'Cash Flow';

    return (
        <Card className={`bg-card/60 backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer h-full flex flex-col ${getProfitabilityClass(deal)}`}>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div className='overflow-hidden'>
                        <CardTitle className="text-lg truncate">{deal.dealName}</CardTitle>
                        <CardDescription>{deal.dealType}</CardDescription>
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                        <p>By {deal.authorName}</p>
                         <p>{deal.createdAt && new Date(deal.createdAt.seconds * 1000).toLocaleDateString()}</p>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center flex-grow">
                 <div className='overflow-hidden'>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-lg font-bold truncate">${(deal.purchasePrice / 1000).toFixed(0)}k</p>
                </div>
                <div className='overflow-hidden'>
                    <p className="text-xs text-muted-foreground">{metricLabel}</p>
                    <p className="text-lg font-bold truncate">{metric?.toFixed(1)}%</p>
                </div>
                <div className='overflow-hidden'>
                    <p className="text-xs text-muted-foreground">{cashFlowLabel}</p>
                    <p className="text-lg font-bold truncate">${cashFlowValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
            </CardContent>
        </Card>
    );
}

export default function CommunityTab() {
    const firestore = useFirestore();
    
    const dealsQuery = useMemoFirebase(() => {
        return query(collection(firestore, `publishedDeals`), orderBy('createdAt', 'desc'));
    }, [firestore]);

    const { data: deals, isLoading } = useCollection<Deal>(dealsQuery);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState('createdAt_desc');
    const [filterType, setFilterType] = useState('all');

    const filteredAndSortedDeals = useMemo(() => {
        if (!deals) return [];
        
        const [key, order] = sortKey.split('_');

        return deals
        .filter(deal => 
            deal.dealName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (filterType === 'all' || deal.dealType === filterType)
        )
        .sort((a, b) => {
            const valA = a[key as keyof Deal] as any;
            const valB = b[key as keyof Deal] as any;
            
            let comparison = 0;
            if (valA instanceof Timestamp && valB instanceof Timestamp) {
                comparison = valA.toMillis() - valB.toMillis();
            } else if (typeof valA === 'number' && typeof valB === 'number') {
                comparison = valA - valB;
            } else if (typeof valA === 'string' && typeof valB === 'string') {
                comparison = valA.localeCompare(valB);
            }
            
            return order === 'asc' ? comparison : -comparison;
        });
    }, [deals, searchTerm, filterType, sortKey]);

    const renderSkeletons = () => (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="bg-card/60 backdrop-blur-sm">
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-2 text-center">
              <div>
                <Skeleton className="h-4 w-1/2 mx-auto mb-1" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
              </div>
              <div>
                <Skeleton className="h-4 w-1/2 mx-auto mb-1" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
              </div>
               <div>
                <Skeleton className="h-4 w-1/2 mx-auto mb-1" />
                <Skeleton className="h-6 w-3/4 mx-auto" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <CardTitle className="font-headline">Community Deals</CardTitle>
                    <CardDescription>Explore deals shared by other investors in the Valentor RE community.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <Input 
                            placeholder="Search deals..."
                            className="max-w-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="flex gap-4">
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Types</SelectItem>
                                    <SelectItem value="Rental Property">Rental</SelectItem>
                                    <SelectItem value="House Flip">Flip</SelectItem>
                                    <SelectItem value="Commercial Multifamily">Commercial</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={sortKey} onValueChange={setSortKey}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt_desc">Newest First</SelectItem>
                                    <SelectItem value="createdAt_asc">Oldest First</SelectItem>
                                    <SelectItem value="monthlyCashFlow_desc">Highest Cash Flow</SelectItem>
                                    <SelectItem value="cocReturn_desc">Highest CoC Return</SelectItem>
                                    <SelectItem value="roi_desc">Highest ROI</SelectItem>
                                    <SelectItem value="capRate_desc">Highest Cap Rate</SelectItem>
                                    <SelectItem value="purchasePrice_asc">Lowest Price</SelectItem>
                                    <SelectItem value="purchasePrice_desc">Highest Price</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {isLoading ? renderSkeletons() : 
                      (filteredAndSortedDeals && filteredAndSortedDeals.length > 0) ? (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filteredAndSortedDeals.map(deal => (
                                <CommunityDealCard key={deal.id} deal={deal} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg">
                           <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                           <h3 className="mt-2 text-sm font-semibold">No Community Deals Yet</h3>
                           <p className="mt-1 text-sm text-muted-foreground">Be the first to publish a deal to the community!</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
