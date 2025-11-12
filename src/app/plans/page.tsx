'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking, FirebaseClientProvider } from '@/firebase';
import { collection, doc, query, where, getDocs } from 'firebase/firestore';
import type { UserProfile, Plan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Check, X, Loader2, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { useProfileStore } from '@/hooks/use-profile-store';


const PlanCard = ({ plan, currentPlan, onSelect, isLoading }: { plan: Plan, currentPlan?: string, onSelect: (planName: string) => void, isLoading: boolean }) => {
    const isCurrent = plan.name === currentPlan;
    const isPro = plan.name === 'Pro';

    const features = [
        { text: `${plan.maxSavedDeals === 999 ? 'Unlimited' : plan.maxSavedDeals} Saved Deals`, included: true },
        { text: `${plan.maxCalculatorUses === 999 ? 'Unlimited' : plan.maxCalculatorUses} Calculator Uses`, included: true },
        { text: 'Access to Advanced CRE', included: plan.accessAdvancedCRE },
        { text: 'Newsletter Access', included: plan.accessNewsletter },
    ];
    
    return (
        <Card className={cn(
            "flex flex-col",
            isCurrent ? "border-primary ring-2 ring-primary" : "border-border",
            isPro && !isCurrent && "border-primary/50"
        )}>
            {isPro && <div className="text-center py-1 bg-primary text-primary-foreground text-sm font-bold rounded-t-lg">Most Popular</div>}
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-headline">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="text-center">
                    <span className="text-4xl font-bold">${plan.price}</span>
                    <span className="text-muted-foreground">/mo</span>
                </div>
                <ul className="space-y-2 text-sm">
                    {features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                            {feature.included ? <Check className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-destructive" />}
                            <span className={cn(!feature.included && "text-muted-foreground line-through")}>{feature.text}</span>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter>
                {isCurrent ? (
                    <Button disabled className="w-full">Current Plan</Button>
                ) : (
                    <Button onClick={() => onSelect(plan.name)} className="w-full" disabled={isLoading}>
                         {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        {currentPlan === 'Free' ? 'Get Started' : 'Upgrade'}
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
    const { data: plans } = useCollection<Plan>(plansQuery);
    
    const sortedPlans = plans?.sort((a, b) => a.price - b.price);

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
                // Reset usage limits or handle proration here in a real scenario
            };
            setDocumentNonBlocking(userRef, newPlanData, { merge: true });
            
            // Update client-side store
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
        <div className="flex min-h-screen w-full flex-col">
            <Header />
            <main className="flex-1 p-6 md:p-12 bg-transparent animate-fade-in">
                <div className="text-center max-w-2xl mx-auto mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold font-headline">Choose Your Plan</h1>
                    <p className="mt-4 text-lg text-muted-foreground">
                        Unlock more features and take your real estate investing to the next level.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {sortedPlans?.map(plan => (
                        <PlanCard 
                            key={plan.id} 
                            plan={plan}
                            currentPlan={profileData?.plan}
                            onSelect={handleSelectPlan}
                            isLoading={isLoading}
                        />
                    ))}
                </div>
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
