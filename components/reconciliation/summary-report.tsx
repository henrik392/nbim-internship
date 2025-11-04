"use client";

import {
  AlertCircle,
  CheckCircle,
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react";
import type { ReconciliationSummary } from "@/lib/reconciliation/types";

type SummaryReportProps = {
  summary: ReconciliationSummary;
};

export function SummaryReport({ summary }: SummaryReportProps) {
  const criticalCount =
    summary.breaks_by_severity.CRITICAL + summary.breaks_by_severity.HIGH;
  const totalEvents = summary.total_events;
  const cleanEvents = totalEvents - summary.events_with_breaks;

  return (
    <div className="space-y-6">
      <h2 className="font-semibold text-gray-900 text-xl dark:text-gray-100">
        Summary Report
      </h2>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <FileText className="size-8 text-blue-600 dark:text-blue-400" />
            <div>
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Total Events
              </p>
              <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">
                {summary.total_events}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <AlertCircle className="size-8 text-red-600 dark:text-red-400" />
            <div>
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Total Breaks
              </p>
              <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">
                {summary.total_breaks}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <TrendingUp className="size-8 text-orange-600 dark:text-orange-400" />
            <div>
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Critical/High
              </p>
              <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">
                {criticalCount}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm dark:bg-gray-950">
          <div className="flex items-center gap-3">
            <CheckCircle className="size-8 text-green-600 dark:text-green-400" />
            <div>
              <p className="text-gray-500 text-sm dark:text-gray-400">
                Clean Events
              </p>
              <p className="font-bold text-2xl text-gray-900 dark:text-gray-100">
                {cleanEvents}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Tables */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Severity Breakdown */}
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-950">
          <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">
            Breaks by Severity
          </h3>
          <div className="space-y-3">
            {Object.entries(summary.breaks_by_severity).map(
              ([severity, count]) => (
                <div
                  className="flex items-center justify-between"
                  key={severity}
                >
                  <span className="text-gray-700 text-sm dark:text-gray-300">
                    {severity}
                  </span>
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={`h-2 rounded-full ${
                          severity === "CRITICAL"
                            ? "bg-red-500"
                            : severity === "HIGH"
                              ? "bg-orange-500"
                              : severity === "MEDIUM"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                        }`}
                        style={{
                          width: `${(count / summary.total_breaks) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right font-semibold text-gray-900 text-sm dark:text-gray-100">
                      {count}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Type Breakdown */}
        <div className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-950">
          <h3 className="mb-4 font-semibold text-gray-900 text-lg dark:text-gray-100">
            Breaks by Type
          </h3>
          <div className="space-y-3">
            {Object.entries(summary.breaks_by_type).map(([type, count]) => (
              <div className="flex items-center justify-between" key={type}>
                <span className="text-gray-700 text-sm dark:text-gray-300">
                  {type.replace("_", " ")}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-24 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{
                        width: `${(count / summary.total_breaks) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="w-8 text-right font-semibold text-gray-900 text-sm dark:text-gray-100">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cost Information with Budget Tracking */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <DollarSign className="mt-1 size-6 text-blue-600 dark:text-blue-400" />
          <div className="flex-1">
            <h3 className="mb-2 font-semibold text-blue-900 dark:text-blue-100">
              Analysis Cost & Budget
            </h3>

            {/* Budget Progress Bar */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-blue-700 dark:text-blue-300">
                  Budget Used:
                </span>
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  ${summary.total_cost.toFixed(4)} / $15.00
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
                <div
                  className={`h-full rounded-full transition-all ${
                    (summary.total_cost / 15) * 100 > 80
                      ? "bg-red-500"
                      : (summary.total_cost / 15) * 100 > 50
                        ? "bg-orange-500"
                        : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min((summary.total_cost / 15) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-right text-blue-600 text-xs dark:text-blue-400">
                {((summary.total_cost / 15) * 100).toFixed(2)}% of budget
              </div>
            </div>

            {/* Cost Metrics */}
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <span className="text-blue-700 dark:text-blue-300">
                  Tokens Used:
                </span>{" "}
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  {summary.total_tokens.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">
                  Cost per Break:
                </span>{" "}
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  ${(summary.total_cost / summary.total_breaks).toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-blue-700 dark:text-blue-300">
                  Remaining Budget:
                </span>{" "}
                <span className="font-semibold text-blue-900 dark:text-blue-100">
                  ${(15 - summary.total_cost).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Scale Projection */}
            {summary.total_cost > 0 && (
              <div className="mt-4 rounded border border-blue-300 bg-blue-100/50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/30">
                <span className="font-medium text-blue-900 dark:text-blue-100">
                  💡 Scale Projection:
                </span>{" "}
                <span className="text-blue-700 dark:text-blue-300">
                  At this rate, you could analyze{" "}
                  <strong className="text-blue-900 dark:text-blue-100">
                    {Math.floor(
                      (15 / summary.total_cost) * summary.total_breaks
                    )}
                  </strong>{" "}
                  breaks within the $15 budget
                  {Math.floor(
                    (15 / summary.total_cost) * summary.total_breaks
                  ) >= 8000 &&
                    " - easily handling 8,000+ annual dividend events!"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
