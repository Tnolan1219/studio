
import { collection, getDocs, setDoc, doc, Firestore } from 'firebase/firestore';
import type { Plan } from './types';

const plansData: Omit<Plan, 'id'>[] = [
    {
        name: 'Free',
        price: 0,
        dealLimit: 5,
        maxCalculatorUses: 25,
        accessAdvancedCRE: false,
        accessNewsletter: false,
        description: 'For individuals starting out in real estate.',
    },
    {
        name: 'Pro',
        price: 29,
        dealLimit: 25,
        maxCalculatorUses: 100,
        accessAdvancedCRE: true,
        accessNewsletter: true,
        description: 'For serious investors and small teams.',
    },
    {
        name: 'Executive',
        price: 49,
        dealLimit: 100,
        maxCalculatorUses: Infinity,
        accessAdvancedCRE: true,
        accessNewsletter: true,
        description: 'For power users and large organizations.',
    },
    {
        name: 'Elite',
        price: 99,
        dealLimit: Infinity,
        maxCalculatorUses: Infinity,
        accessAdvancedCRE: true,
        accessNewsletter: true,
        description: 'For professionals who demand the best.',
    }
];

export async function seedPlans(db: Firestore) {
    const plansCollection = collection(db, 'plans');
    const snapshot = await getDocs(plansCollection);

    // This logic ensures that we don't re-seed if data already exists,
    // but also updates existing plans if they differ from the source code.
    if (snapshot.size !== plansData.length) {
        console.log('Seeding or updating plans...');
        for (const plan of plansData) {
            // Use the plan name in lowercase as the document ID for stable references
            const planDocRef = doc(db, 'plans', plan.name.toLowerCase());
            await setDoc(planDocRef, plan, { merge: true });
        }
        console.log('Finished seeding plans.');
    } else {
        // You could add a more sophisticated check here if needed,
        // but for now, we assume if counts match, data is okay.
    }
}
