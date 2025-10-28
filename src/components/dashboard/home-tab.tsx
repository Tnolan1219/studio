
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DollarSign, BarChart, Briefcase, Home, Building, Repeat, TrendingUp, PiggyBank, Scale } from "lucide-react";
import { NewsFeed } from "./news-feed";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import type { Deal, ProFormaEntry } from '@/lib/types';
import { useMemo } from "react";
import { RealEstateQueryBox } from "./real-estate-query-box";
import { Skeleton } from "../ui/skeleton";
import {
    ResponsiveContainer,
    BarChart as RechartsBarChart,
    PieChart,
    Pie,
    Cell,
    Bar as RechartsBar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
} from 'recharts';
import { useDashboardTab } from "@/hooks/use-dashboard-tab";
import { Button } from "../ui/button";

const calculateProForma = (deal: Deal): ProFormaEntry[] => {
    const proForma: ProFormaEntry[] = [];
    if (!deal || deal.dealType === 'House Flip') return [];

    const loanAmount = deal.purchasePrice - deal.downPayment;
    const monthlyInterestRate = deal.interestRate / 100 / 12;
    const numberOfPayments = deal.loanTerm * 12;
    const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
        (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
        : 0;

    let currentGrossRent = deal.grossMonthlyIncome * 12;
    let currentPropertyValue = deal.arv || deal.purchasePrice;
    let currentLoanBalance = loanAmount;
    
    for (let year = 1; year <= 10; year++) {
        const vacancyLoss = currentGrossRent * (deal.vacancy / 100);
        const effectiveGrossIncome = currentGrossRent - vacancyLoss;
        const taxesAmount = effectiveGrossIncome * (deal.propertyTaxes / 100);
        const insuranceAmount = effectiveGrossIncome * (deal.insurance / 100);
        const maintenanceAmount = effectiveGrossIncome * (deal.repairsAndMaintenance/100);
        const capexAmount = effectiveGrossIncome * (deal.capitalExpenditures/100);
        const managementAmount = effectiveGrossIncome * (deal.managementFee/100);
        const otherAmount = effectiveGrossIncome * (deal.otherExpenses/100);

        const currentOpEx = taxesAmount + insuranceAmount + maintenanceAmount + capexAmount + managementAmount + otherAmount;
        const noi = effectiveGrossIncome - currentOpEx;

        let yearEndLoanBalance = currentLoanBalance;
        if(monthlyInterestRate > 0 && yearEndLoanBalance > 0) {
            for (let i = 0; i < 12; i++) {
                const interestPayment = yearEndLoanBalance * monthlyInterestRate;
                const principalPayment = (debtService / 12) - interestPayment;
                yearEndLoanBalance -= principalPayment;
            }
        } else {
            yearEndLoanBalance = 0;
        }

        proForma.push({
            year,
            grossPotentialRent: currentGrossRent,
            vacancyLoss,
            effectiveGrossIncome,
            operatingExpenses: currentOpEx,
            noi,
            debtService,
            cashFlowBeforeTax: noi - debtService,
            propertyValue: currentPropertyValue,
            loanBalance: yearEndLoanBalance,
            equity: currentPropertyValue - yearEndLoanBalance,
        });
        
        currentGrossRent *= (1 + deal.annualIncomeGrowth / 100);
        currentPropertyValue *= (1 + deal.annualAppreciation / 100);
        currentLoanBalance = yearEndLoanBalance;
    }
    return proForma;
};


export default function HomeTab() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { setActiveTab } = useDashboardTab();

    const dealsCollection = useMemoFirebase(() => {
      if (!user || user.isAnonymous) return null;
      return collection(firestore, `users/${user.uid}/deals`);
    }, [firestore, user]);
    
    const { data: deals, isLoading: dealsLoading } = useCollection<Deal>(dealsCollection);

    const portfolioStats = useMemo(() => {
        if (!deals || user?.isAnonymous || deals.length === 0) {
            return {
                totalInvestment: 0,
                totalValue: 0,
                totalEquity: 0,
                annualCashFlow: 0,
                dealCount: 0,
                portfolioBreakdown: [],
                equityLoanData: [],
            };
        }
        
        let totalInvestment = 0;
        let totalValue = 0;
        let totalLoanBalance = 0;
        let annualCashFlow = 0;
        const typeCounts: Record<string, number> = {
            'Rental Property': 0,
            'House Flip': 0,
            'Commercial Multifamily': 0,
        };

        deals.forEach(deal => {
            totalInvestment += deal.purchasePrice;
            typeCounts[deal.dealType]++;
            const proForma = calculateProForma(deal);
            const firstYear = proForma[0];
            if (firstYear) {
                totalValue += firstYear.propertyValue;
                totalLoanBalance += firstYear.loanBalance;
                annualCashFlow += firstYear.cashFlowBeforeTax;
            } else if (deal.dealType === 'House Flip') {
                totalValue += deal.arv;
                totalLoanBalance += (deal.purchasePrice - deal.downPayment);
            }
        });

        const totalEquity = totalValue - totalLoanBalance;

        const portfolioBreakdown = Object.entries(typeCounts)
            .filter(([, count]) => count > 0)
            .map(([name, value]) => ({ name, value }));

        const equityLoanData = [
            { name: 'Total Equity', value: totalEquity, fill: 'hsl(var(--chart-1))' },
            { name: 'Total Loan Balance', value: totalLoanBalance, fill: 'hsl(var(--chart-5))' },
        ];


        return {
            totalInvestment,
            totalValue,
            totalEquity,
            annualCashFlow,
            dealCount: deals.length,
            portfolioBreakdown,
            equityLoanData,
        };
    }, [deals, user]);

    const formatCurrency = (value: number) => {
        if (Math.abs(value) >= 1_000_000) {
            return `$${(value / 1_000_000).toFixed(2)}M`;
        }
        if (Math.abs(value) >= 1_000) {
            return `$${(value / 1_000).toFixed(1)}k`;
        }
        return `$${value.toFixed(0)}`;
    };

    const getWelcomeName = () => {
        if (!user) return "Guest";
        if (user.isAnonymous) return "Guest";
        return user.displayName?.split(' ')[0] || user.email?.split('@')[0] || "User";
    };

    if (dealsLoading) {
        return (
            <div className="grid gap-6 animate-fade-in">
                <Skeleton className="h-9 w-64" />
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
                </div>
                 <div className="grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-80" />
                    <Skeleton className="h-80" />
                </div>
            </div>
        )
    }

    if (portfolioStats.dealCount === 0) {
        return (
            <div className="text-center py-16 border-2 border-dashed rounded-lg animate-fade-in">
               <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
               <h3 className="mt-4 text-xl font-semibold">Welcome to your Dashboard, {getWelcomeName()}!</h3>
               <p className="mt-2 text-muted-foreground">You haven't analyzed any deals yet. Get started by analyzing your first property.</p>
               <Button className="mt-6" onClick={() => setActiveTab('analyze')}>
                   Analyze a New Deal
               </Button>
            </div>
        )
    }

    return (
        <div className="grid gap-6 animate-fade-in">
            <h1 className="text-3xl font-bold font-headline">Welcome back, {getWelcomeName()}!</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Portfolio Value"
                    value={formatCurrency(portfolioStats.totalValue)}
                    icon={<Home className="h-4 w-4 text-muted-foreground" />}
                    description="Estimated current value of all deals"
                />
                <StatCard 
                    title="Estimated Equity"
                    value={formatCurrency(portfolioStats.totalEquity)}
                    icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
                    description="Value minus outstanding loan balances"
                />
                <StatCard 
                    title="Annual Cash Flow"
                    value={formatCurrency(portfolioStats.annualCashFlow)}
                    icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
                    description="Pre-tax cash flow from all rentals"
                />
                <StatCard 
                    title="Total Deals"
                    value={portfolioStats.dealCount.toString()}
                    icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
                    description="Number of deals in your portfolio"
                    isPrimary
                />
            </div>
            
            <div className="grid gap-4 lg:grid-cols-5">
                <Card className="lg:col-span-2 bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Portfolio Breakdown</CardTitle>
                        <CardDescription>Asset allocation by deal type.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie 
                                    data={portfolioStats.portfolioBreakdown} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80}
                                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                >
                                    {portfolioStats.portfolioBreakdown.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [`${value} ${value > 1 ? 'deals' : 'deal'}`, name]} />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                
                <Card className="lg:col-span-3 bg-card/60 backdrop-blur-sm">
                     <CardHeader>
                        <CardTitle>Equity vs. Loan</CardTitle>
                        <CardDescription>Your total equity compared to outstanding loan balances.</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <RechartsBarChart data={portfolioStats.equityLoanData} layout="vertical" margin={{ left: 30 }}>
                               <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis type="number" tickFormatter={formatCurrency} />
                                <YAxis type="category" dataKey="name" width={80} />
                                <Tooltip formatter={(value) => formatCurrency(value as number)} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                                <RechartsBar dataKey="value" barSize={35} radius={[0, 4, 4, 0]}>
                                     {portfolioStats.equityLoanData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                </RechartsBar>
                            </RechartsBarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <NewsFeed />
        </div>
    );
}

function StatCard({ title, value, icon, description, isPrimary=false }: { title: string, value: string, icon: React.ReactNode, description: string, isPrimary?: boolean }) {
    return (
        <Card className={`bg-card/60 backdrop-blur-sm ${isPrimary ? 'bg-primary/20' : ''}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {icon}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Card>
    )
}
