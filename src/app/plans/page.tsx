
'use client';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Header } from '@/components/header';
import { useProfileStore } from '@/hooks/use-profile-store';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore, setDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FirebaseDataInitializer } from '@/firebase/data-initializer';
import type { Plan } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Check, ArrowLeft, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';


const PlanCard = ({ plan, isCurrent, onUpgrade, isPopular }: { plan: Plan, isCurrent: boolean, onUpgrade: (planName: string) => void, isPopular: boolean }) => {
    return (
        <Card className={cn(
            "relative flex flex-col transition-all duration-300",
            isCurrent ? "border-primary ring-2 ring-primary shadow-lg" : "hover:border-primary/50",
            isPopular && !isCurrent && "border-cyan-400"
        )}>
            {isPopular && (
                <div className="absolute top-0 right-4 -translate-y-1/2 bg-cyan-400 text-black px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                    Most Popular
                </div>
            )}
            <CardHeader>
                <CardTitle className="font-headline text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
                <div className="flex items-baseline mb-4">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    <span className="ml-1 text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Up to <strong>{plan.dealLimit === Infinity ? 'Unlimited' : plan.dealLimit}</strong> saved deals</span>
                    </li>
                    <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span>Up to <strong>{plan.maxCalculatorUses === Infinity ? 'Unlimited' : plan.maxCalculatorUses}</strong> calculator uses</span>
                    </li>
                    <li className="flex items-center gap-2">
                        {plan.accessAdvancedCRE ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-destructive" />}
                        <span>Advanced Commercial Tools</span>
                    </li>
                    <li className="flex items-center gap-2">
                         {plan.accessNewsletter ? <Check className="w-4 h-4 text-green-500" /> : <X className="w-4 h-4 text-destructive" />}
                        <span>AI-Powered Insights</span>
                    </li>
                </ul>
            </CardContent>
            <CardFooter>
                 <Button
                    className={cn(
                        "w-full mt-4 py-6 font-bold transition-all duration-300",
                         isCurrent ? "bg-muted text-muted-foreground cursor-not-allowed" : "bg-cyan-400 text-black hover:bg-cyan-300 hover:shadow-cyan-400/50 shadow-lg"
                    )}
                    onClick={() => !isCurrent && onUpgrade(plan.name)}
                    disabled={isCurrent}
                >
                    {isCurrent ? "Current Plan" : "Upgrade"}
                </Button>
            </CardFooter>
        </Card>
    );
};


function PlansView() {
    const { profileData, setProfileData } = useProfileStore();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const plansQuery = useMemoFirebase(() => {
        return query(collection(firestore, 'plans'));
    }, [firestore]);

    const { data: plans, isLoading } = useCollection<Plan>(plansQuery);

    const sortedPlans = plans?.sort((a, b) => a.price - b.price) || [];

    const handleUpgrade = (planName: string) => {
        if (!user || user.isAnonymous || !firestore) {
            toast({
                title: 'Authentication Required',
                description: 'Please create a full account to upgrade your plan.',
                variant: 'destructive',
            });
            return;
        };
        
        const userRef = doc(firestore, 'users', user.uid);
        const newPlanData = { plan: planName, lastUpgradeDate: new Date().toISOString() };
        
        // Use non-blocking write with built-in contextual error handling
        setDocumentNonBlocking(userRef, newPlanData, { merge: true });

        // Optimistically update local state and UI
        setProfileData({ plan: planName as 'Free' | 'Pro' | 'Executive' | 'Elite' });
        
        toast({
            title: 'Plan updated!',
            description: `You are now on the ${planName} plan.`,
        });

        router.push('/dashboard');
    };

    return (
        <div className="min-h-screen text-white">
            <Header />
            <FirebaseDataInitializer />
            <main className="container mx-auto px-4 py-16">
                 <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl font-headline">
                        Find Your Edge
                    </h1>
                    <p className="mt-4 text-xl text-muted-foreground max-w-3xl mx-auto">
                        Choose the plan that's right for you and unlock the full potential of your real estate investments.
                    </p>
                </div>
                
                {isLoading ? (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
                        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[450px] w-full rounded-2xl" />)}
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto animate-fade-in">
                        {sortedPlans.map((plan) => (
                            <PlanCard
                                key={plan.id}
                                plan={plan}
                                isCurrent={profileData?.plan === plan.name}
                                onUpgrade={handleUpgrade}
                                isPopular={plan.name === 'Pro'}
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
