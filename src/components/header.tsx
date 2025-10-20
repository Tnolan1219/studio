import Link from 'next/link';
import { Briefcase, LogOut, User, Settings, LogIn, Crown } from 'lucide-react';
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
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/logo';

export function Header() {
  const { setActiveTab } = useDashboardTab();

  const handleHomeClick = () => {
    setActiveTab('home');
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" onClick={handleHomeClick} className="mr-6 flex items-center space-x-2">
            <Logo className="h-8 w-8" priority />
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
  const plan = user.isAnonymous ? "Guest" : (profileData?.plan || "Free");
  const planStyles = {
    'Guest': '',
    'Free': '',
    'Pro': 'plan-pro shadow-primary/40',
    'Executive': 'plan-executive shadow-secondary/40',
    'Elite': 'plan-elite',
  };
  const currentPlanStyle = planStyles[plan as keyof typeof planStyles] || '';


  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className={cn("h-9 w-9", currentPlanStyle)}>
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
        <DropdownMenuItem onClick={() => setActiveTab('profile')}>
            <div className="flex justify-between items-center w-full">
                <div className="flex items-center">
                    <Crown className="mr-2 h-4 w-4 text-primary" />
                    <span>Plan</span>
                </div>
                <Badge variant={plan === 'Pro' || plan === 'Executive' || plan === 'Elite' ? 'default' : 'secondary'} className="capitalize">{plan}</Badge>
            </div>
        </DropdownMenuItem>
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
