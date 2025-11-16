'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card"
import { DollarSign, Zap, BarChart, Users, TrendingUp, Goal, Briefcase } from "lucide-react"
import { PortfolioVisualization } from "./portfolio-visualization";
import { NewsFeed } from "./news-feed";
import { QuickTips } from "./quick-tips";
import { AIChatBox } from "./ai-chat-box";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { useProfileStore } from "@/hooks/use-profile-store";
import { collection, query } from "firebase/firestore";
import type { Deal } from "@/lib/types";
import { useMemo } from "react";
import { Progress } from "../ui/progress";
import { ResponsiveContainer, PieChart, Pie, Cell } from "recharts";


export function HomeTab() {
    const { user } = useUser();
    const { profileData, hasHydrated } = useProfileStore();
    const firestore = useFirestore();

    const dealsQuery = useMemoFirebase(() => {
        if (!user || user.isAnonymous) return null;
        return query(collection(firestore, `users/${user.uid}/deals`));
    }, [firestore, user]);

    const { data: deals, isLoading: dealsLoading } = useCollection<Deal>(dealsQuery);

    const getWelcomeName = () => {
        if (!hasHydrated || !user) return "Investor";
        if (user.isAnonymous) return "Guest";
        return profileData?.name?.split(' ')[0] || user.displayName?.split(' ')[0] || "Investor";
    }

    const { portfolioValue, activeDeals, averageRoi, cashFlow } = useMemo(() => {
        if (!deals) return { portfolioValue: 0, activeDeals: 0, averageRoi: 0, cashFlow: 0 };
        const activeDealsList = deals.filter(d => d.status === 'Owned & Operating' || d.status === 'Bought');
        
        const portfolioValue = activeDealsList.reduce((acc, deal) => acc + (deal.arv || deal.purchasePrice), 0);
        const cashFlow = activeDealsList.reduce((acc, deal) => acc + (deal.monthlyCashFlow || 0), 0);

        const dealsWithReturn = activeDealsList.filter(d => (d.cocReturn || d.roi) && (d.cocReturn || d.roi)! > 0);
        const averageRoi = dealsWithReturn.length > 0 
            ? dealsWithReturn.reduce((acc, deal) => acc + (deal.cocReturn || deal.roi || 0), 0) / dealsWithReturn.length
            : 0;

        return { portfolioValue, activeDeals: activeDealsList.length, averageRoi, cashFlow };
    }, [deals]);

    const goalProgress = 35; // Static value for now
    const goalData = [{ value: goalProgress }, { value: 100 - goalProgress }];

    const kpiData = [
        { title: "Portfolio Value", value: `$${portfolioValue.toLocaleString(undefined, {maximumFractionDigits: 0})}`, icon: DollarSign, change: "+12.5%" },
        { title: "Active Deals", value: activeDeals, icon: Briefcase, change: "" },
        { title: "Average CoC/ROI", value: `${averageRoi.toFixed(1)}%`, icon: BarChart, change: "" },
        { title: "Monthly Cash Flow", value: `+$${cashFlow.toLocaleString(undefined, {maximumFractionDigits: 0})}`, icon: TrendingUp, change: "" },
    ];


    return (
        <div className="space-y-6">
            <h1 className="text-2xl md:text-3xl font-bold font-headline">Welcome Back, {getWelcomeName()}!</h1>
            
            <div className="grid grid-cols-12 gap-6">
                {kpiData.map((kpi, i) => (
                    <Card key={i} className="col-span-12 md:col-span-6 lg:col-span-3 bg-card/60 backdrop-blur-sm">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-headline">{kpi.title}</CardTitle>
                            <kpi.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{kpi.value}</div>
                        </CardContent>
                    </Card>
                ))}

                <div className="col-span-12">
                    <QuickTips />
                </div>

                <div className="col-span-12 lg:col-span-8">
                     <PortfolioVisualization deals={deals || []} />
                </div>
                
                 <div className="col-span-12 lg:col-span-4">
                     <Card className="bg-card/60 backdrop-blur-sm h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="font-headline flex items-center gap-2">
                                <Goal className="w-5 h-5"/>
                                Goal In Focus
                            </CardTitle>
                            <CardDescription>Your top priority financial goal.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="relative h-40 w-40">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie data={goalData} dataKey="value" innerRadius="70%" outerRadius="100%" startAngle={90} endAngle={450} cornerRadius={50} paddingAngle={0}>
                                            <Cell fill="hsl(var(--primary))" />
                                            <Cell fill="hsl(var(--muted))" />
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-3xl font-bold font-headline">{goalProgress}%</span>
                                </div>
                            </div>
                            <p className="mt-4 font-semibold max-w-[90%] truncate">{profileData.financialGoal || "Set your financial goal in your profile!"}</p>
                        </CardContent>
                    </Card>
                </div>


                <div className="col-span-12">
                    <Card className="bg-card/60 backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="font-headline">Market News</CardTitle>
                             <CardDescription>AI-curated news based on your location.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <NewsFeed />
                        </CardContent>
                    </Card>
                </div>
            </div>

            <AIChatBox />
        </div>
    )
}
