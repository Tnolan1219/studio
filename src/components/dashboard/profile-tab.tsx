"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { mockUser } from "@/lib/mock-data";
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

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email(),
  nickname: z.string().min(1, "Nickname is required."),
  country: z.string(),
  state: z.string(),
  dutyStation: z.string(),
  rank: z.string(),
  branch: z.string(),
  financialGoal: z.string().min(10, "Financial goal must be at least 10 characters."),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function ProfileTab() {
  const { toast } = useToast();
  
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: mockUser.name,
      email: mockUser.email,
      nickname: mockUser.nickname,
      country: mockUser.country,
      state: mockUser.state,
      dutyStation: mockUser.dutyStation,
      rank: mockUser.rank,
      branch: mockUser.branch,
      financialGoal: mockUser.financialGoal
    },
    mode: "onChange",
  });

  function onSubmit(data: ProfileFormValues) {
    console.log(data);
    toast({
      title: "Profile Updated",
      description: "Your information has been saved successfully.",
    });
  }

  return (
    <div className="animate-fade-in">
        <Card className="bg-card/60 backdrop-blur-sm max-w-4xl mx-auto">
        <CardHeader>
            <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                    <AvatarImage src={mockUser.avatarUrl} alt={mockUser.name} data-ai-hint="person" />
                    <AvatarFallback>{mockUser.nickname}</AvatarFallback>
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
                <FormField name="name" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Full Name</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="nickname" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Nickname</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="email" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Email</FormLabel> <FormControl><Input type="email" {...field} disabled /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="rank" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Rank</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="branch" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Branch</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="dutyStation" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Duty Station</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="country" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Country</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                <FormField name="state" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>State</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /> </FormItem> )} />
                </div>
                <FormField name="financialGoal" control={form.control} render={({ field }) => ( <FormItem> <FormLabel>Financial Goal</FormLabel> <FormControl><Textarea {...field} /></FormControl> <FormDescription>This helps us tailor your experience and AI insights.</FormDescription> <FormMessage /> </FormItem> )} />
            </CardContent>
            <CardFooter className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                    <p>Plan: <span className="font-semibold text-primary">{mockUser.plan}</span></p>
                    <p>Deals Saved: <span className="font-semibold">{mockUser.dealCount}</span></p>
                </div>
                <Button type="submit">Save Changes</Button>
            </CardFooter>
            </form>
        </Form>
        </Card>
    </div>
  );
}
