
'use client';
import { Timestamp } from "firebase/firestore";

export type UserProfile = {
    id?: string;
    name?: string;
    email?: string;
    photoURL?: string;
    country?: string;
    state?: string;
    financialGoal?: string;
    plan?: 'Free' | 'Pro' | 'Executive' | 'Elite';
};

export type DealStatus = 'In Works' | 'Negotiating' | 'Bought' | 'Owned & Operating' | 'Sold';
export type DealStage = 'Analysis' | 'Financing' | 'Negotiations' | 'Inspections' | 'Closing' | 'Rehab' | 'Marketing' | 'Renting' | 'Management' | 'Selling';

export type DealComment = {
    id: string;
    author: string;
    text: string;
    createdAt: Timestamp;
}

export type UnitMixItem = {
    type: string;
    count: number;
    rent: number;
}

export type LineItem = {
    name: string;
    amount: number;
}

export type RehabTask = {
    id: string;
    name: string;
    cost: number;
    startDate: string; // ISO string
    endDate: string; // ISO string
    status: 'Not Started' | 'In Progress' | 'Completed';
}

export type DealDocument = {
    name: string;
    url: string; // For local blobs or remote storage
    uploadedAt: string; // ISO string
}

export type DealFlowData = {
    currentStage: DealStage;
    notes?: Record<DealStage, string>;
    aiRecommendations?: Record<DealStage, string>;
    documents?: Record<DealStage, DealDocument[]>;
    negotiationDetails?: {
        offerPrice: number;
        contingencies: string;
    };
    rehabDetails?: {
        budget: number;
        tasks: RehabTask[];
    };
    // Add other stage-specific data structures here
}


export type Deal = {
    id: string;
    userId: string;
    dealName: string;
    dealType: 'Rental Property' | 'House Flip' | 'Commercial Multifamily';
    createdAt: Timestamp;
    
    // Purchase & Loan
    purchasePrice: number;
    closingCosts: number;
    rehabCost: number;
    arv: number;
    downPayment: number;
    loanTerm: number;
    interestRate: number;
    loanAmount?: number; // Added for commercial
    
    // Income
    grossMonthlyIncome: number;
    otherIncomes?: LineItem[]; 
    unitMix?: UnitMixItem[];

    // Expenses
    propertyTaxes: number;
    insurance: number;
    repairsAndMaintenance: number;
    vacancy: number;
    capitalExpenditures: number;
    managementFee: number;
    otherExpenses: number;
    operatingExpenses?: LineItem[];

    // Projections
    annualIncomeGrowth: number;
    annualExpenseGrowth: number;
    annualAppreciation: number;
    holdingLength: number; 
    sellingCosts: number;

    // Calculated Metrics
    monthlyCashFlow?: number;
    cocReturn?: number;
    noi?: number;
    capRate?: number;
    roi?: number;
    netProfit?: number;

    // Deal Management
    marketConditions: string;
    status: DealStatus;
    isPublished: boolean;
    investorNotes?: string;
    isAdvanced?: boolean;
    dealFlow?: DealFlowData;
};

export type Testimonial = {
    name: string;
    role: string;
    avatarUrl: string;
    text: string;
};

export type FaqItem = {
    question: string;
    answer: string;
};

export type ProFormaEntry = {
    year: number;
    grossPotentialRent: number;
    vacancyLoss: number;
    effectiveGrossIncome: number;
    operatingExpenses: number;
    noi: number;
    debtService: number;
    cashFlowBeforeTax: number;
hange>
  <change>
    <file>src/components/analysis/pro-forma-table.tsx</file>
    <content><![CDATA[
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Button } from "../ui/button";
import { ChevronsUpDown } from "lucide-react";
import type { ProFormaEntry } from "@/lib/types";

function formatCurrency(value: number) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
}

const METRIC_LABELS: { key: keyof ProFormaEntry; label: string }[] = [
    { key: 'grossPotentialRent', label: 'Gross Potential Rent' },
    { key: 'vacancyLoss', label: 'Vacancy Loss (-)' },
    { key: 'effectiveGrossIncome', label: 'Effective Gross Income' },
    { key: 'operatingExpenses', label: 'Operating Expenses (-)' },
    { key: 'noi', label: 'Net Operating Income (NOI)' },
    { key: 'debtService', label: 'Debt Service (-)' },
    { key: 'cashFlowBeforeTax', label: 'Cash Flow (Pre-Tax)' },
    { key: 'propertyValue', label: 'End of Year Value' },
    { key: 'loanBalance', label: 'Loan Balance' },
    { key: 'equity', label: 'Total Equity' },
];


export function ProFormaTable({ data }: { data: ProFormaEntry[] }) {
    if (!data || data.length === 0) {
        return null;
    }
    
    const displayData = data.slice(0, 10);

    return (
        <Collapsible defaultOpen>
            <CollapsibleTrigger asChild>
                 <div className="flex justify-between items-center w-full">
                    <h3 className="text-xl font-headline">10-Year Pro Forma</h3>
                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <ChevronsUpDown className="h-4 w-4" />
                        Show/Hide Details
                    </Button>
                </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-4 border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold min-w-[200px]">Metric</TableHead>
                                {displayData.map((entry) => (
                                    <TableHead key={entry.year} className="text-center font-bold">Year {entry.year}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {METRIC_LABELS.map(({ key, label }) => (
                                <TableRow key={key} className={key === 'noi' || key === 'cashFlowBeforeTax' || key === 'equity' ? 'font-bold bg-muted/20' : ''}>
                                    <TableCell className="font-medium">{label}</TableCell>
                                    {displayData.map((entry) => (
                                        <TableCell key={`${entry.year}-${key}`} className="text-center">
                                            {formatCurrency(entry[key] as number)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
