
"use client";

import { useForm, Controller } from "react-hook-form";
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
import { useUser, useFirestore, useMemoFirebase, setDocumentNonBlocking } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useEffect, useState } from "react";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { UserProfile, StructuredGoal } from "@/lib/types";
import { Loader2, Crown } from "lucide-react";
import { Separator } from "../ui/separator";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useProfileStore } from "@/hooks/use-profile-store";
import { useRouter } from "next/navigation";
import { Label } from "@/components/ui/label";

const goalSchema = z.object({
  type: z.string().min(1, "Please select a goal type."),
  target: z.coerce.number().min(1, "Target must be greater than 0."),
  text: z.string().optional(),
});

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").optional(),
  email: z.string().email(),
  photoURL: z.string().url().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  financialGoal: z.union([z.string(), goalSchema]).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const GOAL_TEMPLATES: {type: StructuredGoal['type'], text: string}[] = [
  { type: 'deals', text: 'Acquire {target} total investment properties' },
  { type: 'deals', text: 'Own {target} rental units' },
  { type: 'cashflow', text: 'Generate ${target} in monthly passive cash flow' },
  { type: 'cashflow', text: 'Achieve ${target} in annual Net Operating Income (NOI)' },
  { type: 'portfolioValue', text: 'Grow portfolio net worth to ${target}' },
  { type: 'portfolioValue', text: 'Reach ${target} in total property value' },
];


