
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase, FirebaseClientProvider } from '@/firebase';
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
import { useToast } from '@/hooks/use-toast';
import { BarChart, Building, Home, Repeat, Trash2, Edit, MessageSquare, Send, Eye, EyeOff, ArrowLeft, Sparkles, Loader2, Workflow } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ProFormaTable } from '@/components/analysis/pro-forma-table';
import { useDashboardTab } from '@/hooks/use-dashboard-tab';
import RentalCalculator from '@/components/analysis/rental-calculator';
import FlipCalculator from '@/components/analysis/flip-calculator';
import CommercialCalculator from '@/components/analysis/commercial-calculator';
import type { ProFormaEntry } from '@/lib/types';
import { getDealAssessment } from '@/lib/actions';
import DealFlowView from '@/components/dealflow/dealflow-view';


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
                {comment.createdAt && formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true })}
            </p>
        </div>
    </div>
)

const calculateProForma = (deal: Deal): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    if (!deal) return proForma;

    const loanAmount = deal.purchasePrice - deal.downPayment;
    const monthlyInterestRate = deal.interestRate / 100 / 12;
    const numberOfPayments = deal.loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    let currentGrossRent = deal.grossMonthlyIncome * 12;
    const arv = deal.purchasePrice + deal.rehabCost;

    let currentPropertyValue = arv;
    let currentLoanBalance = loanAmount;
    
    for (let year = 1; year <= 10; year++) {
        const annualGrossIncome = currentGrossRent;
        const taxesAmount = annualGrossIncome * (deal.propertyTaxes/100);
        const insuranceAmount = annualGrossIncome * (deal.insurance/100);
        const maintenanceAmount = annualGrossIncome * (deal.repairsAndMaintenance/100);
        const capexAmount = annualGrossIncome * (deal.capitalExpenditures/100);
        const managementAmount = annualGrossIncome * (deal.managementFee/100);
        const otherAmount = annualGrossIncome * (deal.otherExpenses/100);

        const currentOpEx = taxesAmount + insuranceAmount + maintenanceAmount + capexAmount + managementAmount + otherAmount;

        const vacancyLoss = currentGrossRent * (deal.vacancy / 100);
        const effectiveGrossIncome = currentGrossRent - vacancyLoss;
        const noi = effectiveGrossIncome - currentOpEx;

        let yearEndLoanBalance = currentLoanBalance;
        if (monthlyInterestRate > 0 && yearEndLoanBalance > 0) {
            for (let i = 0; i < 12; i++) {
                const interestPayment = yearEndLoanBalance * monthlyInterestRate;
                const principalPayment = (debtService / 12) - interestPayment;
                yearEndLoanBalance -= principalPayment;
            }
        } else {
             yearEndLoanBalance = 0;
        }

        proForma.push({
            year,
            grossPotentialRent: currentGrossRent,
            vacancyLoss,
            effectiveGrossIncome,
            operatingExpenses: currentOpEx,
            noi,
            debtService,
            cashFlowBeforeTax: noi - debtService,
            propertyValue: currentPropertyValue,
            loanBalance: yearEndLoanBalance,
            equity: currentPropertyValue - yearEndLoanBalance,
        });
        
        currentGrossRent *= (1 + deal.annualIncomeGrowth / 100);
        currentPropertyValue *= (1 + deal.annualAppreciation / 100);
        currentLoanBalance = yearEndLoanBalance;
    }

    return proForma;
};


