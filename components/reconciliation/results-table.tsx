"use client";

import type { ReconciliationBreak } from "@/lib/reconciliation/types";
import { cn } from "@/lib/utils";

type ResultsTableProps = {
  breaks: ReconciliationBreak[];
};

const severityColors = {
  CRITICAL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  HIGH: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  MEDIUM:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  LOW: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

const breakTypeLabels = {
  QUANTITY: "Quantity",
  AMOUNT: "Amount",
  TAX_RATE: "Tax Rate",
  MISSING_RECORD: "Missing",
};

function formatNumber(num: number | null): string {
  if (num === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatCurrency(num: number | null): string {
  if (num === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

export function ResultsTable({ breaks }: ResultsTableProps) {
  if (breaks.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-12 text-center dark:bg-gray-950">
        <p className="text-gray-500">No reconciliation breaks detected.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-950">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm dark:text-gray-100">
                Event Key
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm dark:text-gray-100">
                Instrument
              </th>
              <th className="px-4 py-3 text-left font-semibold text-gray-900 text-sm dark:text-gray-100">
                Type
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900 text-sm dark:text-gray-100">
                NBIM
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900 text-sm dark:text-gray-100">
                Custody
              </th>
              <th className="px-4 py-3 text-right font-semibold text-gray-900 text-sm dark:text-gray-100">
                Difference
              </th>
              <th className="px-4 py-3 text-center font-semibold text-gray-900 text-sm dark:text-gray-100">
                Severity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {breaks.map((breakItem, index) => (
              <tr
                className="hover:bg-gray-50 dark:hover:bg-gray-900/50"
                key={`${breakItem.event_key}-${breakItem.break_type}-${index}`}
              >
                <td className="px-4 py-3 font-mono text-gray-900 text-sm dark:text-gray-100">
                  {breakItem.event_key}
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {breakItem.instrument}
                  </div>
                  <div className="font-mono text-gray-500 text-xs dark:text-gray-400">
                    {breakItem.isin}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700 text-sm dark:text-gray-300">
                  {breakTypeLabels[breakItem.break_type]}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 text-sm dark:text-gray-100">
                  {breakItem.break_type === "AMOUNT"
                    ? formatCurrency(breakItem.nbim_value)
                    : formatNumber(breakItem.nbim_value)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900 text-sm dark:text-gray-100">
                  {breakItem.break_type === "AMOUNT"
                    ? formatCurrency(breakItem.custody_value)
                    : formatNumber(breakItem.custody_value)}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-medium font-mono text-sm",
                    breakItem.difference > 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-red-600 dark:text-red-400"
                  )}
                >
                  {breakItem.difference > 0 ? "+" : ""}
                  {breakItem.break_type === "AMOUNT"
                    ? formatCurrency(breakItem.difference)
                    : formatNumber(breakItem.difference)}
                  <span className="ml-1 text-xs">
                    ({breakItem.difference_pct > 0 ? "+" : ""}
                    {breakItem.difference_pct.toFixed(1)}%)
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {breakItem.severity && (
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 font-medium text-xs",
                        severityColors[breakItem.severity]
                      )}
                    >
                      {breakItem.severity}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
