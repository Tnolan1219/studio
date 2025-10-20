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

interface RehabTabProps {
    deal: Deal;
    dealFlowData: DealFlowData;
    updateDealFlow: (data: Partial<DealFlowData>) => void;
    updateDeal: (data: Partial<Deal>) => void;
}

// Simple Gantt Chart Component
const GanttChart = ({ tasks }: { tasks: RehabTask[] }) => {
    if (tasks.length === 0) return <p className="text-sm text-muted-foreground">No tasks to display.</p>;

    const validTasks = tasks.filter(t => t.startDate && t.endDate);
    if (validTasks.length === 0) return <p className="text-sm text-muted-foreground">Enter start and end dates to see the chart.</p>;

    const allDates = validTasks.flatMap(t => [new Date(t.startDate), new Date(t.endDate)]);
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    
    // Add a buffer day
    maxDate.setDate(maxDate.getDate() + 1);

    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));

    if (totalDays <= 0 || !isFinite(totalDays)) {
        return <p className="text-sm text-muted-foreground">Invalid dates for Gantt chart.</p>;
    }
    
    return (
        <div className="space-y-2 text-xs">
            {tasks.map(task => {
                if (!task.startDate || !task.endDate) return null;

                const start = new Date(task.startDate);
                const end = new Date(task.endDate);
                const left = Math.max(0, ((start.getTime() - minDate.getTime()) / (totalDays * 1000 * 60 * 60 * 24)) * 100);
                const width = Math.max(0, ((end.getTime() - start.getTime() + (1000*60*60*24)) / (totalDays * 1000 * 60 * 60 * 24)) * 100);

                const statusColor = {
                    'Not Started': 'bg-muted',
                    'In Progress': 'bg-blue-500/50',
                    'Completed': 'bg-green-500/50',
                }[task.status];
                
                return (
                    <div key={task.id} className="flex items-center">
                        <div className="w-1/4 pr-2 truncate">{task.name}</div>
                        <div className="w-3/4 bg-muted/50 rounded-sm h-6">
                            <div
                                className={`h-6 rounded-sm ${statusColor}`}
                                style={{ marginLeft: `${left}%`, width: `${width}%` }}
                                title={`${task.name}: ${task.startDate} to ${task.endDate}`}
                            />
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


export function RehabTab({ deal, dealFlowData, updateDealFlow, updateDeal }: RehabTabProps) {
    const [isAIPending, startAITransition] = useTransition();
    const { register, control, handleSubmit, watch, setValue } = useForm({
        defaultValues: {
            tasks: dealFlowData.rehabDetails?.tasks || [],
        },
    });

    const { fields, append, remove } = useFieldArray({ control, name: 'tasks' });
    const watchedTasks = watch('tasks');

    const totalCost = watchedTasks.reduce((acc, task) => acc + Number(task.cost || 0), 0);
    
    // Effect to update the root deal object's rehabCost when totalCost changes
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
            }
        });
    };

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
                            {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-1 md:grid-cols-[2fr,1fr,1fr,1fr,auto] gap-2 items-center border-b pb-2">
                                    <Input placeholder="Task Name" {...register(`tasks.${index}.name`)} />
                                    <Input type="number" placeholder="Cost" {...register(`tasks.${index}.cost`)} />
                                    <Input type="date" {...register(`tasks.${index}.startDate`)} />
                                    <Input type="date" {...register(`tasks.${index}.endDate`)} />
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
                            <p className="text-sm text-muted-foreground">Click below to get AI-powered rehab recommendations.</p>
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
