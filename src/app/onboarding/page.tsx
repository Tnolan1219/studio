
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
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
import { getAIResponse } from '@/lib/ai';


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

export default function OnboardingPage() {
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
    if (!isUserLoading && !user) {
      router.push('/');
    } else if (user) {
        form.reset({
            name: user.displayName || '',
            // keep other fields as they are, let user fill them.
        })
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
    setIsExampleLoading(true);
    try {
       const prompt = `You are an AI assistant for a real estate investment app. 
Generate a single, concise, and inspiring example of a financial goal for a user.
The goal should be related to real estate investing.
Make it specific and actionable. For example: "My goal is to acquire three cash-flowing rental properties within the next five years to generate $1,500/month in passive income, allowing me to achieve financial flexibility."`;
      const result = await getAIResponse(prompt);
      setGoalExample(result);
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Could not generate an example. Please try again.',
      });
    } finally {
      setIsExampleLoading(false);
    }
  };

  const onSubmit = async (data: OnboardingFormValues) => {
    if (!user || !firestore) return;

    const userProfileRef = doc(firestore, 'users', user.uid);
    
    // Combine form data with existing user data and set onboarding to complete
    const profileData = {
        ...data,
        email: user.email,
        photoURL: user.photoURL,
        isOnboardingComplete: true, // This is the crucial flag
        plan: 'Free' // Assign default plan
    };
    
    try {
        await setDoc(userProfileRef, profileData, { merge: true });
        toast({
          title: 'Profile Created!',
          description: 'Welcome to Valentor Financial. You are now being redirected.',
        });
        router.push('/dashboard');
    } catch (error) {
        toast({
            title: 'Error Saving Profile',
            description: 'Could not save your onboarding information. Please try again.',
            variant: 'destructive'
        });
        console.error("Error writing document: ", error);
    }
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
                           <Button type="button" variant="link" size="sm" onClick={handleShowExample} disabled={isExampleLoading} className="text-primary">
                                {isExampleLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}
                                {isExampleLoading ? 'Generating...' : 'Show an example'}
                           </Button>
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
