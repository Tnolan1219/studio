"use client";

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Deal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { List, Briefcase } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';

const getProfitabilityClass = (cocReturn: number) => {
    if (cocReturn > 10) return 'border-green-500/50 hover:border-green-500';
    if (cocReturn > 6) return 'border-orange-500/50 hover:border-orange-500';
    return 'border-red-500/50 hover:border-red-500';
};

const DealCard = ({ deal }: { deal: Deal }) => (
    <Card className={`bg-card/60 backdrop-blur-sm transition-colors ${getProfitabilityClass(deal.cocReturn)}`}>
        <CardHeader>
            <CardTitle>{deal.dealName}</CardTitle>
            <CardDescription>{deal.dealType} Property</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-2 text-center">
            <div>
                <p className="text-xs text-muted-foreground">Cash Flow</p>
                <p className="text-lg font-bold">${deal.monthlyCashFlow}/mo</p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">CoC Return</p>
                <p className="text-lg font-bold">{deal.cocReturn}%</p>
            </div>
            <div>
                <p className="text-xs text-muted-foreground">Price</p>
                <p className="text-lg font-bold">${(deal.purchasePrice / 1000).toFixed(0)}k</p>
            </div>
        </CardContent>
    </Card>
);

export default function DealsTab() {
    const { user } = useUser();
    const firestore = useFirestore();
    
    const dealsCollection = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, `users/${user.uid}/deals`);
    }, [firestore, user]);

    const { data: deals, isLoading } = useCollection<Deal>(dealsCollection);

    const [searchTerm, setSearchTerm] = useState('');
    const [sortKey, setSortKey] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [filterType, setFilterType] = useState('all');

    const filteredAndSortedDeals = useMemo(() => {
        if (!deals) return [];
        return deals
        .filter(deal => 
            deal.dealName.toLowerCase().includes(searchTerm.toLowerCase()) &&
            (filterType === 'all' || deal.dealType.toLowerCase() === filterType.toLowerCase())
        )
        .sort((a, b) => {
            const valA = a[sortKey as keyof Deal] as any;
            const valB = b[sortKey as keyof Deal] as any;
            if (sortKey === 'createdAt' && valA && valB) {
                 const dateA = valA.seconds ? new Date(valA.seconds * 1000) : new Date(valA);
                 const dateB = valB.seconds ? new Date(valB.seconds * 1000) : new Date(valB);
                 return sortOrder === 'asc' ? dateA.getTime() - dateB.getTime() : dateB.getTime() - dateA.getTime();
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortOrder === 'asc' ? valA - valB : valB - valA;
            }
            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return 0;
        });
    }, [deals, searchTerm, filterType, sortKey, sortOrder]);

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
                    <CardTitle>My Saved Deals</CardTitle>
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
                                    <SelectItem value="Flip">Flip</SelectItem>
                                    <SelectItem value="Commercial">Commercial</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={`${sortKey}-${sortOrder}`} onValueChange={(value) => {
                                const [key, order] = value.split('-');
                                setSortKey(key);
                                setSortOrder(order);
                            }}>
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Sort by" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                                    <SelectItem value="monthlyCashFlow-desc">Highest Cash Flow</SelectItem>
                                    <SelectItem value="cocReturn-desc">Highest CoC Return</SelectItem>
                                    <SelectItem value="purchasePrice-asc">Lowest Price</SelectItem>
                                    <SelectItem value="purchasePrice-desc">Highest Price</SelectItem>
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
