'use client';
import { Timestamp } from "firebase/firestore";

export type UserProfile = {
    id?: string;
    name?: string;
    email?: string;
    country?: string;
    state?: string;
    financialGoal?: string;
};

export type DealStatus = 'In Works' | 'Negotiating' | 'Bought' | 'Owned & Operating' | 'Sold';

export type DealComment = {
    id: string;
    author: string;
    text: string;
    createdAt: Timestamp;
}

export type Deal = {
    id: string;
    dealName: string;
    dealType: 'Rental Property' | 'House Flip' | 'Commercial Multifamily';
    monthlyCashFlow?: number;
    cocReturn?: number;
    purchasePrice: number;
    createdAt: Timestamp | string; // Support both server and client-side representations
    // Rental fields
    downPayment?: number;
    interestRate?: number;
    loanTerm?: number;
    monthlyIncome?: number;
    monthlyExpenses?: number;
    // Flip fields
    arv?: number;
    rehabCost?: number;
    holdingCosts?: number;
    sellingCosts?: number;
    netProfit?: number;
    roi?: number;
    // Commercial fields
    noi?: number;
    capRate?: number;
    // Common fields
    marketConditions: string;
    userId: string;
    status: DealStatus;
    isPublished: boolean;
    investorNotes?: string;
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
