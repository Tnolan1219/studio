import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DollarSign, BarChart, Briefcase, Sparkles } from "lucide-react";
import { mockTestimonials, mockFaqs } from "@/lib/mock-data";
import { NewsFeed } from "./news-feed";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Deal } from '@/lib/types';
import { useMemo } from "react";

export default function HomeTab() {
    const { user } = useUser();
    const firestore = useFirestore();

    const dealsCollection = useMemoFirebase(() => {
      if (!user || user.isAnonymous) return null;
      return collection(firestore, `users/${user.uid}/deals`);
    }, [firestore, user]);
    
    const { data: deals, isLoading: dealsLoading } = useCollection<Deal>(dealsCollection);

    const stats = useMemo(() => {
        if (!deals || user?.isAnonymous) {
            return {
                totalInvestment: 0,
                avgCocReturn: 0,
                dealCount: 0,
            };
        }

        const totalInvestment = deals.reduce((acc, deal) => acc + deal.purchasePrice, 0);
        const rentalDeals = deals.filter(deal => deal.dealType === 'Rental Property');
        const avgCocReturn = rentalDeals.length > 0
            ? rentalDeals.reduce((acc, deal) => acc + deal.cocReturn, 0) / rentalDeals.length
            : 0;

        return {
            totalInvestment,
            avgCocReturn,
            dealCount: deals.length,
        };
    }, [deals, user]);


    const getWelcomeName = () => {
        if (!user) return "Guest";
        if (user.isAnonymous) return "Guest";
        return user.displayName || user.email?.split('@')[0] || "User";
    }

    return (
        <div className="grid gap-6 animate-fade-in">
            <h1 className="text-3xl font-bold font-headline">Welcome back, {getWelcomeName()}!</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard 
                    title="Total Deals Analyzed"
                    value={user?.isAnonymous ? "0" : (dealsLoading ? "..." : stats.dealCount.toString())}
                    icon={<Briefcase className="h-4 w-4 text-muted-foreground" />}
                    description="Across all categories"
                />
                <StatCard 
                    title="Total Investment"
                    value={user?.isAnonymous ? "$0" : (dealsLoading ? "..." : `$${(stats.totalInvestment / 1000000).toFixed(2)}M`)}
                    icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
                    description="Purchase price of saved deals"
                />
                <StatCard 
                    title="Average CoC Return"
                    value={user?.isAnonymous ? "0%" : (dealsLoading ? "..." : `${stats.avgCocReturn.toFixed(1)}%`)}
                    icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
                    description="For your saved rental deals"
                />
                <StatCard 
                    title="Current Plan"
                    value={user?.isAnonymous ? "Guest" : "Pro"}
                    icon={<Sparkles className="h-4 w-4 text-muted-foreground" />}
                    description="Upgrade for more features"
                    isPrimary
                />
            </div>
            
            <div className="grid gap-4 lg:grid-cols-2">
                <NewsFeed />
                
                <Card className="bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>What's New</CardTitle>
                        <CardDescription>Latest updates and features.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ul className="space-y-4 text-sm">
                            <li className="flex items-start">
                                <span className="mr-2 mt-1">🚀</span>
                                <div>
                                    <strong>Commercial Multifamily Calculator:</strong> Now in beta! Analyze large apartment buildings with our most powerful tool yet.
                                </div>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 mt-1">✨</span>
                                <div>
                                    <strong>UI Refresh:</strong> Enjoy our new frosted glass look and feel, with improved performance on all devices.
                                </div>
                            </li>
                            <li className="flex items-start">
                                <span className="mr-2 mt-1">🤖</span>
                                <div>
                                    <strong>Smarter AI Assessments:</strong> Our AI now provides even more detailed risk analysis for house flips.
                                </div>
                            </li>
                        </ul>
                    </CardContent>
                </Card>
            </div>
            
            <div className="grid gap-4 lg:grid-cols-2">
                <Card className="bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Community Voice</CardTitle>
                        <CardDescription>What our members are saying.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Carousel
                            opts={{
                                align: "start",
                                loop: true,
                            }}
                            className="w-full"
                        >
                            <CarouselContent>
                                {mockTestimonials.map((t, i) => (
                                    <CarouselItem key={i}>
                                        <div className="p-1">
                                            <div className="flex flex-col items-center text-center p-6 space-y-4">
                                                <Avatar className="h-16 w-16">
                                                    <AvatarImage src={t.avatarUrl} data-ai-hint="person portrait" />
                                                    <AvatarFallback>{t.name.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                <p className="italic">"{t.text}"</p>
                                                <div>
                                                    <p className="font-semibold">{t.name}</p>
                                                    <p className="text-sm text-muted-foreground">{t.role}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CarouselItem>
                                ))}
                            </CarouselContent>
                            <CarouselPrevious className="hidden sm:flex"/>
                            <CarouselNext className="hidden sm:flex"/>
                        </Carousel>
                    </CardContent>
                </Card>

                <Card className="bg-card/60 backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle>Frequently Asked Questions</CardTitle>
                        <CardDescription>Quick answers to common questions.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Accordion type="single" collapsible className="w-full">
                            {mockFaqs.map((faq, i) => (
                                <AccordionItem value={`item-${i}`} key={i}>
                                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                                    <AccordionContent>{faq.answer}</AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </CardContent>
                </Card>
            </div>
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
