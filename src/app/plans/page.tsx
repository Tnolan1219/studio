
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { useProfileStore } from '@/hooks/use-profile-store';
import { useToast } from '@/hooks/use-toast';
import { collection, query, doc } from 'firebase/firestore';
import type { Plan, UserProfile } from '@/lib/types';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Header } from '@/components/header';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function PlanCard({ plan, currentPlan, onSelect, isLoading }: { plan: Plan; currentPlan: string; onSelect: (planName: string) => void; isLoading: boolean; }) {
    const isCurrent = plan.name === currentPlan;
    const isPro = plan.name === 'Pro';

    const features = [
        { text: `${plan.dealLimit === -1 ? 'Unlimited' : plan.dealLimit} saved deals`, included: true },
        { text: `${plan.maxCalculatorUses === -1 ? 'Unlimited' : plan.maxCalculatorUses} calculator uses`, included: true },
        { text: 'Advanced commercial calculator', included: plan.accessAdvancedCRE },
        { text: 'Partnership & waterfall modeling', included: plan.name === 'Executive' || plan.name === 'Elite' },
        { text: 'AI-powered deal analysis', included: plan.price > 0 },
        { text: 'Priority support', included: plan.name === 'Executive' || plan.name === 'Elite' },
        { text: 'Newsletter access', included: plan.accessNewsletter },
    ];

    return (
        <Card className={cn(
            "flex flex-col transition-all duration-300 w-full max-w-sm mx-auto",
            isCurrent ? "border-primary ring-2 ring-primary shadow-lg shadow-primary/20" : "border-border hover:shadow-xl hover:-translate-y-2",
            isPro && !isCurrent && "border-cyan-400/50"
        )}>
            {isPro && <div className="text-center py-1 bg-cyan-400 text-black text-sm font-bold rounded-t-lg">Most Popular</div>}
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-headline">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-6">
                <div className="text-center">
                    <span className="text-5xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-3 text-sm">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-3">
                            {feature.included ? <Check className="w-5 h-5 text-green-500 flex-shrink-0" /> : <X className="w-5 h-5 text-destructive flex-shrink-0" />}
                            <span className={cn(!feature.included && "text-muted-foreground line-through")}>{feature.text}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                {isCurrent ? (
                    <Button disabled className="w-full">Current Plan</Button>
                ) : (
                    <Button 
                        onClick={() => onSelect(plan.name)} 
                        className="w-full bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_15px_hsl(var(--primary)/0.8)] hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300 transform hover:scale-105"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Upgrade to {plan.name}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}

function PlansView() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const { profileData, setProfileData } = useProfileStore();
    
    const [isLoading, setIsLoading] = useState(false);

    const plansQuery = useMemoFirebase(() => query(collection(firestore, 'plans')), [firestore]);
    const { data: plans, isLoading: plansLoading } = useCollection<Plan>(plansQuery);
    
    const sortedPlans = useMemo(() => {
        if (!plans) return [];
        const order: Record<string, number> = { 'Free': 0, 'Pro': 1, 'Executive': 2, 'Elite': 3 };
        return [...plans].sort((a, b) => (order[a.name] ?? 99) - (order[b.name] ?? 99));
    }, [plans]);

    const handleSelectPlan = async (planName: string) => {
        if (!user || user.isAnonymous) {
            toast({ title: "Account Required", description: "Please create an account to select a plan." });
            return;
        }

        setIsLoading(true);
        const userRef = doc(firestore, 'users', user.uid);
        
        try {
            const newPlanData = {
                plan: planName as UserProfile['plan'],
                lastUpgradeDate: new Date().toISOString(),
            };
            
            // Use non-blocking update for Firestore
            setDocumentNonBlocking(userRef, newPlanData, { merge: true });
            
            // Update local state immediately
            setProfileData(newPlanData);

            toast({ title: "Plan Updated!", description: `You are now on the ${planName} plan.` });
            router.push('/dashboard');
        } catch (error) {
            console.error("Failed to update plan: ", error);
            toast({ title: "Error", description: "Could not update your plan.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <Header />
            <main className="container mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <h1 className="text-5xl font-bold font-headline">Find the Right Plan for You</h1>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        Whether you're just starting out or managing a large portfolio, we have a plan that fits your needs.
                    </p>
                </div>
                
                {plansLoading ? (
                     <div className="flex justify-center items-center">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        {sortedPlans?.map(plan => (
                            <PlanCard 
                                key={plan.id} 
                                plan={plan}
                                currentPlan={profileData?.plan || 'Free'}
                                onSelect={handleSelectPlan}
                                isLoading={isLoading}
                            />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default function PlansPage() {
    return (
        <FirebaseClientProvider>
            <PlansView />
        </FirebaseClientProvider>
    )
}

    