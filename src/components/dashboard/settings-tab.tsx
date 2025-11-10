
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useUser, useAuth } from "@/firebase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ThemeToggle } from "../theme-toggle";
import { useRouter } from "next/navigation";
import { deleteUser } from "firebase/auth";
import { Label } from "../ui/label";
import { Separator } from "../ui/separator";

export default function SettingsTab() {
  const { toast } = useToast();
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleDeleteAccount = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to delete an account.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteUser(user);
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      router.push('/');
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Account Deletion Failed",
        description: `An error occurred: ${error.message}. You may need to re-authenticate to complete this action.`,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="animate-fade-in space-y-6 max-w-4xl mx-auto">
      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Settings</CardTitle>
          <CardDescription>
            Manage your application and account settings.
          </CardDescription>
        </CardHeader>
      </Card>
      
      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Customize the look and feel of your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label>Theme</Label>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-card/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Manage your account details and subscription.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
             <div className="flex items-center justify-between">
                <div>
                    <Label>Subscription</Label>
                    <p className="text-sm text-muted-foreground">You are currently on the <span className="font-semibold text-primary">{user?.isAnonymous ? 'Guest' : 'Free'}</span> plan.</p>
                </div>
                 <Button variant="outline" disabled>Upgrade Plan</Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
                <div>
                    <Label className="text-destructive">Danger Zone</Label>
                    <p className="text-sm text-muted-foreground">Permanently delete your account and all associated data.</p>
                </div>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={user?.isAnonymous}>Delete Account</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete your
                          account and remove your data from our servers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
