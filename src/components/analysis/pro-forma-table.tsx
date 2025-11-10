
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

const METRIC_LABELS: { key: keyof ProFormaEntry; label: string, isSubtle?: boolean, isBold?: boolean }[] = [
    { key: 'grossPotentialRent', label: 'Gross Potential Rent' },
    { key: 'vacancyLoss', label: 'Vacancy Loss (-)', isSubtle: true },
    { key: 'effectiveGrossIncome', label: 'Effective Gross Income', isBold: true },
    { key: 'operatingExpenses', label: 'Operating Expenses (-)', isSubtle: true },
    { key: 'noi', label: 'Net Operating Income (NOI)', isBold: true },
    { key: 'debtService', label: 'Debt Service (-)', isSubtle: true },
    { key: 'cashFlowBeforeTax', label: 'Cash Flow (Pre-Tax)', isBold: true },
    { key: 'propertyValue', label: 'End of Year Value', isSubtle: true },
    { key: 'loanBalance', label: 'Loan Balance', isSubtle: true },
    { key: 'equity', label: 'Total Equity', isBold: true },
];


export function ProFormaTable({ data }: { data: ProFormaEntry[] }) {
    if (!data || data.length === 0) {
        return <p className="text-sm text-muted-foreground text-center p-4">Pro Forma data will be generated once you provide the deal assumptions.</p>;
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
                                <TableHead className="font-bold min-w-[200px] sticky left-0 bg-card z-10">Metric</TableHead>
                                {displayData.map((entry) => (
                                    <TableHead key={entry.year} className="text-center font-bold">Year {entry.year}</TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {METRIC_LABELS.map(({ key, label, isSubtle, isBold }) => (
                                <TableRow key={key} className={isBold ? 'font-bold bg-muted/20' : ''}>
                                    <TableCell className={`font-medium sticky left-0 bg-card z-10 ${isSubtle ? 'text-muted-foreground pl-6' : ''}`}>{label}</TableCell>
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
