
import { collection, getDocs, addDoc, Firestore } from 'firebase/firestore';
import type { Plan } from './types';

const plansData: Omit<Plan, 'id'>[] = [
    {
        name: 'Free',
        description: 'For individuals starting out in real estate.',
        price: 0,
        dealLimit: 5,
    },
    {
        name: 'Pro',
        description: 'For serious investors and small teams.',
        price: 49,
        dealLimit: 25,
    },
    {
        name: 'Executive',
        description: 'For power users and large organizations.',
        price: 99,
        dealLimit: Infinity,
    }
];

export async function seedPlans(db: Firestore) {
    const plansCollection = collection(db, 'plans');
    const snapshot = await getDocs(plansCollection);

    if (snapshot.empty) {
        console.log('No plans found. Seeding database...');
        for (const plan of plansData) {
            await addDoc(plansCollection, plan);
        }
        console.log('Finished seeding plans.');
    } else {
        console.log('Plans collection already exists. Skipping seed.');
    }
}
