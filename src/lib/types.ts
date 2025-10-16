
'use client';
import { Timestamp } from "firebase/firestore";

export type UserProfile = {
    id?: string;
    name?: string;
    email?: string;
    photoURL?: string;
    country?: string;
    state?: string;
    financialGoal?: string;
    plan?: 'Free' | 'Pro' | 'Executive' | 'Elite';
};

export type DealStatus = 'In Works' | 'Negotiating' | 'Bought' | 'Owned & Operating' | 'Sold';

export type DealComment = {
    id: string;
    author: string;
    text: string;
    createdAt: Timestamp;
}

export type UnitMixItem = {
    type: string;
    count: number;
    rent: number;
}

export type LineItem = {
    name: string;
    amount: number;
}

export type Deal = {
    id: string;
    userId: string;
    dealName: string;
    dealType: 'Rental Property' | 'House Flip' | 'Commercial Multifamily';
    createdAt: Timestamp;
    
    // Purchase & Loan
    purchasePrice: number;
    closingCosts: number;
    rehabCost: number;
    arv: number;
    downPayment: number;
    loanTerm: number;
    interestRate: number;
    loanAmount?: number; // Added for commercial
    
    // Income
    grossMonthlyIncome: number;
    otherIncomes?: LineItem[]; 
    unitMix?: UnitMixItem[];

    // Expenses
    propertyTaxes: number;
    insurance: number;
    repairsAndMaintenance: number;
    vacancy: number;
    capitalExpenditures: number;
    managementFee: number;
    otherExpenses: number;
    operatingExpenses?: LineItem[];

    // Projections
    annualIncomeGrowth: number;
    annualExpenseGrowth: number;
    annualAppreciation: number;
    holdingLength: number; 
    sellingCosts: number;

    // Calculated Metrics
    monthlyCashFlow?: number;
    cocReturn?: number;
    noi?: number;
    capRate?: number;
    roi?: number;
    netProfit?: number;

    // Deal Management
    marketConditions: string;
    status: DealStatus;
    isPublished: boolean;
    investorNotes?: string;
    isAdvanced?: boolean;
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

export type ProFormaEntry = {
    year: number;
    grossPotentialRent: number;
    vacancyLoss: number;
    effectiveGrossIncome: number;
    operatingExpenses: number;
    noi: number;
    debtService: number;
    cashFlowBeforeTax: number;
    propertyValue: number;
    loanBalance: number;
    equity: number;
}

    
