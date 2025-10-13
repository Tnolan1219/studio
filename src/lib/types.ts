import { Timestamp } from "firebase/firestore";

export type UserProfile = {
    id?: string;
    name?: string;
    email?: string;
    country?: string;
    state?: string;
    financialGoal?: string;
};

export type Deal = {
    id: string;
    dealName: string;
    dealType: 'Rental Property' | 'House Flip' | 'Commercial Multifamily';
    monthlyCashFlow: number;
    cocReturn: number;
    purchasePrice: number;
    createdAt: Timestamp | string; // Support both server and client-side representations
    // All other form fields from RentalCalculator
    downPayment: number;
    interestRate: number;
    loanTerm: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    marketConditions: string;
    userId: string;
};

export type Testimonial = {
    name: string;
    role: string;
    avatarUrl: string;
    text: string;
};

export type FaqItem = {
    question: string;
    answer: string;
};
