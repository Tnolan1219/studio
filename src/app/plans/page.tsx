
'use client';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { Header } from '@/components/header';
import { PricingPlan } from '@/components/pricing-plan';
import { useProfileStore } from '@/store/profile-store';
import { useUser } from '@/firebase/auth/use-user';
import { useFirestore } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { FirebaseDataInitializer } from '@/firebase/data-initializer';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

// Hardcoding the plan data to ensure it's always available on the page
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
        price: 49,
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
        name: 'Executive',
        price: 99,
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
    const { profileData, isLoading } = useProfileStore();
    const [isUpdating, setIsUpdating] = useState(false);

    const handleUpgrade = async (planName: string) => {
        if (!user || user.isAnonymous) {
            toast({ title: "Account Required", description: "Please create an account to upgrade your plan." });
            return;
        }
        if (!firestore) return;

        setIsUpdating(true);
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, { plan: planName }, { merge: true });
            
            useProfileStore.getState().setProfileData({ plan: planName as 'Free' | 'Pro' | 'Executive' });

            toast({
                title: 'Plan Updated!',
                description: `You are now on the ${planName} plan.`,
            });
            router.push('/dashboard');
        } catch (error) {
            console.error("Failed to update plan: ", error);
            toast({
                title: 'Error updating plan',
                description: 'Could not update your plan. Please try again.',
                variant: 'destructive',
            });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="min-h-screen">
            <Header />
            <FirebaseDataInitializer />
            <main className="container mx-auto px-4 py-16">
                 <Button variant="ghost" onClick={() => router.push('/dashboard')} className="mb-8">
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
                
                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto animate-fade-in-up">
                        {plans.map((plan, i) => (
                            <PricingPlan
                                key={i}
                                plan={plan}
                                isCurrent={profileData?.plan === plan.name}
                                onUpgrade={handleUpgrade}
                                isUpdating={isUpdating}
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
