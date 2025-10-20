'use client';

import type { Deal } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { InputWithIcon } from '../ui/input-with-icon';
import { Label } from '../ui/label';

interface FinancingTabProps {
    deal: Deal;
    updateDeal: (updatedValues: Partial<Deal>) => void;
}

export function FinancingTab({ deal, updateDeal }: FinancingTabProps) {
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        updateDeal({ [name]: parseFloat(value) || 0 });
    };
    
    const loanAmount = deal.purchasePrice + deal.rehabCost + (deal.purchasePrice * (deal.closingCosts / 100)) - deal.downPayment;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Deal Financing</CardTitle>
                <CardDescription>Adjust financing details to see their impact on your returns.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                    <Label htmlFor="downPayment">Down Payment</Label>
                    <InputWithIcon id="downPayment" name="downPayment" icon="$" type="number" value={deal.downPayment} onChange={handleChange} />
                </div>
                <div>
                    <Label htmlFor="interestRate">Interest Rate (%)</Label>
                    <InputWithIcon id="interestRate" name="interestRate" icon="%" iconPosition='right' type="number" value={deal.interestRate} onChange={handleChange} step="0.01" />
                </div>
                <div>
                    <Label htmlFor="loanTerm">Loan Term (Years)</Label>
                    <InputWithIcon id="loanTerm" name="loanTerm" icon="" type="number" value={deal.loanTerm} onChange={handleChange} />
                </div>
                 <div>
                    <Label>Calculated Loan Amount</Label>
                    <p className="text-2xl font-bold pt-2">${loanAmount.toLocaleString(undefined, {maximumFractionDigits: 0})}</p>
                </div>
            </CardContent>
        </Card>
    );
}
