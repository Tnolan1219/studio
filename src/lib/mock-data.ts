import type { User, Deal, Testimonial, FaqItem } from './types';

export const mockUser: User = {
    uid: '12345',
    name: 'John Doe',
    email: 'john.doe@example.com',
    country: 'USA',
    state: 'California',
    plan: 'Pro',
    dealCount: 7,
    nickname: 'JD',
    dutyStation: 'Fort Awesome',
    rank: 'E-7',
    branch: 'Army',
    financialGoal: 'Achieve financial independence through real estate.',
    avatarUrl: 'https://picsum.photos/seed/user-avatar/100/100',
};

export const mockDeals: Deal[] = [
    { id: '1', name: 'Oak Street Duplex', type: 'Rental', monthlyCashFlow: 450, cocReturn: 11.2, purchasePrice: 250000, profitability: 'high', createdAt: new Date('2024-05-01').toISOString() },
    { id: '2', name: 'Maple Ave Flip', type: 'Flip', monthlyCashFlow: 0, cocReturn: 25.5, purchasePrice: 180000, profitability: 'high', createdAt: new Date('2024-04-15').toISOString() },
    { id: '3', name: 'Downtown Commercial', type: 'Commercial', monthlyCashFlow: 2200, cocReturn: 8.1, purchasePrice: 1200000, profitability: 'medium', createdAt: new Date('2024-04-01').toISOString() },
    { id: '4', name: 'Elm Street Single', type: 'Rental', monthlyCashFlow: 150, cocReturn: 5.5, purchasePrice: 320000, profitability: 'low', createdAt: new Date('2024-03-20').toISOString() },
    { id: '5', name: 'Pine St Condo', type: 'Rental', monthlyCashFlow: 300, cocReturn: 9.8, purchasePrice: 210000, profitability: 'medium', createdAt: new Date('2024-03-10').toISOString() },
    { id: '6', name: 'Lakeside Flip', type: 'Flip', monthlyCashFlow: 0, cocReturn: 18.0, purchasePrice: 450000, profitability: 'high', createdAt: new Date('2024-02-22').toISOString() },
    { id: '7', name: 'Suburb Apartments', type: 'Commercial', monthlyCashFlow: 5500, cocReturn: 7.2, purchasePrice: 3500000, profitability: 'medium', createdAt: new Date('2024-01-05').toISOString() },
];

export const mockTestimonials: Testimonial[] = [
    { name: 'Sarah J.', role: 'Investor', avatarUrl: 'https://picsum.photos/seed/sarah/100/100', text: 'TKN Fi RE has revolutionized how I analyze deals. The AI assessment is a game-changer!' },
    { name: 'Mike R.', role: 'Real Estate Agent', avatarUrl: 'https://picsum.photos/seed/mike/100/100', text: 'I recommend this tool to all my clients. It simplifies complex financial calculations and provides clear, actionable insights.' },
    { name: 'Emily K.', role: 'First-time Home Buyer', avatarUrl: 'https://picsum.photos/seed/emily/100/100', text: 'As a beginner, I was overwhelmed. This analyzer made me feel confident in my first investment property purchase.' },
];

export const mockFaqs: FaqItem[] = [
    { question: 'What is TKN Fi RE?', answer: 'TKN Fi RE (Financial Real Estate) is an investment analyzer tool designed to help you make informed decisions about property investments.' },
    { question: 'How does the AI assessment work?', answer: 'Our AI analyzes the financial data and market conditions you provide to generate a comprehensive report on the deal\'s profitability, potential risks, and rewards.' },
    { question: 'Which subscription plan is right for me?', answer: 'The Free plan is great for getting started. The Pro plan is for active investors, and the Executive plan offers unlimited access for professionals.' },
    { question: 'Can I cancel my subscription anytime?', answer: 'Yes, you can manage your subscription and cancel at any time from your profile settings.' },
];

export const mockNewsHeadlines: string[] = [
    "Federal Reserve hints at interest rate stability through Q3.",
    "Housing market inventory shows slight increase in major metropolitan areas.",
    "Lumber prices drop, potentially lowering construction costs for new builds.",
    "Tech sector boom drives rental demand in Austin, TX and Seattle, WA.",
    "New legislation offers tax incentives for energy-efficient home renovations."
];