export default function ProfileTab() {
  const { toast } = useToast();
  const { user } = useUser();
  const firestore = useFirestore();
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const { profileData, setProfileData, isLoading, hasHydrated } = useProfileStore();

  const userProfileRef = useMemoFirebase(() => {
    if (!user || user.isAnonymous) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      name: '',
      email: '',
      photoURL: '',
      country: '',
      state: '',
      financialGoal: undefined,
    }
  });
  
  const watchedGoalType = form.watch('financialGoal.type');
  const watchedGoalTarget = form.watch('financialGoal.target');
  const watchedGoalObject = form.watch('financialGoal');

  useEffect(() => {
    if (hasHydrated && profileData) {
      form.reset({
        name: profileData.name || user?.displayName || '',
        email: profileData.email || user?.email || '',
        photoURL: profileData.photoURL || user?.photoURL || '',
        country: profileData.country || '',
        state: profileData.state || '',
        financialGoal: profileData.financialGoal || undefined,
      });
    }
  }, [profileData, user, form, hasHydrated]);
  
 useEffect(() => {
    if (typeof watchedGoalObject === 'object' && watchedGoalObject && 'text' in watchedGoalObject) {
      // Find the original template by stripping the number from the current text
      const currentTargetString = String(watchedGoalObject.target?.toLocaleString() || '');
      const templateText = watchedGoalObject.text?.replace(currentTargetString, '{target}');
      const template = GOAL_TEMPLATES.find(t => t.text === templateText);

      if(template){
        // Rebuild the text with the new target from the form state
        const newText = template.text.replace('{target}', Number(watchedGoalTarget || 0).toLocaleString());
        if(newText !== watchedGoalObject.text){
          form.setValue('financialGoal.text', newText, { shouldDirty: true });
        }
      }
    }
  }, [watchedGoalTarget, watchedGoalObject, form]);


  async function onSubmit(data: ProfileFormValues) {
    if (!userProfileRef || !user || user.isAnonymous) return;
    
    setIsSaving(true);
    const dataToSave = { ...profileData, ...data };

    setDocumentNonBlocking(userProfileRef, dataToSave, { merge: true });
    setProfileData(dataToSave);
      
    toast({
      title: "Changes saved successfully",
    });
    
    form.reset(dataToSave, { keepIsDirty: false });
    setIsSaving(false);
  }

  const getInitials = () => {
    if (user?.isAnonymous) return 'G';
    const name = form.getValues('name') || profileData?.name || user?.displayName;
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase();
    const email = profileData?.email || user?.email;
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  }

  const currentPhotoURL = form.watch('photoURL');
  const currentPlan = profileData?.plan || 'Free';
  
  if (isLoading || !hasHydrated) {
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
        <Card className={cn("bg-card/60 backdrop-blur-sm max-w-4xl mx-auto transition-all duration-500")}>
        <CardHeader>
            <div className="flex items-center gap-4">
                <Avatar className={cn("h-24 w-24 border-2 border-primary/50 relative")}>
                    <AvatarImage src={currentPhotoURL || ""} alt={form.getValues('name') || ""} data-ai-hint="person" />
                    <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
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
                <FormField name="financialGoal" control={form.control} render={({ field }) => ( 
                  <FormItem>
                    <FormLabel>Financial Goal</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <Controller
                          control={form.control}
                          name="financialGoal"
                          render={({ field: controllerField }) => (
                            <Select 
                              onValueChange={(value) => {
                                const index = parseInt(value, 10);
                                const template = GOAL_TEMPLATES[index];
                                if (template) {
                                    const newGoal = {
                                        type: template.type,
                                        text: template.text,
                                        target: 0
                                    };
                                    controllerField.onChange(newGoal);
                                    // Reset target to ensure re-render and watcher trigger
                                    form.setValue('financialGoal.target', 0, { shouldDirty: true });
                                    form.setValue('financialGoal.text', template.text, { shouldDirty: true });
                                    form.setValue('financialGoal.type', template.type, { shouldDirty: true });
                                }
                            }} 
                            // Determine the selected value based on the text template
                            value={
                              typeof controllerField.value === 'object' && controllerField.value?.text
                                ? GOAL_TEMPLATES.findIndex(t => t.text === (controllerField.value.text.replace(String(controllerField.value.target?.toLocaleString()), '{target}'))).toString()
                                : undefined
                            }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a goal template" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {GOAL_TEMPLATES.map((t, i) => (
                                  <SelectItem key={i} value={String(i)}>{t.text.replace('{target}', '...').replace(/\$/g, '')}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                       <Controller
                          control={form.control}
                          name="financialGoal.target"
                          render={({ field: controllerField }) => (
                             <Input 
                                type="number" 
                                placeholder="Enter Target" 
                                value={controllerField.value || ''} 
                                onChange={(e) => {
                                  controllerField.onChange(e.target.valueAsNumber || 0)
                                }} 
                                disabled={typeof form.getValues('financialGoal') !== 'object'}
                              />
                          )}
                        />
                    </div>
                     <FormDescription>
                       {typeof form.getValues('financialGoal') === 'object' ? (form.getValues('financialGoal') as StructuredGoal).text : "Select a template and enter a target number."}
                    </FormDescription>
                    <FormMessage /> 
                  </FormItem> 
                )} />
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input {...field} disabled={user.isAnonymous} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="email" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" {...field} disabled /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="country" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input {...field} disabled={user.isAnonymous} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="state" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>State</FormLabel> <FormControl><Input {...field} disabled={user.isAnonymous} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
                    <Separator />
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="flex items-center gap-2"><Crown className="w-4 h-4 text-primary" /> Subscription Plan</Label>
                                <p className="text-sm text-muted-foreground">You are on the <span className="font-bold">{currentPlan}</span> plan.</p>
                            </div>
                            <Button type="button" variant="outline" onClick={() => router.push('/plans')}>
                                View Plans
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div><Label>Deals Saved</Label><Input value={profileData.savedDeals || 0} disabled /></div>
                            <div><Label>Calculator Uses</Label><Input value={profileData.calculatorUses || 0} disabled /></div>
                        </div>
                    </div>
            </CardContent>
            <CardFooter className="flex justify-end">
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
        </Card>
        
        <Card className="bg-card/60 backdrop-blur-sm max-w-4xl mx-auto">
            <CardHeader>
            <CardTitle className="text-2xl font-headline">About Valentor RE</CardTitle>
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

    