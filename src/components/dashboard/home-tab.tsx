
'use client';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { DollarSign, Zap, BarChart, Users, FileText } from "lucide-react"
import { PortfolioVisualization } from "./portfolio-visualization";
import { NewsFeed } from "./news-feed";
import { QuickTips } from "./quick-tips";
import { Chatbot } from "./chatbot";

const kpiData = [
    { title: "Portfolio Value", value: "$1,250,000", icon: DollarSign, change: "+12.5%" },
    { title: "Active Deals", value: "8", icon: Zap, change: "+2" },
    { title: "Average ROI", value: "15.2%", icon: BarChart, change: "-0.8%" },
    { title: "Community Rank", value: "#12", icon: Users, change: "Top 10%" },
]

export function HomeTab() {

    return (
        <div className="grid grid-cols-12 gap-6">
            {kpiData.map((kpi, i) => (
                <Card key={i} className="col-span-12 md:col-span-6 lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
                        <kpi.icon className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{kpi.value}</div>
                        <p className="text-xs text-muted-foreground">{kpi.change} from last month</p>
                    </CardContent>
                </Card>
            ))}

            <Card className="col-span-12 lg:col-span-8 h-[400px]">
                <CardHeader>
                    <CardTitle>Portfolio Performance</CardTitle>
                </CardHeader>
                <CardContent>
                    <PortfolioVisualization />
                </CardContent>
            </Card>

            <Card className="col-span-12 lg:col-span-4 h-[400px] flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5"/> Market News</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow overflow-hidden">
                    <NewsFeed />
                </CardContent>
            </Card>

            <div className="col-span-12">
                <QuickTips />
            </div>

            <Chatbot />
        </div>
    )
}
