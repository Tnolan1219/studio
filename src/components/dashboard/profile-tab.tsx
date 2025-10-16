
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { UserProfile } from "@/lib/types";
import { Loader2, Crown } from "lucide-react";
import { Separator } from "../ui/separator";
import Link from "next/link";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").optional(),
  email: z.string().email(),
  photoURL: z.string().url().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  financialGoal: z.string().min(10, "Financial goal must be at least 10 characters.").optional(),
  plan: z.enum(['Free', 'Pro', 'Executive', 'Elite']).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
const PLAN_OPTIONS: ('Free' | 'Pro' | 'Executive' | 'Elite')[] = ['Free', 'Pro', 'Executive', 'Elite'];

export default function ProfileTab() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      name: '',
      email: '',
      photoURL: '',
      country: '',
      state: '',
      financialGoal: '',
      plan: 'Free'
    }
  });

  useEffect(() => {
    if (profileData) {
      form.reset({
        name: profileData.name || user?.displayName || '',
        email: profileData.email || user?.email || '',
        photoURL: profileData.photoURL || user?.photoURL || '',
        country: profileData.country || '',
        state: profileData.state || '',
        financialGoal: profileData.financialGoal || '',
        plan: profileData.plan || 'Free'
      });
    } else if (user && !isProfileLoading) {
       form.reset({
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
        country: '',
        state: '',
        financialGoal: '',
        plan: 'Free'
       });
    }
  }, [profileData, user, form, isProfileLoading]);
  
  const handlePlanChange = (plan: 'Free' | 'Pro' | 'Executive' | 'Elite') => {
    if (!userProfileRef || user?.isAnonymous) return;
    setDocumentNonBlocking(userProfileRef, { plan }, { merge: true });
    form.setValue('plan', plan, { shouldDirty: true });
    toast({
      title: "Plan Updated",
      description: `Your plan has been set to ${plan}.`
    });
  }

  async function onSubmit(data: ProfileFormValues) {
    if (!userProfileRef || !user || user.isAnonymous) return;
    
    setIsSaving(true);
    try {
      const dataToSave = {
        id: user.uid, // Add this line
        ...data
      };

      setDocumentNonBlocking(userProfileRef, dataToSave, { merge: true });
      
      toast({
        title: "Changes saved successfully",
      });
      
      form.reset(data, { keepIsDirty: false });
    } catch (error) {
      console.error("Profile update failed:", error);
      toast({
        title: "Error",
        description: "Could not update your profile.",
        variant: "destructive"
      })
    } finally {
      await new Promise(resolve => setTimeout(resolve, 500));
      setIsSaving(false);
    }
  }

  const getInitials = () => {
    if (!user) return "";
    if (user.isAnonymous) return 'G';
    const name = form.getValues('name');
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  const currentPhotoURL = form.watch('photoURL');
  const isLoading = isUserLoading || (user && !user.isAnonymous && isProfileLoading);

  if (isLoading) {
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
    <div className="animate-fade-in space-y-6">
        <Card className="bg-card/60 backdrop-blur-sm max-w-4xl mx-auto">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Avatar className="h-24 w-24 border-2 border-primary/50">
                    <AvatarImage src={currentPhotoURL || ""} alt={form.getValues('name') || ""} data-ai-hint="person" />
                    <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="text-2xl font-headline">User Profile</CardTitle>
                    <CardDescription>Manage your account and personal information.</CardDescription>
                </div>
            </div>
        </CardHeader>
        {!isLoading && (profileData || user.isAnonymous) && (
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
                      {user.isAnonymous ? (
                          <p>Plan: <span className="font-semibold text-primary">Guest</span></p>
                      ) : (
                        <FormField
                            control={form.control}
                            name="plan"
                            render={({ field }) => (
                                <FormItem className="flex items-center gap-2 space-y-0">
                                <Crown className="w-4 h-4 text-primary" />
                                <FormLabel className="whitespace-nowrap pt-1">Current Plan:</FormLabel>
                                <Select onValueChange={(value: 'Free' | 'Pro' | 'Executive' | 'Elite') => handlePlanChange(value)} value={field.value} disabled={user.isAnonymous}>
                                    <FormControl>
                                    <SelectTrigger className="w-[150px]">
                                        <SelectValue placeholder="Select Plan" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {PLAN_OPTIONS.map(plan => (
                                            <SelectItem key={plan} value={plan}>{plan}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                </FormItem>
                            )}
                        />
                      )}
                  </div>
                  {user.isAnonymous ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Button type="button" disabled>Save Changes</Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Create an account to save your profile.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSaving ? 'Saving...' : 'Save Changes'}
                    </Button>
                  )}
              </CardFooter>
              </form>
          </Form>
        )}
        </Card>
        
        <Card className="bg-card/60 backdrop-blur-sm max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="text-2xl font-headline">About Valentor Financial</CardTitle>
                <CardDescription>Our Vision, Goals, and Philosophy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
                <div>
                    <h3 className="font-semibold text-foreground">Vision</h3>
                    <p>To empower individuals to achieve financial freedom through intelligent and accessible real estate investment.</p>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Goals</h3>
                    <p>To provide best-in-class analysis tools, foster a community of informed investors, and demystify the process of building wealth through property.</p>
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Philosophy</h3>
                    <p>We believe that with the right data and guidance, anyone can become a successful real estate investor. Our platform is built on transparency, education, and user empowerment.</p>
                </div>
                <Separator />
                <div className="space-y-2">
                    <p>
                        Serving in the Military? Check out our military personal finance website: <Link href="https://tnolan1219.github.io/TKN-Financial-V.3/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">TKN Financial</Link>.
                    </p>
                     <p>
                        Visit our Etsy store for more financial tools and resources: <Link href="https://www.etsy.com/shop/TKNfinance?ref=shop-header-name" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">TKNFinance on Etsy</Link>.
                    </p>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}

    