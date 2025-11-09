
import Image from 'next/image';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <Image
        src="/ducknobackground.png"
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
