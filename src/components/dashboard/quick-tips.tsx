
'use client';

import { Lightbulb } from 'lucide-react';
import Link from 'next/link';

const tips = [
    { text: "The '1% Rule' is a quick screening test for rentals. Does the gross monthly rent equal at least 1% of the purchase price?", link: "https://www.investopedia.com/terms/1/one-percent-rule.asp" },
    { text: "Use a Self-Directed IRA (SDIRA) to invest in real estate with tax-advantaged funds.", link: "https://www.forbes.com/advisor/retirement/self-directed-ira-real-estate/" },
    { text: "Seller financing can be a powerful tool in a high-interest rate environment. Always negotiate it.", link: null },
    { text: "Remember the 50% Rule for operating expenses on a rental property as a quick estimate during initial analysis.", link: null },
    { text: "Check local zoning laws on sites like Municode before assuming you can add an Accessory Dwelling Unit (ADU).", link: "https://www.municode.com/" },
    { text: "For flips, the 70% Rule states you should pay no more than 70% of the ARV minus rehab costs.", link: null },
    { text: "Did you know you can manage your deal stages in the 'DealFlow' view? Click a deal to get started.", link: null },
    { text: "Visit the TKN Financial Etsy store for more tools.", link: "https://www.etsy.com/shop/TKNfinance?ref=shop-header-name" },
    { text: "Military? Check out our sister site for personal finance guides.", link: "https://tnolan1219.github.io/TKN-Financial-V.3/" },
];

// Duplicate the tips to ensure a seamless loop
const allTips = [...tips, ...tips];

export function QuickTips() {

    return (
        <div className="relative w-full overflow-hidden bg-card/30 backdrop-blur-sm rounded-xl border py-4">
            <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-card to-transparent z-10"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-card to-transparent z-10"></div>
            <div className="marquee-content flex gap-8">
                {allTips.map((tip, index) => (
                    <div key={index} className="flex-shrink-0 flex items-center gap-3 bg-card/60 px-4 py-2 rounded-full border border-border/50">
                        <Lightbulb className="w-5 h-5 text-primary flex-shrink-0" />
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                            {tip.text}
                            {tip.link && (
                                <Link href={tip.link} target="_blank" rel="noopener noreferrer" className="ml-2 text-primary hover:underline font-semibold">
                                    Learn more
                                </Link>
                            )}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
