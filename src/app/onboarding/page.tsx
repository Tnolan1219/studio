
'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, FirebaseClientProvider, errorEmitter, FirestorePermissionError } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Wand2, Loader2 } from 'lucide-react';
import { getDealAssessment } from '@/lib/actions';
import { marked } from 'marked';


const onboardingSchema = z.object({
  name: z.string().min(2, { message: 'Please enter your name.' }),
  country: z.string().min(2, { message: 'Please enter your country.' }),
  state: z.string().optional(),
  experience: z.string().min(1, { message: 'Please select your experience level.' }),
  financialGoal: z.string().min(10, { message: 'Please describe your financial goals.' }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

const STEPS = [
  {
    title: 'Welcome!',
    description: "Let's start with the basics.",
    fields: ['name', 'country', 'state'],
  },
  {
    title: 'Your Investment Journey',
    description: 'Tell us a bit about your experience and ambitions.',
    fields: ['experience', 'financialGoal'],
  },
];

function OnboardingView() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [goalExample, setGoalExample] = useState('');
  const [isExampleLoading, setIsExampleLoading] = useState(false);

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      country: '',
      state: '',
      experience: '',
      financialGoal: '',
    },
  });

  useEffect(() => {
    // If the user is not loading and not present, redirect to the home page.
    if (!isUserLoading && !user) {
      router.push('/');
    }
    // Once the user object is available, populate the form with their details.
    if (user) {
        form.reset({
            name: user.displayName || '',
        });
    }
  }, [user, isUserLoading, router, form]);

  const handleNextStep = async () => {
    const fieldsToValidate = STEPS[currentStep].fields as (keyof OnboardingFormValues)[];
    const isValid = await form.trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleShowExample = async () => {
    // AI feature is disabled
  };

  const onSubmit = (data: OnboardingFormValues) => {
    if (!user || !firestore) return;

    const userProfileRef = doc(firestore, 'users', user.uid);
    
    const profileData = {
        id: user.uid,
        ...data,
        email: user.email,
        photoURL: user.photoURL,
        isOnboardingComplete: true,
        plan: 'Free'
    };
    
    // Non-blocking write with contextual error handling
    setDoc(userProfileRef, profileData, { merge: true })
      .catch(async (serverError) => {
        const permissionError = new FirestorePermissionError({
          path: userProfileRef.path,
          operation: 'write',
          requestResourceData: profileData,
        });
        errorEmitter.emit('permission-error', permissionError);
      });

    // Optimistically show success and redirect.
    toast({
      title: 'Profile Created!',
      description: 'Welcome to Valentor RE. You are now being redirected.',
    });
    router.push('/dashboard');
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-lg bg-card/60 backdrop-blur-sm animate-fade-in">
        <CardHeader>
          <Progress value={progress} className="mb-4" />
          <CardTitle className="font-headline text-2xl">{STEPS[currentStep].title}</CardTitle>
          <CardDescription>{STEPS[currentStep].description}</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              {currentStep === 0 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="USA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State / Province</FormLabel>
                          <FormControl>
                            <Input placeholder="California" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
              {currentStep === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Investment Experience</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your experience level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner (Just getting started)</SelectItem>
                            <SelectItem value="intermediate">Intermediate (A few deals under my belt)</SelectItem>
                            <SelectItem value="advanced">Advanced (Experienced investor)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="financialGoal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Describe Your Financial Goals</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., To build a portfolio of 5 rental properties in the next 10 years for long-term passive income..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className='flex justify-between items-center'>
                          <span>This helps us personalize your experience.</span>
                        </FormDescription>
                        {goalExample && (
                            <div className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-md border italic">
                                "{goalExample}"
                            </div>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              {currentStep > 0 ? (
                <Button type="button" variant="ghost" onClick={handlePrevStep}>
                  Back
                </Button>
              ) : (
                <div />
              )}

              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={handleNextStep}>
                  Next
                </Button>
              ) : (
                <Button type="submit">Finish Setup</Button>
              )}
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <FirebaseClientProvider>
      <OnboardingView />
    </FirebaseClientProvider>
  )
}
