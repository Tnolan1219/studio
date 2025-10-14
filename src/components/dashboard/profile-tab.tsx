
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
import { useUser, useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useUploadFile } from "@/firebase";
import { doc } from 'firebase/firestore';
import { useEffect, useRef } from "react";
import { Skeleton } from "../ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import type { UserProfile } from "@/lib/types";
import { Progress } from "../ui/progress";
import { Upload } from "lucide-react";

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").optional(),
  email: z.string().email(),
  photoURL: z.string().url().optional(),
  country: z.string().optional(),
  state: z.string().optional(),
  financialGoal: z.string().min(10, "Financial goal must be at least 10 characters.").optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileTab() {
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, uploadProgress, isUploading, error: uploadError } = useUploadFile();

  const userProfileRef = useMemoFirebase(() => {
    if (!user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: profileData, isLoading: isProfileLoading } = useDoc<UserProfile>(userProfileRef);
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
  });

  useEffect(() => {
    if (profileData) {
      form.reset({
        name: profileData.name || user?.displayName || '',
        email: profileData.email || user?.email || '',
        photoURL: profileData.photoURL || user?.photoURL || '',
        country: profileData.country || '',
        state: profileData.state || '',
        financialGoal: profileData.financialGoal || ''
      });
    } else if (user) {
       form.reset({
        name: user.displayName || "",
        email: user.email || "",
        photoURL: user.photoURL || "",
       });
    }
  }, [profileData, user, form]);

  async function onSubmit(data: ProfileFormValues) {
    if (!userProfileRef || !user || user.isAnonymous) return;
    
    setDocumentNonBlocking(userProfileRef, data, { merge: true });
    toast({
      title: "Profile Updated",
      description: "Your information has been saved successfully.",
    });
  }

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user) {
        try {
            const downloadURL = await uploadFile(file, `profile-pictures/${user.uid}`);
            if (userProfileRef) {
                setDocumentNonBlocking(userProfileRef, { photoURL: downloadURL }, { merge: true });
                form.setValue('photoURL', downloadURL, { shouldDirty: true });
                toast({ title: "Profile Picture Updated!" });
            }
        } catch (error) {
            toast({ title: "Upload Failed", description: "Could not upload your profile picture. Please try again.", variant: 'destructive' });
        }
    }
  };


  const getInitials = () => {
    if (!user) return "";
    if (user.isAnonymous) return 'G';
    const name = form.getValues('name');
    if (name) return name.split(' ').map((n) => n[0]).join('').toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return 'U';
  }

  const currentPhotoURL = form.watch('photoURL');


  if (isUserLoading || (user && !user.isAnonymous && isProfileLoading)) {
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
                <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                    <Avatar className="h-24 w-24 border-2 border-primary/50 group-hover:border-primary transition-all">
                        <AvatarImage src={currentPhotoURL || ""} alt={form.getValues('name') || ""} data-ai-hint="person" />
                        <AvatarFallback className="text-3xl">{getInitials()}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <Upload className="h-8 w-8 text-white" />
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
                </div>
                <div>
                    <CardTitle className="text-2xl font-headline">User Profile</CardTitle>
                    <CardDescription>Manage your account and personal information.</CardDescription>
                    {isUploading && (
                        <div className="mt-2 w-full">
                             <Progress value={uploadProgress} className="h-2" />
                             <p className="text-xs text-muted-foreground mt-1">{uploadProgress.toFixed(0)}% uploaded</p>
                        </div>
                    )}
                    {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
                </div>
            </div>
        </CardHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField name="name" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="email" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" {...field} disabled /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="country" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="state" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>State</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
                <FormField name="financialGoal" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Financial Goal</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription>This helps us tailor your experience and AI insights.</FormDescription> <FormMessage /> </FormItem> )} />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    <p>Plan: <span className="font-semibold text-primary">{user.isAnonymous ? "Guest" : "Pro"}</span></p>
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
                  <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty || isUploading}>
                    {isUploading ? 'Uploading...' : 'Save Changes'}
                  </Button>
                )}
            </CardFooter>
            </form>
        </Form>
        </Card>
    </div>
  );
}
