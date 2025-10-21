
'use client';

import { useState, useTransition, useEffect } from 'react';
import type { Deal, DealFlowData, RehabTask } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { getDealAssessment } from '@/lib/actions';
import { Progress } from '../ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useToast } from '@/hooks/use-toast';

interface RehabTabProps {
    deal: Deal;
    dealFlowData: DealFlowData;
    updateDealFlow: (data: Partial<DealFlowData>) => void;
    updateDeal: (data: Partial<Deal>) => void;
}

const GanttChart = ({ tasks }: { tasks: RehabTask[] }) => {
    if (tasks.length === 0) return <p className="text-sm text-muted-foreground">No tasks to display.</p>;

    const validTasks = tasks.filter(t => t.startDate && t.endDate);
    if (validTasks.length === 0) return <p className="text-sm text-muted-foreground">Enter start and end dates to see the chart.</p>;

    const allDates = validTasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    maxDate.setDate(maxDate.getDate() + 1);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0 || !isFinite(totalDays)) {
        return <p className="text-sm text-muted-foreground">Invalid date range for Gantt chart.</p>;
    }
    
    return (
        <div className="space-y-2 text-xs">
            <TooltipProvider>
                {tasks.map(task => {
                    if (!task.startDate || !task.endDate) return null;

                    const start = new Date(task.startDate);
                    const end = new Date(task.endDate);
                    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return null;
                    
                    const left = Math.max(0, ((start.getTime() - minDate.getTime()) / (totalDays * 1000 * 60 * 60 * 24)) * 100);
                    const width = Math.max(0, ((end.getTime() - start.getTime() + (1000*60*60*24)) / (totalDays * 1000 * 60 * 60 * 24)) * 100);

                    const statusColor = {
                        'Not Started': 'bg-muted/80',
                        'In Progress': 'bg-blue-500/80',
                        'Completed': 'bg-green-500/80',
                    }[task.status];
                    
                    return (
                        <div key={task.id} className="flex items-center">
                            <div className="w-1/4 pr-2 truncate">{task.name}</div>
                            <div className="w-3/4 bg-muted/30 rounded-sm h-6">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div
                                            className={`h-6 rounded-sm transition-all duration-300 hover:opacity-80 ${statusColor}`}
                                            style={{ marginLeft: `${left}%`, width: `${width}%` }}
                                        />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-semibold">{task.name}</p>
                                        <p>{task.startDate} to {task.endDate}</p>
                                        <p>Status: {task.status}</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                        </div>
                    );
                })}
            </TooltipProvider>
        </div>
    );
};


export function RehabTab({ deal, dealFlowData, updateDealFlow, updateDeal }: RehabTabProps) {
    const [isAIPending, startAITransition] = useTransition();
    const { toast } = useToast();
    const { register, control, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            tasks: dealFlowData.rehabDetails?.tasks || [],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'tasks' });
    const watchedTasks = watch('tasks');

    const totalCost = watchedTasks.reduce((acc, task) => acc + Number(task.cost || 0), 0);
    
    useEffect(() => {
        if (totalCost !== deal.rehabCost) {
            updateDeal({ rehabCost: totalCost });
        }
    }, [totalCost, deal.rehabCost, updateDeal]);

    const onSave = (data: { tasks: RehabTask[] }) => {
        updateDealFlow({
            rehabDetails: {
                ...dealFlowData.rehabDetails,
                tasks: data.tasks,
                budget: totalCost,
            },
        });
        toast({ title: 'Rehab Plan Saved' });
    };
    
     const handleGenerateInsights = () => {
        startAITransition(async () => {
            let financialData = `Purchase Price: ${deal.purchasePrice}, Current Rehab Budget: ${totalCost}`;
            const result = await getDealAssessment({
                dealType: deal.dealType,
                financialData,
                marketConditions: `Rehab scope: ${watchedTasks.map(t => t.name).join(', ')}. ${deal.marketConditions}`,
                stage: 'Rehab',
            });

            if (result.assessment) {
                updateDealFlow({
                    aiRecommendations: {
                        ...dealFlowData.aiRecommendations,
                        Rehab: result.assessment,
                    },
                });
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Error Generating Insights',
                    description: result.message,
                });
            }
        });
    };
    
    const completedTasks = watchedTasks.filter(t => t.status === 'Completed').length;
    const progressPercentage = watchedTasks.length > 0 ? (completedTasks / watchedTasks.length) * 100 : 0;
    const aiRecommendation = dealFlowData.aiRecommendations?.Rehab;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Rehab Tasks & Budget</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <form onSubmit={handleSubmit(onSave)} className="space-y-4">
                            <div className="hidden md:grid md:grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-2 items-center text-xs text-muted-foreground px-1">
                                <Label>Task Name</Label>
                                <Label>Cost</Label>
                                <Label>Start Date</Label>
                                <Label>End Date</Label>
                                <Label>Status</Label>
                            </div>
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,1fr,1fr,auto] gap-2 items-center border-b pb-2">
                                    <Input placeholder="Task Name" {...register(`tasks.${index}.name`)} />
                                    <Input type="number" placeholder="Cost" {...register(`tasks.${index}.cost`)} />
                                    <Input type="date" {...register(`tasks.${index}.startDate`)} />
                                    <Input type="date" {...register(`tasks.${index}.endDate`)} />
                                    <Select
                                        defaultValue={field.status}
                                        onValueChange={(value) => setValue(`tasks.${index}.status`, value as RehabTask['status'])}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Not Started">Not Started</SelectItem>
                                            <SelectItem value="In Progress">In Progress</SelectItem>
                                            <SelectItem value="Completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                </div>
                            ))}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => append({ id: crypto.randomUUID(), name: '', cost: 0, startDate: '', endDate: '', status: 'Not Started' })}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Task
                            </Button>
                             <div className="flex justify-between items-center pt-4">
                                <div className="text-lg font-bold">Total Rehab Budget: ${totalCost.toLocaleString()}</div>
                                <Button type="submit">Save Rehab Plan</Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Gantt Chart</CardTitle>
                        <div className="flex items-center gap-4 pt-2">
                            <Label className="text-sm">Project Progress</Label>
                            <Progress value={progressPercentage} className="w-full max-w-sm" />
                            <span className="text-sm font-medium">{progressPercentage.toFixed(0)}%</span>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <GanttChart tasks={watchedTasks} />
                    </CardContent>
                </Card>
            </div>
             <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles size={16} className="text-primary" />
                            AI Recommendations
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {isAIPending ? (
                            <div className="flex justify-center items-center py-8">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : aiRecommendation ? (
                            <div className="text-sm prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: aiRecommendation }} />
                        ) : (
                            <p className="text-sm text-muted-foreground">Click below to get AI-powered rehab recommendations based on your budget and tasks.</p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleGenerateInsights} disabled={isAIPending} className="w-full">
                            {isAIPending ? 'Generating...' : `Generate Rehab Insights`}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
