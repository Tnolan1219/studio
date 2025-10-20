'use client';

import { useState, useMemo } from 'react';
import type { Deal, DealFlowData, DealStage } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ArrowLeft, Bot, Building, Hammer, Handshake, Home, Megaphone, Repeat, Search, KeyRound, DollarSign, Wallet, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setDocumentNonBlocking } from '@/firebase';
import { DocumentReference } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { StageTabContent } from './stage-tab-content';
import { RehabTab } from './rehab-tab';

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
    const [activeStage, setActiveStage] = useState<DealStage>(deal.dealFlow?.currentStage || dealStages[0]);
    const [dealFlowData, setDealFlowData] = useState<DealFlowData>(deal.dealFlow || { currentStage: dealStages[0] });

    const handleStageChange = (newStage: DealStage) => {
        setActiveStage(newStage);
        const updatedDealFlowData = { ...dealFlowData, currentStage: newStage };
        setDealFlowData(updatedDealFlowData);
        setDocumentNonBlocking(dealRef, { dealFlow: updatedDealFlowData }, { merge: true });
        toast({ title: 'Stage Updated', description: `Deal moved to ${newStage}.` });
    };

    const updateDealFlow = (data: Partial<DealFlowData>) => {
        const updatedData = { ...dealFlowData, ...data };
        setDealFlowData(updatedData);
        setDocumentNonBlocking(dealRef, { dealFlow: updatedData }, { merge: true });
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in">
            <Card className="bg-card/60 backdrop-blur-sm">
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <Button variant="ghost" size="sm" className="mb-2" onClick={onBack}>
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to Deal Summary
                            </Button>
                            <CardTitle className="text-3xl font-headline">{deal.dealName} - DealFlow</CardTitle>
                            <CardDescription>Manage your deal from acquisition to exit.</CardDescription>
                        </div>
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
                        {stage === 'Rehab' ? (
                            <RehabTab deal={deal} dealFlowData={dealFlowData} updateDealFlow={updateDealFlow} />
                        ) : (
                            <StageTabContent
                                stage={stage}
                                deal={deal}
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
