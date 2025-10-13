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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
        <path d="M6.00206 10.007L3.63306 12.376C2.26162 13.7474 2.26162 15.9326 3.63306 17.304L6.00206 19.673C7.37349 21.0444 9.55877 21.0444 10.9302 19.673L15.9302 14.673C16.6264 13.9768 17 13.0234 17 12.0245C17 11.0256 16.6264 10.0722 15.9302 9.376L13.5222 6.968C12.1415 5.58729 9.94834 5.59966 8.58334 6.995L6.00206 9.57633" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M10.9302 9.376L15.9302 14.673" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19 12C19 15.866 15.866 19 12 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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
