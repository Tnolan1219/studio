
"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import type { Deal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

const getProfitabilityClass = (deal: Deal) => {
    const metric = deal.cocReturn ?? deal.roi ?? deal.capRate ?? 0;
    if (metric > 10) return 'border-green-500/50 hover:border-green-500';
    if (metric > 6) return 'border-orange-500/50 hover:border-orange-500';
    return 'border-red-500/50 hover:border-red-500';
};

const DealCard = ({ deal }: { deal: Deal }) => {
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

    return (
        <Link href={`/dashboard/deals/${deal.id}`} passHref>
            <Card className={`bg-card/60 backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer h-full flex flex-col ${getProfitabilityClass(deal)}`}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle className="text-lg">{deal.dealName}</CardTitle>
                            <CardDescription>{deal.dealType}</CardDescription>
                        </div>
                        <Badge variant="outline">{deal.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-center flex-grow">
                     <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-lg font-bold">${(deal.purchasePrice / 1000).toFixed(0)}k</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">{metricLabel}</p>
                        <p className="text-lg font-bold">{metric?.toFixed(1)}%</p>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground">Cash Flow</p>
                        <p className="text-lg font-bold">${deal.monthlyCashFlow ?? deal.netProfit ?? deal.noi ?? 0}/mo</p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}

export default function DealsTab() {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const dealsQuery = useMemoFirebase(() => {
        if (!user || user.isAnonymous) return null;
        return query(collection(firestore, `users/${user.uid}/deals`), orderBy('createdAt', 'desc'));
    }, [firestore, user]);

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
        {[...Array(3)].map((_, i) => (
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
                    <CardTitle className="font-headline">My Saved Deals</CardTitle>
                    <CardDescription>Review and manage all your analyzed investment properties.</CardDescription>
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
                                <DealCard key={deal.id} deal={deal} />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 border-2 border-dashed rounded-lg">
                           <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
                           <h3 className="mt-2 text-sm font-semibold">No Deals Saved</h3>
                           <p className="mt-1 text-sm text-muted-foreground">Analyze a property and save it to see it here.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
