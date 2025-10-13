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
import { useAuth, useUser } from '@/firebase';
import { ThemeToggle } from './theme-toggle';

const TknLogo = () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
        <defs>
            <linearGradient id="duckGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'hsl(var(--primary))', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: 'hsl(var(--secondary))', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        <path 
            d="M11.5 3C10.557 3 9.68205 3.3229 8.99905 3.86289C8.31605 4.40289 7.99905 5.25388 7.99905 6.13688C7.99905 7.01988 8.31605 7.87188 8.99905 8.41188C9.68205 8.95088 10.557 9.27488 11.5 9.27488C12.443 9.27488 13.318 8.95088 14.001 8.41188C14.684 7.87188 15.001 7.01988 15.001 6.13688C15.001 5.25388 14.684 4.40289 14.001 3.86289C13.318 3.3229 12.443 3 11.5 3Z" 
            fill="url(#duckGradient)"
        />
        <path 
            d="M17.7083 6.94575C17.0683 6.64375 16.3783 6.41775 15.6553 6.27375C15.4093 7.55175 14.6543 8.68075 13.5623 9.43175L13.5353 9.44975C14.3533 10.3708 14.8883 11.5647 15.0503 12.8718C15.0643 12.9808 15.0743 13.0898 15.0823 13.1998C15.9353 13.0378 16.7363 12.6467 17.4113 12.0627C18.6653 11.0007 19.0663 9.38775 18.5923 7.90475C18.4233 7.37375 18.1133 6.91575 17.7083 6.94575Z" 
            fill="url(#duckGradient)"
        />
        <path 
            d="M14.9961 13.385C14.8421 14.64 14.3311 15.77 13.5351 16.634L13.5271 16.642C12.8731 17.585 12.0001 18.508 11.0621 19.261C10.7711 19.51 10.4571 19.72 10.1321 19.889C8.38413 20.973 6.09613 20.73 4.60613 19.24C3.11613 17.75 3.35913 15.462 4.44313 13.714C4.66413 13.355 4.93913 13.029 5.25713 12.748C6.18313 11.895 7.15213 11.16 8.01513 10.593C8.42513 10.316 8.87913 10.088 9.36213 9.923C9.07313 10.83 8.99513 11.802 9.14813 12.753C9.30913 13.758 9.71513 14.694 10.3111 15.438C10.7011 15.952 11.1961 16.368 11.7581 16.657C12.0051 16.784 12.2681 16.877 12.5391 16.932C13.4111 17.098 14.3211 16.711 14.9121 16.035C15.0471 15.868 15.1671 15.69 15.2721 15.503C15.7191 14.821 15.8231 13.97 15.6261 13.201L14.9961 13.385Z" 
            fill="url(#duckGradient)"
        />
    </svg>
)

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-12 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/dashboard" className="mr-6 flex items-center space-x-2">
            <TknLogo />
            <span className="hidden font-bold font-headline sm:inline-block">
              TKN Fi RE
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
  const router = useRouter();

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
    if (user.displayName) return user.displayName.split(' ').map((n) => n[0]).join('');
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            {user.photoURL && <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} data-ai-hint="person" />}
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.isAnonymous ? "Guest User" : user.displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.isAnonymous ? "Logged in as guest" : user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Briefcase className="mr-2 h-4 w-4" />
            <span>My Deals</span>
          </DropdownMenuItem>
          <DropdownMenuItem>
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
