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

export function ProFormaTable({ data }: { data: ProFormaEntry[] }) {
    return (
        <Collapsible>
            <CollapsibleTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <ChevronsUpDown className="h-4 w-4" />
                    Show 10-Year Pro Forma
                </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="mt-4 border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="font-bold">Year</TableHead>
                                <TableHead>Gross Potential Rent</TableHead>
                                <TableHead>Vacancy Loss</TableHead>
                                <TableHead>Effective Gross Income</TableHead>
                                <TableHead>Operating Expenses</TableHead>
                                <TableHead>NOI</TableHead>
                                <TableHead>Debt Service</TableHead>
                                <TableHead>Cash Flow (Pre-Tax)</TableHead>
                                <TableHead>End of Year Value</TableHead>
                                <TableHead>Loan Balance</TableHead>
                                <TableHead>Total Equity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((entry) => (
                                <TableRow key={entry.year}>
                                    <TableCell className="font-bold">{entry.year}</TableCell>
                                    <TableCell>{formatCurrency(entry.grossPotentialRent)}</TableCell>
                                    <TableCell>{formatCurrency(entry.vacancyLoss)}</TableCell>
                                    <TableCell>{formatCurrency(entry.effectiveGrossIncome)}</TableCell>
                                    <TableCell>{formatCurrency(entry.operatingExpenses)}</TableCell>
                                    <TableCell>{formatCurrency(entry.noi)}</TableCell>
                                    <TableCell>{formatCurrency(entry.debtService)}</TableCell>
                                    <TableCell>{formatCurrency(entry.cashFlowBeforeTax)}</TableCell>
                                    <TableCell>{formatCurrency(entry.propertyValue)}</TableCell>
                                    <TableCell>{formatCurrency(entry.loanBalance)}</TableCell>
                                    <TableCell>{formatCurrency(entry.equity)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CollapsibleContent>
        </Collapsible>
    )
}
