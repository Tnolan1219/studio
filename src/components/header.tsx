
'use client';
import { useUser } from '@/firebase/auth/use-user';
import { Logo } from '@/components/logo';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useDashboardTab } from '@/hooks/use-dashboard-tab';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export function Header() {
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const { setActiveTab } = useDashboardTab();

  const handleSignOut = async () => {
    try {
      if(auth) {
        await signOut(auth);
      }
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const navigateToTab = (tab: string) => {
    setActiveTab(tab);
    router.push('/');
  }

  const getInitials = () => {
    if (!user) return "?";
    if (user.isAnonymous) return 'G';
    const name = user.displayName;
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center">
          <Logo />
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer h-9 w-9">
                  <AvatarImage src={user.photoURL ?? ''} />
                  <AvatarFallback>
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{user.isAnonymous ? "Guest" : (user.displayName || user.email)}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigateToTab('home')}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateToTab('profile')}>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/plans')}>
                  Upgrade Plan
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigateToTab('settings')}>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
             <Link href="/login" passHref>
                <Button className="font-bold plan-pro">
                    Sign In
                </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
