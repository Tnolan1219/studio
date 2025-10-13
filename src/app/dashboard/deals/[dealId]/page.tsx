'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import type { Deal, DealComment, DealStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { BarChart, Building, Home, Repeat, Trash2, Edit, MessageSquare, Send, CheckCircle, Circle, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const DEAL_STATUSES: DealStatus[] = ['In Works', 'Negotiating', 'Bought', 'Owned & Operating', 'Sold'];

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
                {formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
            </p>
        </div>
    </div>
)


export default function DealDetailPage() {
    const { dealId } = useParams();
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();

    const [newComment, setNewComment] = useState('');
    const [investorNotes, setInvestorNotes] = useState('');
    const [isEditingNotes, setIsEditingNotes] = useState(false);

    const dealRef = useMemoFirebase(() => {
        if (!user || !dealId) return null;
        return doc(firestore, `users/${user.uid}/deals/${dealId as string}`);
    }, [firestore, user, dealId]);

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
                return [
                    { label: 'Monthly Cash Flow', value: `$${deal.monthlyCashFlow?.toFixed(2)}`},
                    { label: 'CoC Return', value: `${deal.cocReturn?.toFixed(2)}%`},
                    { label: 'Purchase Price', value: `$${deal.purchasePrice.toLocaleString()}`},
                    { label: 'Down Payment', value: `$${deal.downPayment?.toLocaleString()}`},
                ];
            case 'House Flip':
                return [
                    { label: 'Net Profit', value: `$${deal.netProfit?.toFixed(2)}`},
                    { label: 'ROI', value: `${deal.roi?.toFixed(2)}%`},
                    { label: 'ARV', value: `$${deal.arv?.toLocaleString()}`},
                    { label: 'Total Costs', value: `$${(deal.purchasePrice + (deal.rehabCost ?? 0) + (deal.holdingCosts ?? 0) + (deal.sellingCosts ?? 0)).toLocaleString()}`},
                ];
            case 'Commercial Multifamily':
                 return [
                    { label: 'Cap Rate', value: `${deal.capRate?.toFixed(2)}%`},
                    { label: 'NOI', value: `$${deal.noi?.toLocaleString()}`},
                    { label: 'Purchase Price', value: `$${deal.purchasePrice.toLocaleString()}`},
                ];
            default:
                return [];
        }
    }, [deal]);
    
    const handleStatusChange = (status: DealStatus) => {
        if (!dealRef) return;
        setDocumentNonBlocking(dealRef, { status }, { merge: true });
        toast({ title: 'Status Updated', description: `Deal status changed to "${status}".` });
    };
    
    const handlePublishToggle = () => {
        if (!dealRef) return;
        const newPublishState = !deal?.isPublished;
        setDocumentNonBlocking(dealRef, { isPublished: newPublishState }, { merge: true });
        toast({ title: newPublishState ? 'Deal Published' : 'Deal Unpublished', description: `Deal is now ${newPublishState ? 'visible' : 'private'}.` });
    };

    const handleSaveNotes = () => {
        if (!dealRef) return;
        setDocumentNonBlocking(dealRef, { investorNotes: investorNotes }, { merge: true });
        toast({ title: 'Investor Notes Saved' });
        setIsEditingNotes(false);
    };

    const handlePostComment = () => {
        if (!dealRef || !newComment.trim()) return;
        const commentsCol = collection(dealRef, 'comments');
        addDocumentNonBlocking(commentsCol, {
            text: newComment,
            author: user?.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
        });
        setNewComment('');
        toast({ title: 'Comment Posted' });
    };

    const handleDeleteDeal = () => {
        if (!dealRef) return;
        deleteDocumentNonBlocking(dealRef);
        toast({ title: 'Deal Deleted', description: `${deal?.dealName} has been removed.`, variant: 'destructive'});
        router.push('/dashboard');
    }

    if (isDealLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6 space-y-6">
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
                <p className="text-muted-foreground">This deal may have been deleted or you may not have permission to view it.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
            </div>
        )
    }


    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
            <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <div className="flex items-center gap-3">
                                <DealTypeIcon type={deal.dealType} />
                                <CardTitle className="text-3xl font-headline">{deal.dealName}</CardTitle>
                            </div>
                            <CardDescription>
                                {deal.dealType} Analysis | Created {deal.createdAt && formatDistanceToNow(deal.createdAt.toDate(), { addSuffix: true })}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                             <Select value={deal.status} onValueChange={handleStatusChange}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Set Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    {DEAL_STATUSES.map(status => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" size="icon"><Trash2 className="w-4 h-4"/></Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>This action cannot be undone. This will permanently delete the deal "{deal.dealName}".</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDeleteDeal}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
                                Notes for Investors
                                <Button variant="ghost" size="icon" onClick={() => setIsEditingNotes(!isEditingNotes)}>
                                    <Edit className="w-4 h-4"/>
                                </Button>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isEditingNotes ? (
                                <div className="space-y-2">
                                    <Textarea 
                                        defaultValue={deal.investorNotes || ''} 
                                        onChange={(e) => setInvestorNotes(e.target.value)}
                                        placeholder="Describe the investment opportunity, terms, and why this is a great deal..."
                                        className="min-h-[120px]"
                                    />
                                    <Button onClick={handleSaveNotes}>Save Notes</Button>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground italic">
                                    {deal.investorNotes || "No investor notes added yet. Click edit to add some."}
                                </p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                         <CardHeader><CardTitle>Deal Settings</CardTitle></CardHeader>
                         <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                                <div>
                                    <h4 className="font-semibold">Publish Deal</h4>
                                    <p className="text-xs text-muted-foreground">Make this deal visible to others.</p>
                                </div>
                                <Button onClick={handlePublishToggle} variant={deal.isPublished ? 'secondary' : 'default'}>
                                    {deal.isPublished ? <><EyeOff className="w-4 h-4 mr-2"/>Unpublish</> : <><Eye className="w-4 h-4 mr-2"/>Publish</>}
                                </Button>
                            </div>
                         </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />Comments</CardTitle></CardHeader>
                        <CardContent className="space-y-4 max-h-60 overflow-y-auto">
                            {areCommentsLoading ? (
                                <Skeleton className="h-16 w-full" />
                            ) : comments && comments.length > 0 ? (
                                comments.map(comment => <CommentCard key={comment.id} comment={comment} />)
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-4">No comments yet.</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <div className="flex w-full items-center gap-2">
                                <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..."/>
                                <Button size="icon" onClick={handlePostComment}><Send className="w-4 h-4"/></Button>
                            </div>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
