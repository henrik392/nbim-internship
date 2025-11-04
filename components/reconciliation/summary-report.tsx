"use client";

import { AlertCircle, CheckCircle, FileText, TrendingUp } from "lucide-react";
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
    </div>
  );
}
