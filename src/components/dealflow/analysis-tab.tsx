'use client';

import type { Deal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { InputWithIcon } from '../ui/input-with-icon';
import { Label } from '../ui/label';
import { useMemo } from 'react';

interface AnalysisTabProps {
    deal: Deal;
    updateDeal: (updatedValues: Partial<Deal>) => void;
}

export function AnalysisTab({ deal, updateDeal }: AnalysisTabProps) {
    
    // Perform calculations based on the live 'deal' state
    const { monthlyCashFlow, noi, capRate, cocReturn, roi, netProfit } = useMemo(() => {
        // This logic should mirror the main calculators to ensure consistency
        if (deal.dealType === 'House Flip') {
             const acquisitionCosts = deal.purchasePrice * (deal.closingCosts / 100);
             const holdingCosts = (
                (deal.propertyTaxes/100 * deal.purchasePrice / 12) +
                (deal.insurance/100 * deal.purchasePrice / 12) +
                (deal.otherExpenses / deal.holdingLength)
            ) * deal.holdingLength;
            const financingCosts = (deal.purchasePrice - deal.downPayment) * (deal.interestRate/100) * (deal.holdingLength/12);
            const totalInvestment = deal.downPayment + deal.rehabCost + acquisitionCosts;
            const totalProjectCosts = deal.purchasePrice + deal.rehabCost + acquisitionCosts + holdingCosts + financingCosts;
            const finalSellingCosts = (deal.sellingCosts / 100) * deal.arv;
            
            const netProfit = deal.arv - totalProjectCosts - finalSellingCosts;
            const roi = totalInvestment > 0 ? (netProfit / totalInvestment) * 100 : 0;
            return { netProfit, roi, monthlyCashFlow: 0, noi: 0, capRate: 0, cocReturn: 0 };
        } else { // Rental or Commercial
            const gmi = deal.grossMonthlyIncome;
            const expenseRate = (deal.propertyTaxes + deal.insurance + deal.repairsAndMaintenance + deal.vacancy + deal.capitalExpenditures + deal.managementFee + deal.otherExpenses) / 100;
            const totalOpEx = (gmi * 12) * expenseRate;
            const vacancyLoss = (gmi * 12) * (deal.vacancy / 100);
            const effectiveGrossIncome = (gmi * 12) - vacancyLoss;
            const noi = effectiveGrossIncome - (totalOpEx - vacancyLoss);

            const loanAmount = deal.purchasePrice + deal.rehabCost + (deal.purchasePrice * (deal.closingCosts / 100)) - deal.downPayment;
            const monthlyInterestRate = deal.interestRate / 100 / 12;
            const numberOfPayments = deal.loanTerm * 12;
            const debtService = numberOfPayments > 0 && monthlyInterestRate > 0 ?
                (loanAmount * (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, numberOfPayments))) / (Math.pow(1 + monthlyInterestRate, numberOfPayments) - 1) * 12
                : 0;

            const cashFlowBeforeTax = noi - debtService;
            const monthlyCashFlow = cashFlowBeforeTax / 12;

            const totalInvestment = deal.downPayment + deal.rehabCost + (deal.purchasePrice * (deal.closingCosts/100));
            const cocReturn = totalInvestment > 0 ? (cashFlowBeforeTax / totalInvestment) * 100 : 0;
            
            const arv = deal.purchasePrice + deal.rehabCost;
            const capRate = arv > 0 ? (noi / arv) * 100 : 0;

            return { monthlyCashFlow, noi, capRate, cocReturn, netProfit: 0, roi: 0 };
        }

    }, [deal]);
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateDeal({ [name]: parseFloat(value) || 0 });
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Core Analysis</CardTitle>
                        <CardDescription>Adjust the core numbers of your deal in real-time.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <Label htmlFor="purchasePrice">Purchase Price</Label>
                            <InputWithIcon id="purchasePrice" name="purchasePrice" icon="$" type="number" value={deal.purchasePrice} onChange={handleChange} />
                        </div>
                        <div>
                            <Label htmlFor="rehabCost">Rehab Cost</Label>
                            <InputWithIcon id="rehabCost" name="rehabCost" icon="$" type="number" value={deal.rehabCost} onChange={handleChange} />
                        </div>
                        <div>
                            <Label htmlFor="arv">After-Repair Value</Label>
                            <InputWithIcon id="arv" name="arv" icon="$" type="number" value={deal.arv} onChange={handleChange} />
                        </div>
                        {deal.dealType !== 'House Flip' && (
                            <div>
                                <Label htmlFor="grossMonthlyIncome">Gross Monthly Income</Label>
                                <InputWithIcon id="grossMonthlyIncome" name="grossMonthlyIncome" icon="$" type="number" value={deal.grossMonthlyIncome} onChange={handleChange} />
                            </div>
                        )}
                         <div>
                            <Label htmlFor="closingCosts">Closing Costs (%)</Label>
                            <InputWithIcon id="closingCosts" name="closingCosts" icon="%" iconPosition='right' type="number" value={deal.closingCosts} onChange={handleChange} />
                        </div>
                         <div>
                            <Label htmlFor="sellingCosts">Selling Costs (%)</Label>
                            <InputWithIcon id="sellingCosts" name="sellingCosts" icon="%" iconPosition='right' type="number" value={deal.sellingCosts} onChange={handleChange} />
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Live Metrics</CardTitle>
                        <CardDescription>Metrics update as you edit.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                       {deal.dealType !== 'House Flip' ? (
                        <>
                            <div>
                                <p className="text-sm text-muted-foreground">Cap Rate</p>
                                <p className="text-2xl font-bold">{capRate.toFixed(2)}%</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">NOI</p>
                                <p className="text-2xl font-bold">${noi.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Cash Flow</p>
                                <p className="text-2xl font-bold">${monthlyCashFlow.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">CoC Return</p>
                                <p className="text-2xl font-bold">{cocReturn.toFixed(2)}%</p>
                            </div>
                        </>
                       ) : (
                        <>
                             <div>
                                <p className="text-sm text-muted-foreground">Net Profit</p>
                                <p className="text-2xl font-bold">${netProfit.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                            </div>
                             <div>
                                <p className="text-sm text-muted-foreground">ROI</p>
                                <p className="text-2xl font-bold">{roi.toFixed(2)}%</p>
                            </div>
                        </>
                       )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
