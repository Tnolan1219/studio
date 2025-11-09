'use client';

import { BrainCircuit, Landmark, Newspaper, Scale, Lightbulb } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"


const tips = [
    {
        icon: BrainCircuit,
        text: "Use the '1% Rule' as a quick screening test for rental properties.",
        link: 'https://www.investopedia.com/terms/o/one-percent-rule.asp'
    },
    {
        icon: Scale,
        text: "A 1031 Exchange can defer capital gains taxes on investment property sales.",
        link: 'https://www.investopedia.com/financial-edge/0111/10-things-to-know-about-1031-exchanges.aspx'
    },
    {
        icon: Landmark,
        text: "Check out our partner site, TKN Financial, for military-specific finance tips.",
        link: 'https://tnolan1219.github.io/TKN-Financial-V.3/'
    },
    {
        icon: Newspaper,
        text: "Our Etsy store has more financial planning tools and spreadsheets.",
        link: 'https://www.etsy.com/shop/TKNfinance?ref=shop-header-name'
    },
     {
        icon: Lightbulb,
        text: "The '70% Rule' in house flipping helps estimate your maximum offer price.",
        link: 'https://www.investopedia.com/terms/o/one-percent-rule.asp'
    },
];

const TipCard = ({ tip }: { tip: typeof tips[0] }) => {
    const Icon = tip.icon;
    return (
        <a href={tip.link} target="_blank" rel="noopener noreferrer" className="block h-full">
            <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-card/50 backdrop-blur-sm rounded-full border border-dashed aspect-square transition-all duration-300 hover:bg-primary/10 hover:border-primary">
                <Icon className="w-8 h-8 text-primary mb-3" />
                <p className="text-xs text-muted-foreground">{tip.text}</p>
            </div>
        </a>
    );
};


export function QuickTips() {
    return (
        <Card className="bg-card/30 backdrop-blur-sm">
            <CardHeader>
                <CardTitle>Quick Tips & Resources</CardTitle>
                <CardDescription>Bite-sized real estate wisdom and useful links.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Carousel opts={{ align: "start", loop: false }}>
                    <CarouselContent className="-ml-4">
                        {tips.map((tip, index) => (
                        <CarouselItem key={index} className="md:basis-1/3 lg:basis-1/5 pl-4">
                            <TipCard tip={tip} />
                        </CarouselItem>
                        ))}
                    </CarouselContent>
                    <CarouselPrevious />
                    <CarouselNext />
                </Carousel>
            </CardContent>
        </Card>
    );
}
