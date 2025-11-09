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