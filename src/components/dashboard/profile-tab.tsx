
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { useEffect } from "react";
import { Skeleton } from "../ui/skeleton";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").optional(),
  email: z.string().email(),
  country: z.string().optional(),
  state: z.string().optional(),
  financialGoal: z.string().min(10, "Financial goal must be at least 10 characters.").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileTab() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc<ProfileFormValues>(userProfileRef);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (profileData) {
      form.reset({
        name: profileData.name || user?.displayName || '',
        email: profileData.email || user?.email || '',
        country: profileData.country || '',
        state: profileData.state || '',
        financialGoal: profileData.financialGoal || ''
      });
    } else if (user) {
       form.reset({
        name: user.displayName || "",
        email: user.email || "",
       });
    }
  }, [profileData, user, form]);

  function onSubmit(data: ProfileFormValues) {
    if (!userProfileRef) return;
    setDocumentNonBlocking(userProfileRef, data, { merge: true });
    toast({
      title: "Profile Updated",
      description: "Your information has been saved successfully.",
    });
  }

  const getInitials = () => {
    if (!user) return "";
    if (user.isAnonymous) return 'G';
    if (user.displayName) return user.displayName.split(' ').map((n) => n[0]).join('');
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  if (isUserLoading || (user && isProfileLoading)) {
    return (
        <div className="animate-fade-in">
            <Card className="bg-card/60 backdrop-blur-sm max-w-4xl mx-auto">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-20 w-20 rounded-full" />
                        <div>
                            <Skeleton className="h-8 w-48" />
                            <Skeleton className="h-4 w-64 mt-2" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                           <div key={i} className="space-y-2">
                             <Skeleton className="h-4 w-24" />
                             <Skeleton className="h-10 w-full" />
                           </div>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                </CardContent>
                 <CardFooter className="flex justify-between items-center">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-32" />
                </CardFooter>
            </Card>
        </div>
    )
  }

  if (!user) {
    return null;
  }

  return (
    <div className="animate-fade-in">
        <Card className="bg-card/60 backdrop-blur-sm max-w-4xl mx-auto">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} data-ai-hint="person" />
                    <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl font-headline">User Profile</CardTitle>
                    <CardDescription>Manage your account and personal information.</CardDescription>
                </div>
            </div>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input {...field} disabled={user.isAnonymous} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="email" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" {...field} disabled /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="country" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input {...field} disabled={user.isAnonymous} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="state" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>State</FormLabel> <FormControl><Input {...field} disabled={user.isAnonymous} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
                <FormField name="financialGoal" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Financial Goal</FormLabel> <FormControl><Textarea {...field} disabled={user.isAnonymous} /></FormControl> <FormDescription>This helps us tailor your experience and AI insights.</FormDescription> <FormMessage /> </FormItem> )} />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    <p>Plan: <span className="font-semibold text-primary">{user.isAnonymous ? "Guest" : "Pro"}</span></p>
                </div>
                <Button type="submit" disabled={user.isAnonymous || form.formState.isSubmitting}>Save Changes</Button>
            </CardFooter>
            </form>
        </Form>
        </Card>
    </div>
  );
}

    