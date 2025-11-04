"use client";

import { AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import type { ReconciliationBreak } from "@/lib/reconciliation/types";
import { cn } from "@/lib/utils";

type StreamingAnalysisProps = {
  breaks: ReconciliationBreak[];
};

const severityIcons = {
  CRITICAL: AlertCircle,
  HIGH: AlertCircle,
  MEDIUM: TrendingUp,
  LOW: CheckCircle,
};

const severityColors = {
  CRITICAL: "text-red-600 dark:text-red-400",
  HIGH: "text-orange-600 dark:text-orange-400",
  MEDIUM: "text-yellow-600 dark:text-yellow-400",
  LOW: "text-green-600 dark:text-green-400",
};

export function StreamingAnalysis({ breaks }: StreamingAnalysisProps) {
  if (breaks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-gray-900 text-xl dark:text-gray-100">
        LLM Analysis
      </h2>

      <div className="space-y-4">
        {breaks.map((breakItem, index) => {
          const Icon = breakItem.severity
            ? severityIcons[breakItem.severity]
            : AlertCircle;
          const iconColor = breakItem.severity
            ? severityColors[breakItem.severity]
            : "text-gray-400";

          return (
            <div
              className="rounded-lg border bg-white p-6 shadow-sm dark:bg-gray-950"
              key={`${breakItem.event_key}-${breakItem.break_type}-${index}`}
            >
              {/* Header */}
              <div className="mb-4 flex items-start gap-4">
                <Icon className={cn("mt-1 size-6 shrink-0", iconColor)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900 text-lg dark:text-gray-100">
                      {breakItem.instrument}
                    </h3>
                    <span className="rounded bg-gray-100 px-2 py-0.5 font-mono text-gray-600 text-xs dark:bg-gray-800 dark:text-gray-400">
                      {breakItem.event_key}
                    </span>
                    <span className="rounded bg-blue-100 px-2 py-0.5 font-medium text-blue-800 text-xs dark:bg-blue-900/30 dark:text-blue-300">
                      {breakItem.break_type}
                    </span>
                  </div>
                </div>
              </div>

              {/* Root Cause */}
              {breakItem.root_cause && (
                <div className="mb-3">
                  <h4 className="mb-1 font-medium text-gray-700 text-sm dark:text-gray-300">
                    Root Cause
                  </h4>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {breakItem.root_cause}
                  </p>
                </div>
              )}

              {/* Explanation */}
              {breakItem.explanation && (
                <div className="mb-3">
                  <h4 className="mb-1 font-medium text-gray-700 text-sm dark:text-gray-300">
                    Analysis
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed dark:text-gray-400">
                    {breakItem.explanation}
                  </p>
                </div>
              )}

              {/* Recommendation */}
              {breakItem.recommendation && (
                <div className="mb-3">
                  <h4 className="mb-1 font-medium text-gray-700 text-sm dark:text-gray-300">
                    Recommended Action
                  </h4>
                  <p className="text-gray-600 text-sm leading-relaxed dark:text-gray-400">
                    {breakItem.recommendation}
                  </p>
                </div>
              )}

              {/* Confidence */}
              {breakItem.confidence !== undefined && (
                <div className="mt-4 flex items-center gap-2 border-gray-200 border-t pt-3 dark:border-gray-800">
                  <span className="text-gray-500 text-sm dark:text-gray-400">
                    Confidence:
                  </span>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className={cn(
                          "h-2 rounded-full transition-all",
                          breakItem.confidence >= 0.9
                            ? "bg-green-500"
                            : breakItem.confidence >= 0.7
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        )}
                        style={{ width: `${breakItem.confidence * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="font-medium text-gray-900 text-sm dark:text-gray-100">
                    {(breakItem.confidence * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
