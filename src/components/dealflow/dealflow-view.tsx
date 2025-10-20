'use client';

import { useState, useMemo, useEffect, useTransition } from 'react';
import type { Deal, DealFlowData, DealStage } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, Hammer, Handshake, KeyRound, Megaphone, Search, Wallet, Building, DollarSign, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setDocumentNonBlocking } from '@/firebase';
import { DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { StageTabContent } from './stage-tab-content';
import { RehabTab } from './rehab-tab';
import { AnalysisTab } from './analysis-tab';
import { FinancingTab } from './financing-tab';
import { useForm } from 'react-hook-form';

interface DealFlowViewProps {
    deal: Deal;
    dealRef: DocumentReference;
    onBack: () => void;
}

const getStagesForDealType = (dealType: Deal['dealType']): DealStage[] => {
    const baseStages: DealStage[] = ['Analysis', 'Financing', 'Negotiations', 'Inspections', 'Closing'];
    switch (dealType) {
        case 'House Flip':
            return [...baseStages, 'Rehab', 'Marketing', 'Selling'];
        case 'Rental Property':
        case 'Commercial Multifamily':
            return [...baseStages, 'Rehab', 'Marketing', 'Renting', 'Management'];
        default:
            return baseStages;
    }
};

const STAGE_ICONS: Record<DealStage, React.ElementType> = {
    Analysis: Search,
    Financing: Wallet,
    Negotiations: Handshake,
    Inspections: FileText,
    Closing: KeyRound,
    Rehab: Hammer,
    Marketing: Megaphone,
    Renting: KeyRound,
    Management: Building,
    Selling: DollarSign,
};

export default function DealFlowView({ deal, dealRef, onBack }: DealFlowViewProps) {
    const { toast } = useToast();
    const dealStages = useMemo(() => getStagesForDealType(deal.dealType), [deal.dealType]);
    
    // Use a local state for the entire deal object to allow for real-time local updates
    const [localDeal, setLocalDeal] = useState<Deal>(deal);

    // If the parent `deal` prop changes, update our local state
    useEffect(() => {
        setLocalDeal(deal);
    }, [deal]);

    const dealFlowData = useMemo(() => localDeal.dealFlow || { currentStage: dealStages[0] }, [localDeal, dealStages]);
    const [activeStage, setActiveStage] = useState<DealStage>(dealFlowData.currentStage);

    const handleStageChange = (newStage: DealStage) => {
        setActiveStage(newStage);
        const updatedDealFlowData = { ...dealFlowData, currentStage: newStage };
        // We only save the stage change, not the whole deal object on tab switch
        setDocumentNonBlocking(dealRef, { dealFlow: updatedDealFlowData }, { merge: true });
        toast({ title: 'Stage Updated', description: `Deal moved to ${newStage}.` });
    };

    const updateDeal = (updatedValues: Partial<Deal>) => {
        setLocalDeal(prevDeal => ({ ...prevDeal, ...updatedValues }));
    };
    
    const saveDealChanges = () => {
        setDocumentNonBlocking(dealRef, localDeal, { merge: true });
        toast({ title: "Deal Saved", description: "Your changes have been saved to the database." });
    };

    const updateDealFlow = (data: Partial<DealFlowData>) => {
        const updatedDealFlow = { ...dealFlowData, ...data };
        setLocalDeal(prevDeal => ({...prevDeal, dealFlow: updatedDealFlow}));
        // Note: this only updates the dealFlow part, not other root-level deal properties
        setDocumentNonBlocking(dealRef, { dealFlow: updatedDealFlow }, { merge: true });
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
            <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div>
                            <Button variant="ghost" size="sm" className="mb-2" onClick={onBack}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Deal Summary
                            </Button>
                            <CardTitle className="text-3xl font-headline">{localDeal.dealName} - DealFlow</CardTitle>
                            <CardDescription>Manage your deal from acquisition to exit.</CardDescription>
                        </div>
                         <Button onClick={saveDealChanges}>Save All Changes</Button>
                    </div>
                </CardHeader>
            </Card>

            <Tabs value={activeStage} onValueChange={(v) => handleStageChange(v as DealStage)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-9 h-auto">
                    {dealStages.map(stage => {
                        const Icon = STAGE_ICONS[stage];
                        return (
                            <TabsTrigger key={stage} value={stage} className={cn("flex-col h-16", activeStage === stage && "bg-primary/10")}>
                                <Icon className="w-5 h-5 mb-1" />
                                <span className="text-xs">{stage}</span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
                {dealStages.map(stage => (
                    <TabsContent key={stage} value={stage} className="mt-6">
                        {stage === 'Analysis' ? (
                            <AnalysisTab deal={localDeal} updateDeal={updateDeal} />
                        ) : stage === 'Financing' ? (
                            <FinancingTab deal={localDeal} updateDeal={updateDeal} />
                        ) : stage === 'Rehab' ? (
                            <RehabTab deal={localDeal} dealFlowData={dealFlowData} updateDealFlow={updateDealFlow} updateDeal={updateDeal}/>
                        ) : (
                            <StageTabContent
                                stage={stage}
                                deal={localDeal}
                                dealFlowData={dealFlowData}
                                updateDealFlow={updateDealFlow}
                            />
                        )}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
