
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
    const { profileData, setProfileData } = useProfileStore();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const handleUpgrade = async (planName: string) => {
        if (!user || !firestore) return;
        
        try {
            const userRef = doc(firestore, 'users', user.uid);
            await setDoc(userRef, { plan: planName }, { merge: true });
            setProfileData({ plan: planName as 'Free' | 'Pro' | 'Executive' });
            toast({
                title: 'Plan updated!',
                description: `You are now on the ${planName} plan.`,
            });
            router.push('/dashboard');
        } catch (error) {
            toast({
                title: 'Error updating plan',
                description: 'Please try again later.',
                variant: 'destructive',
            });
        }
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Header />
            <FirebaseDataInitializer />
            <div className="container mx-auto px-4 py-16">
                <div className="text-center mb-16">
                    <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
                        Pricing Plans
                    </h1>
                    <p className="mt-4 text-xl text-gray-400 max-w-3xl mx-auto">
                        Choose the plan that's right for you and unlock the full potential of your real estate investments.
                    </p>
                </div>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-7xl mx-auto">
                    {plans.map((plan, i) => (
                        <PricingPlan
                            key={i}
                            plan={plan}
                            isCurrent={profileData?.plan === plan.name}
                            onUpgrade={handleUpgrade}
                        />
                    ))}
                </div>
            </div>
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
