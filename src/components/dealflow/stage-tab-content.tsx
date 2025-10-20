'use client';

import { useState, useTransition } from 'react';
import type { Deal, DealFlowData, DealStage } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { getDealAssessment } from '@/lib/actions';
import { Input } from '../ui/input';

interface StageTabContentProps {
    stage: DealStage;
    deal: Deal;
    dealFlowData: DealFlowData;
    updateDealFlow: (data: Partial<DealFlowData>) => void;
}

export function StageTabContent({ stage, deal, dealFlowData, updateDealFlow }: StageTabContentProps) {
    const [isAIPending, startAITransition] = useTransition();
    const [notes, setNotes] = useState(dealFlowData.notes?.[stage] || '');

    const handleGenerateInsights = () => {
        startAITransition(async () => {
            let financialData = `Purchase Price: ${deal.purchasePrice}, Rehab Cost: ${deal.rehabCost}, ARV: ${deal.arv}`;
            const result = await getDealAssessment({
                dealType: deal.dealType,
                financialData,
                marketConditions: deal.marketConditions,
                stage: stage,
            });

            if (result.assessment) {
                updateDealFlow({
                    aiRecommendations: {
                        ...dealFlowData.aiRecommendations,
                        [stage]: result.assessment,
                    },
                });
            }
        });
    };

    const handleSaveNotes = () => {
        updateDealFlow({
            notes: {
                ...dealFlowData.notes,
                [stage]: notes,
            }
        });
    };
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        
        const existingDocs = dealFlowData.documents?.[stage] || [];
        const newDocs = Array.from(files).map(file => ({
            name: file.name,
            url: URL.createObjectURL(file), // Note: This URL is temporary and local
            uploadedAt: new Date().toISOString()
        }));

        updateDealFlow({
            documents: {
                ...dealFlowData.documents,
                [stage]: [...existingDocs, ...newDocs]
            }
        })
    };


    const aiRecommendation = dealFlowData.aiRecommendations?.[stage];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Documents for {stage}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Input type="file" multiple onChange={handleFileChange} />
                        <ul className="mt-4 space-y-2 text-sm">
                            {dealFlowData.documents?.[stage]?.map((doc, index) => (
                                <li key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="truncate hover:underline">{doc.name}</a>
                                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-4">{new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                </li>
                            ))}
                        </ul>
                         {(!dealFlowData.documents?.[stage] || dealFlowData.documents?.[stage]?.length === 0) && (
                            <p className="text-muted-foreground text-xs mt-2">Upload relevant documents like offers, inspection reports, or lease agreements.</p>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>My Notes for {stage}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder={`Enter your notes for the ${stage} stage...`}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[150px]"
                        />
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleSaveNotes}>Save Notes</Button>
                    </CardFooter>
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
                            <p className="text-sm text-muted-foreground">Click below to generate AI-powered recommendations for the {stage} stage.</p>
                        )}
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleGenerateInsights} disabled={isAIPending} className="w-full">
                            {isAIPending ? 'Generating...' : `Generate ${stage} Insights`}
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
}