function DealDetailView() {
    const { dealId } = useParams();
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const { setActiveTab } = useDashboardTab();
    const { toast } = useToast();

    const [newComment, setNewComment] = useState('');
    const [investorNotes, setInvestorNotes] = useState('');
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [isEditingDeal, setIsEditingDeal] = useState(false);
    const [isDealFlowOpen, setIsDealFlowOpen] = useState(false);
    const [isAIPending, startAITransition] = useTransition();
    const [aiResult, setAiResult] = useState<{message: string, assessment: string | null} | null>(null);

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

    const proFormaData = useMemo(() => (deal && deal.dealType !== 'House Flip') ? calculateProForma(deal) : [], [deal]);
    
    const handleStatusChange = (status: DealStatus) => {
        if (!dealRef) return;
        setDocumentNonBlocking(dealRef, { status }, { merge: true });
        toast({ title: 'Status Updated', description: `Deal status changed to "${status}".` });
    };
    
    const handlePublishToggle = () => {
        if (!dealRef || !deal || !user) return;
        const newPublishState = !deal?.isPublished;
        const publicDealRef = doc(firestore, `publishedDeals/${deal.id}`);

        if (newPublishState) {
            const publicDealData = {
                ...deal,
                isPublished: true,
                authorName: user.displayName || 'Anonymous',
                userId: user.uid, // Copy owner's UID for security rules
                investorNotes: '', // Do not publish private notes
            };
            setDocumentNonBlocking(publicDealRef, publicDealData, {});
        } else {
            deleteDocumentNonBlocking(publicDealRef);
        }
        
        setDocumentNonBlocking(dealRef, { isPublished: newPublishState }, { merge: true });
        toast({ title: newPublishState ? 'Deal Published' : 'Deal Unpublished', description: `Deal is now ${newPublishState ? 'visible to the community' : 'private'}.` });
    };

    const handleSaveNotes = () => {
        if (!dealRef) return;
        setDocumentNonBlocking(dealRef, { investorNotes: investorNotes }, { merge: true });
        toast({ title: 'Investor Notes Saved' });
        setIsEditingNotes(false);
    };

    const handlePostComment = () => {
        if (!dealRef || !newComment.trim() || !user) return;
        const commentsCol = collection(dealRef, 'comments');
        addDocumentNonBlocking(commentsCol, {
            text: newComment,
            author: user.displayName || 'Anonymous',
            createdAt: serverTimestamp(),
        });
        setNewComment('');
        toast({ title: 'Comment Posted' });
    };

    const handleDeleteDeal = () => {
        if (!dealRef || !deal) return;
        
        // If the deal is published, delete it from the public collection first
        if (deal.isPublished) {
            const publicDealRef = doc(firestore, `publishedDeals/${deal.id}`);
            deleteDocumentNonBlocking(publicDealRef);
        }
        
        deleteDocumentNonBlocking(dealRef);
        toast({ title: 'Deal Deleted', description: `${deal?.dealName} has been removed.`, variant: 'destructive'});
        router.push('/dashboard');
        setActiveTab('deals');
    }
    
    const handleBackToDeals = () => {
        router.push('/dashboard');
        setActiveTab('deals');
    }

    const handleSaveEdit = () => {
        toast({ title: "Changes Saved", description: "Your deal has been updated." });
        setIsEditingDeal(false);
    }

    const handleGenerateInsights = () => {
        if (!deal) return;
        startAITransition(async () => {
            let financialData = '';
            if (deal.dealType === 'Rental Property' || deal.dealType === 'Commercial Multifamily') {
                financialData = `Purchase Price: ${deal.purchasePrice}, Monthly Income: ${deal.grossMonthlyIncome}, NOI: ${deal.noi}, Cap Rate: ${deal.capRate}`;
            } else if (deal.dealType === 'House Flip') {
                financialData = `Purchase Price: ${deal.purchasePrice}, ARV: ${deal.arv}, Rehab Cost: ${deal.rehabCost}, Net Profit: ${deal.netProfit}, ROI: ${deal.roi}`;
            }

            const result = await getDealAssessment({
              dealType: deal.dealType,
              financialData,
              marketConditions: deal.marketConditions,
              stage: 'initial-analysis'
            });
            setAiResult(result);
        });
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
                <p className="text-muted-foreground">This deal may have been deleted or you may not have permission to view it.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Go to Dashboard</Button>
            </div>
        )
    }
    
    if (isDealFlowOpen) {
        return <DealFlowView deal={deal} onBack={() => setIsDealFlowOpen(false)} dealRef={dealRef} />;
    }

    if (isEditingDeal) {
        switch(deal.dealType) {
            case 'Rental Property':
                return <RentalCalculator deal={deal} onSave={handleSaveEdit} onCancel={() => setIsEditingDeal(false)} />;
            case 'House Flip':
                return <FlipCalculator deal={deal} onSave={handleSaveEdit} onCancel={() => setIsEditingDeal(false)} />;
            case 'Commercial Multifamily':
                return <CommercialCalculator deal={deal} onSave={handleSaveEdit} onCancel={() => setIsEditingDeal(false)} />;
            default:
                 setIsEditingDeal(false); // Fallback for unknown deal types
                 return null;
        }
    }


    return (
        <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
            <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                        <div>
                             <Button variant="ghost" size="sm" className="mb-2" onClick={handleBackToDeals}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Deals
                            </Button>
                            <div className="flex items-center gap-3">
                                <DealTypeIcon type={deal.dealType} />
                                <CardTitle className="text-3xl font-headline">{deal.dealName}</CardTitle>
                                 <Button variant="ghost" size="icon" onClick={() => setIsEditingDeal(true)}>
                                    <Edit className="w-4 h-4" />
                                </Button>
                            </div>
                            <CardDescription>
                                {deal.dealType} Analysis | Created {deal.createdAt && formatDistanceToNow(deal.createdAt.toDate(), { addSuffix: true })}
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button onClick={() => setIsDealFlowOpen(true)}>
                                <Workflow className="mr-2 h-4 w-4" />
                                Open DealFlow
                            </Button>
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
                    {deal.dealType !== 'House Flip' && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pro Forma (10-Year Projection)</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {proFormaData.length > 0 ? (
                                    <ProFormaTable data={proFormaData} />
                                ) : (
                                    <p className="text-sm text-muted-foreground">Pro forma data not available for this deal type.</p>
                                )}
                            </CardContent>
                        </Card>
                    )}
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
                                    <h4 className="font-semibold">Publish to Community</h4>
                                    <p className="text-xs text-muted-foreground">Make this deal visible to others on the Community tab.</p>
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
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Sparkles size={16} className="text-primary"/>AI Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isAIPending ? (
                                <div className="flex justify-center items-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                </div>
                            ) : aiResult ? (
                                <div className="text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: aiResult.assessment || `<p class="text-destructive">${aiResult.message}</p>` }} />
                            ) : (
                                <p className="text-sm text-muted-foreground">Click below to get a quick AI-powered analysis of this deal.</p>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={handleGenerateInsights} disabled={isAIPending} className="w-full">
                                {isAIPending ? 'Generating...' : 'Run Quick Analysis'}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function DealDetailPage() {
    return (
        <FirebaseClientProvider>
            <DealDetailView />
        </FirebaseClientProvider>
    )
}

    