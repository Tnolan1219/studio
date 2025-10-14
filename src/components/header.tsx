
import Link from 'next/link';
import { Briefcase, LogOut, User, Settings, LogIn } from 'lucide-react';
import { useRouter } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth, useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { ThemeToggle } from './theme-toggle';
import { useDashboardTab } from '@/hooks/use-dashboard-tab';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';


const ValentorLogo = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
        <defs>
            <linearGradient id="duckGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--secondary))', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        <path d="M16.5 4C14.78 4 13.5 5.28 13.5 7C13.5 8.72 14.78 10 16.5 10C17.2 10 17.84 9.77 18.37 9.38C19.46 8.7 20.13 7.8 20.31 7.19C20.41 6.84 20.5 6.5 20.5 6C20.5 4.89 19.61 4 18.5 4H16.5Z" fill="url(#duckGradient)" />
        <path d="M19.69 11.52C19.26 12.3 18.5 13.34 17.18 14.15C16.16 14.75 14.93 15.03 13.82 15.03C12.03 15.03 10.37 14.18 9.32 12.87C8.75 12.16 8.35 11.32 8.12 10.41L8.09 10.29C8.04 10.12 8 9.94 8 9.75C8 9.17 8.16 8.62 8.44 8.13C6.42 8.54 4.5 10.13 4.5 12.25C4.5 13.48 5.11 14.6 6.13 15.36C6.67 15.77 7.3 16 8 16H11.5C11.89 16 12.27 15.93 12.63 15.79C13.56 15.45 14.36 14.86 15.03 14.15C16.48 12.67 17.5 11.5 17.5 9.75C17.5 9.33 17.43 8.92 17.32 8.52C18.4 9.15 19.34 10.22 19.69 11.52Z" fill="url(#duckGradient)" />
        <path d="M12 16.5C10.62 16.5 9.5 17.62 9.5 19C9.5 19.83 9.89 20.57 10.5 21.09V21.1C10.5 21.1 10.5 21.1 10.5 21.1C10.5 21.1 12 20 12 20C12 20 13.5 21.1 13.5 21.1C13.5 21.1 13.5 21.1 13.5 21.09C14.11 20.57 14.5 19.83 14.5 19C14.5 17.62 13.38 16.5 12 16.5Z" fill="url(#duckGradient)" opacity="0.0" />
    </svg>
)

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <ValentorLogo />
            <span className="hidden font-bold font-headline sm:inline-block">
              Valentor Financial
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-2">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}

function UserNav() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { setActiveTab } = useDashboardTab();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profileData } = useDoc<UserProfile>(userProfileRef);

  const handleLogout = () => {
    auth.signOut();
    router.push('/');
  };

  const handleLogin = () => {
    router.push('/');
  }

  if (isUserLoading) {
      return <Button variant="ghost" className="relative h-8 w-8 rounded-full animate-pulse bg-muted"></Button>
  }
  
  if (!user) {
    return (
      <Button onClick={handleLogin}>
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    )
  }

  const getInitials = () => {
    if (user.isAnonymous) return 'G';
    const name = profileData?.name || user.displayName;
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }
  
  const photoURL = profileData?.photoURL || user.photoURL;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            {photoURL && <AvatarImage src={photoURL} alt={profileData?.name || 'User'} data-ai-hint="person" />}
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.isAnonymous ? "Guest User" : profileData?.name || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.isAnonymous ? "Logged in as guest" : user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => setActiveTab('profile')}>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveTab('deals')}>
            <Briefcase className="mr-2 h-4 w-4" />
            <span>My Deals</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setActiveTab('profile')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
