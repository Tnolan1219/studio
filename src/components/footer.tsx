
'use client';

import Link from 'next/link';

export function Footer() {
    return (
        <footer className="absolute bottom-4 z-10 text-center w-full">
            <div className="flex justify-center gap-6 text-sm text-muted-foreground">
                <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Use</Link>
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
            </div>
        </footer>
    );
}
