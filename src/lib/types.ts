export type User = {
    uid: string;
    name: string;
    email: string;
    country: string;
    state: string;
    plan: 'Free' | 'Pro' | 'Executive';
    dealCount: number;
    nickname: string;
    dutyStation: string;
    rank: string;
    branch: string;
    financialGoal: string;
    avatarUrl: string;
};

export type Deal = {
    id: string;
    name: string;
    type: 'Rental' | 'Flip' | 'Commercial';
    monthlyCashFlow: number;
    cocReturn: number;
    purchasePrice: number;
    profitability: 'high' | 'medium' | 'low';
    createdAt: string;
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
