'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useDashboardTab } from '@/hooks/use-dashboard-tab';

export function Logo() {
  const { setActiveTab } = useDashboardTab();

  const handleClick = () => {
    setActiveTab('home');
  };

  return (
    <Link href="/" className="flex items-center gap-2" onClick={handleClick}>
      <Image
        src="/logo3.png"
        alt="Valentor RE Logo"
        width={40}
        height={40}
        className="rounded-full"
      />
      <span className="text-xl font-bold font-headline text-foreground">
        Valentor RE
      </span>
    </Link>
  );
}
