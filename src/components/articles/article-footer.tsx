
'use client';

import Link from 'next/link';

export function ArticleFooter() {
    const sources = [
        { name: "Freddie Mac, Primary Mortgage Market Survey®", url: "https://www.freddiemac.com/pmms" },
        { name: "S&P Dow Jones Indices, S&P CoreLogic Case-Shiller Home Price Index", url: "https://www.spglobal.com/spdji/en/indices/indicators/sp-corelogic-case-shiller-us-national-home-price-nsa-index/" },
        { name: "Investopedia, Debt-Service Coverage Ratio (DSCR)", url: "https://www.investopedia.com/terms/d/dscr.asp" }
    ];

    return (
        <footer className="bg-card/60 backdrop-blur-lg border-t border-border/20 mt-16 py-8">
            <div className="container mx-auto px-4 max-w-4xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Disclaimer</h3>
                        <p className="text-sm text-muted-foreground">
                            The information provided in this article is for informational purposes only and does not constitute financial, investment, or legal advice. All investment strategies, including the BRRRR method, carry a risk of loss. Past performance is not indicative of future results. You should consult with a qualified professional before making any investment decisions.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-lg mb-2">Sources</h3>
                        <ul className="space-y-1 text-sm">
                            {sources.map(source => (
                                <li key={source.name}>
                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground hover:underline transition-colors">
                                        {source.name}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
                <div className="border-t border-border/20 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-sm">
                    <p className="text-muted-foreground">&copy; {new Date().getFullYear()} Valentor RE. All Rights Reserved.</p>
                     <div className="flex justify-center gap-6 text-sm text-muted-foreground mt-4 md:mt-0">
                        <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                        <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Use</Link>
                        <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
