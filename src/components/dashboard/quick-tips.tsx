'use client';

import { BrainCircuit, Landmark, Newspaper, Scale, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const tips = [
    { icon: BrainCircuit, text: "Use the '1% Rule' as a quick screening test for rental properties.", link: 'https://www.investopedia.com/terms/o/one-percent-rule.asp' },
    { icon: Scale, text: "A 1031 Exchange can defer capital gains taxes on investment property sales.", link: 'https://www.investopedia.com/financial-edge/0111/10-things-to-know-about-1031-exchanges.asp' },
    { icon: Landmark, text: "Check out our partner site, TKN Financial, for military-specific finance tips.", link: 'https://tnolan1219.github.io/TKN-Financial-V.3/' },
    { icon: Newspaper, text: "Our Etsy store has more financial planning tools and spreadsheets.", link: 'https://www.etsy.com/shop/TKNfinance?ref=shop-header-name' },
    { icon: Lightbulb, text: "The '70% Rule' in house flipping helps estimate your maximum offer price.", link: 'https://www.investopedia.com/terms/o/one-percent-rule.asp' },
    { icon: BrainCircuit, text: "Analyze a property's Cap Rate to quickly compare its profitability to other investments.", link: 'https://www.investopedia.com/terms/c/capitalizationrate.asp' },
    { icon: Landmark, text: "Don't forget to account for vacancy when calculating cash flow.", link: '#' },
    { icon: Newspaper, text: "Use the 'DealFlow' feature to manage your property from acquisition to exit.", link: '#' },
];

const TipNode = ({ tip }: { tip: typeof tips[0] }) => {
    const Icon = tip.icon;
    return (
        <a href={tip.link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <div className="flex flex-col items-center justify-center text-center p-4 bg-card/50 backdrop-blur-sm rounded-full border border-dashed aspect-square w-32 h-32 transition-all duration-300 hover:bg-primary/10 hover:border-primary">
                <Icon className="w-6 h-6 text-primary mb-2" />
                <p className="text-[10px] leading-tight text-muted-foreground">{tip.text}</p>
            </div>
        </a>
    );
};

export function QuickTips() {
    // Duplicate the tips to create a seamless loop for the marquee
    const duplicatedTips = [...tips, ...tips];

    return (
        <Card className="bg-card/30 backdrop-blur-sm overflow-hidden">
            <CardHeader>
                <CardTitle className="font-headline">Quick Tips & Resources</CardTitle>
                <CardDescription>A scrolling feed of bite-sized real estate wisdom.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="relative w-full">
                    <div className="flex gap-4 marquee-content">
                        {duplicatedTips.map((tip, index) => (
                            <TipNode key={index} tip={tip} />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
