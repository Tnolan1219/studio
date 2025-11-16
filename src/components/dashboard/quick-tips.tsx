'use client';

import { BrainCircuit, Landmark, Newspaper, Scale, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const tips = [
    { icon: BrainCircuit, text: "1% Rule", link: 'https://www.investopedia.com/terms/o/one-percent-rule.asp' },
    { icon: Scale, text: "1031 Exchange", link: 'https://www.investopedia.com/financial-edge/0111/10-things-to-know-about-1031-exchanges.asp' },
    { icon: Landmark, text: "TKN Financial", link: 'https://tnolan1219.github.io/TKN-Financial-V.3/' },
    { icon: Newspaper, text: "Etsy Store", link: 'https://www.etsy.com/shop/TKNfinance?ref=shop-header-name' },
    { icon: Lightbulb, text: "70% Rule", link: 'https://www.investopedia.com/terms/o/one-percent-rule.asp' },
    { icon: BrainCircuit, text: "Cap Rate", link: 'https://www.investopedia.com/terms/c/capitalizationrate.asp' },
    { icon: Landmark, text: "Vacancy", link: '#' },
    { icon: Newspaper, text: "DealFlow", link: '#' },
];

const TipNode = ({ tip }: { tip: typeof tips[0] }) => {
    const Icon = tip.icon;
    return (
        <a href={tip.link} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <div className="flex flex-col items-center justify-center text-center p-4 bg-card/50 backdrop-blur-sm rounded-full border border-dashed aspect-square w-28 h-28 transition-all duration-300 hover:bg-primary/10 hover:border-primary">
                <Icon className="w-5 h-5 text-primary mb-2" />
                <p className="text-xs leading-tight font-semibold text-muted-foreground">{tip.text}</p>
            </div>
        </a>
    );
};

export function QuickTips() {
    const duplicatedTips = [...tips, ...tips];

    return (
        <Card className="bg-card/30 backdrop-blur-sm overflow-hidden">
            <CardHeader>
                <CardTitle className="font-headline">Quick Tips & Resources</CardTitle>
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
