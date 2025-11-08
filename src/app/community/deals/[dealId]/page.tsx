
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, FirebaseClientProvider } from '@/firebase';
import { doc, collection, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Deal, DealComment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Building, Home, Repeat, ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useDashboardTab } from '@/hooks/use-dashboard-tab';


const DealTypeIcon = ({ type }: { type: Deal['dealType']}) => {
    switch (type) {
        case 'Rental Property': return <Home className="w-5 h-5" />;
        case 'House Flip': return <Repeat className="w-5 h-5" />;
        case 'Commercial Multifamily': return <Building className="w-5 h-5" />;
        default: return <BarChart className="w-5 h-5" />;
    }
}

const CommentCard = ({ comment }: { comment: DealComment }) => (
    <div className="flex gap-3 text-sm">
        <div className="font-semibold">{comment.author}:</div>
        <div className="flex-1">
            <p className="text-muted-foreground">{comment.text}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
                {comment.createdAt && formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
            </p>
        </div>
    </div>
)

function CommunityDealDetailView() {
    const { dealId } = useParams();
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { setActiveTab } = useDashboardTab();
    const { toast } = useToast();

    const [newComment, setNewComment] = useState('');

    const dealRef = useMemoFirebase(() => {
        if (!dealId) return null;
        return doc(firestore, `publishedDeals/${dealId as string}`);
    }, [firestore, dealId]);

    const commentsQuery = useMemoFirebase(() => {
        if (!dealRef) return null;
        return query(collection(dealRef, 'comments'), orderBy('createdAt', 'asc'));
    }, [dealRef]);

    const { data: deal, isLoading: isDealLoading } = useDoc<Deal>(dealRef);
    const { data: comments, isLoading: areCommentsLoading } = useCollection<DealComment>(commentsQuery);
    
    const keyMetrics = useMemo(() => {
        if (!deal) return [];
        switch (deal.dealType) {
            case 'Rental Property':
            case 'Commercial Multifamily':
                return [
                    { label: 'Cap Rate', value: `${deal.capRate?.toFixed(2)}%`},
                    { label: 'NOI', value: `$${deal.noi?.toLocaleString()}`},
                    { label: 'Monthly Cash Flow', value: `$${deal.monthlyCashFlow?.toFixed(2)}`},
                    { label: 'CoC Return', value: `${deal.cocReturn?.toFixed(2)}%`},
                ];
            case 'House Flip':
                 const loanAmount = deal.purchasePrice - deal.downPayment;
                const acquisitionCosts = deal.purchasePrice * (deal.closingCosts / 100);
                const holdingCosts = (
                    (deal.propertyTaxes / 100 * deal.purchasePrice / 12) +
                    (deal.insurance / 100 * deal.purchasePrice / 12)
                ) * deal.holdingLength + deal.otherExpenses;
                const financingCosts = loanAmount * (deal.interestRate / 100) * (deal.holdingLength / 12);
                const totalInvestment = deal.downPayment + deal.rehabCost + acquisitionCosts + holdingCosts + financingCosts;
                return [
                    { label: 'Net Profit', value: `$${deal.netProfit?.toFixed(2)}`},
                    { label: 'ROI', value: `${deal.roi?.toFixed(2)}%`},
                    { label: 'ARV', value: `$${deal.arv?.toLocaleString()}`},
                    { label: 'Total Investment', value: `$${totalInvestment.toLocaleString()}`},
                ];
            default:
                return [];
        }
    }, [deal]);
    
    const handlePostComment = () => {
        if (!dealRef || !newComment.trim() || !user || user.isAnonymous) {
            if (user?.isAnonymous) {
                toast({ title: 'Account Required', description: 'Please create a full account to comment.', variant: 'destructive'});
            }
            return;
        }
        const commentsCol = collection(dealRef, 'comments');
        addDocumentNonBlocking(commentsCol, {
            text: newComment,
            author: user.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
            userId: user.uid
        });
        setNewComment('');
        toast({ title: 'Comment Posted' });
    };

    const handleBackToCommunity = () => {
        router.push('/dashboard');
        setActiveTab('community');
    }
    
    if (isDealLoading) {
        return (
            <div className="max-w-6xl mx-auto p-6 space-y-6">
                <Skeleton className="h-10 w-3/4" />
                <Skeleton className="h-6 w-1/2" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Skeleton className="h-96 col-span-1 md:col-span-2" />
                    <Skeleton className="h-96 col-span-1" />
                </div>
            </div>
        )
    }

    if (!deal) {
        return (
            <div className="text-center p-12">
                <h2 className="text-2xl font-bold">Deal Not Found</h2>
                <p className="text-muted-foreground">This deal may have been removed or does not exist.</p>
                <Button onClick={handleBackToCommunity} className="mt-4">Back to Community</Button>
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
            <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                        <div>
                             <Button variant="ghost" size="sm" className="mb-2" onClick={handleBackToCommunity}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Community
                            </Button>
                            <div className="flex items-center gap-3">
                                <DealTypeIcon type={deal.dealType} />
                                <CardTitle className="text-3xl font-headline">{deal.dealName}</CardTitle>
                            </div>
                            <CardDescription>
                                {deal.dealType} Analysis | Published by {deal.authorName}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                             <Badge variant="secondary">{deal.status}</Badge>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader><CardTitle>Key Metrics</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {keyMetrics.map(metric => (
                                <div key={metric.label}>
                                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                                    <p className="text-2xl font-bold">{metric.value}</p>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                Notes
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground italic">
                                {deal.investorNotes || "No notes were provided for this deal."}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Community Comments</CardTitle></CardHeader>
                        <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                            {areCommentsLoading ? (
                                <Skeleton className="h-16 w-full" />
                            ) : comments && comments.length > 0 ? (
                                comments.map(comment => <CommentCard key={comment.id} comment={comment} />)
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to share your thoughts!</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <div className="flex w-full items-center gap-2">
                                <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..."/>
                                <Button size="icon" onClick={handlePostComment} disabled={!!user?.isAnonymous}><Send className="w-4 h-4"/></Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function CommunityDealDetailPage() {
    return (
        <FirebaseClientProvider>
            <CommunityDealDetailView />
        </FirebaseClientProvider>
    )
}

    