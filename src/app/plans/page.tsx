
'use client';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Header } from '@/components/header';
import { PricingPlan } from '@/components/pricing-plan';
import { useProfileStore } from '@/hooks/use-profile-store';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FirebaseDataInitializer } from '@/firebase/data-initializer';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import type { UserProfile } from '@/lib/types';

const plans = [
    {
        name: 'Free',
        price: 0,
        features: [
            'Up to 5 saved deals',
            'Standard rental calculator',
            'Basic flip analysis',
            'Community forum access',
        ],
    },
    {
        name: 'Pro',
        price: 9,
        features: [
            'Up to 25 saved deals',
            'Advanced commercial calculator',
            'AI-powered deal analysis & insights',
            'Save and track deals in a portfolio',
            'Standard partnership modeling',
            'Priority email support',
        ],
    },
    {
        name: 'Premium',
        price: 29,
        features: [
            'Unlimited saved deals',
            'All Pro features included',
            'Advanced partnership & waterfall modeling',
            'Tax & depreciation analysis tools',
            'Sensitivity & scenario analysis',
            'Dedicated 24/7 priority support',
        ],
    },
     {
        name: 'Elite',
        price: 49,
        features: [
            'Unlimited saved deals',
            'All Pro features included',
            'Advanced partnership & waterfall modeling',
            'Tax & depreciation analysis tools',
            'Sensitivity & scenario analysis',
            'Dedicated 24/7 priority support',
        ],
    },
];

function PlansView() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();
    const { profileData, setProfileData, isLoading, hasHydrated } = useProfileStore();
    const [isUpdating, setIsUpdating] = useState<string | null>(null);

    const handleUpgrade = async (planName: UserProfile['plan']) => {
        if (!user || user.isAnonymous) {
            toast({ title: "Account Required", description: "Please create an account to upgrade your plan." });
            return;
        }
        if (!firestore) return;

        setIsUpdating(planName);
        
        const userRef = doc(firestore, 'users', user.uid);
        const planUpdateData = { plan: planName, lastUpgradeDate: new Date().toISOString() };
        
        // Non-blocking write to Firestore
        setDocumentNonBlocking(userRef, planUpdateData, { merge: true });
        
        // Optimistically update the local Zustand store
        setProfileData(planUpdateData);

        toast({
            title: 'Plan Updated!',
            description: `You are now on the ${planName} plan.`,
        });
        
        // Use a timeout to simulate network latency before redirecting
        setTimeout(() => {
            setIsUpdating(null);
            router.push('/');
        }, 500);
    };

    return (
        <div className="min-h-screen">
            <Header />
            <FirebaseDataInitializer />
            <main className="container mx-auto px-4 py-16">
                 <Button variant="ghost" onClick={() => router.push('/')} className="mb-8">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                </Button>
                <div className="text-center mb-16 animate-fade-in">
                    <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl font-headline">
                        Choose Your Plan
                    </h1>
                    <p className="mt-4 text-xl text-muted-foreground max-w-3xl mx-auto">
                        Choose the plan that's right for you and unlock the full potential of your real estate investments.
                    </p>
                </div>
                
                {isLoading || !hasHydrated ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto animate-fade-in-up">
                        {plans.map((plan) => (
                            <PricingPlan
                                key={plan.name}
                                plan={plan as {name: UserProfile['plan'], price: number, features: string[]}}
                                isCurrent={profileData?.plan === plan.name}
                                onUpgrade={handleUpgrade}
                                isUpdating={isUpdating === plan.name}
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
