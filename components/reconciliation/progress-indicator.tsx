"use client";

import { CheckCircle2, Circle, Loader2 } from "lucide-react";

export type WorkflowStage =
  | "upload"
  | "parsing"
  | "matching"
  | "analyzing"
  | "complete";

type StageConfig = {
  id: WorkflowStage;
  label: string;
  description: string;
};

const STAGES: StageConfig[] = [
  {
    id: "upload",
    label: "Upload",
    description: "Files uploaded",
  },
  {
    id: "parsing",
    label: "Ingestion",
    description: "Parsing CSV files",
  },
  {
    id: "matching",
    label: "Reconciliation",
    description: "Matching records",
  },
  {
    id: "analyzing",
    label: "Evaluation",
    description: "Analyzing breaks with LLM",
  },
  {
    id: "complete",
    label: "Complete",
    description: "Analysis finished",
  },
];

type ProgressIndicatorProps = {
  currentStage: WorkflowStage;
  currentBreak?: number;
  totalBreaks?: number;
};

export function ProgressIndicator({
  currentStage,
  currentBreak,
  totalBreaks,
}: ProgressIndicatorProps) {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage);

  return (
    <div className="w-full space-y-6">
      {/* Stage Progress Bar */}
      <div className="flex items-center justify-between gap-2">
        {STAGES.map((stage, index) => {
          const isComplete = index < currentIndex;
          const isCurrent = index === currentIndex;

          return (
            <div className="flex flex-1 items-center" key={stage.id}>
              {/* Stage Indicator */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`flex size-10 items-center justify-center rounded-full border-2 ${
                    isComplete
                      ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                      : isCurrent
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
                        : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="size-5 text-green-600 dark:text-green-400" />
                  ) : isCurrent ? (
                    <Loader2 className="size-5 animate-spin text-blue-600 dark:text-blue-400" />
                  ) : (
                    <Circle className="size-5 text-gray-400 dark:text-gray-600" />
                  )}
                </div>

                {/* Stage Label */}
                <div className="text-center">
                  <div
                    className={`font-medium text-xs ${
                      isComplete || isCurrent
                        ? "text-gray-900 dark:text-gray-100"
                        : "text-gray-500 dark:text-gray-500"
                    }`}
                  >
                    {stage.label}
                  </div>
                  {isCurrent && (
                    <div className="mt-1 text-gray-500 text-xs dark:text-gray-400">
                      {stage.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < STAGES.length - 1 && (
                <div
                  className={`mx-2 h-0.5 flex-1 ${
                    isComplete ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Break Analysis Progress */}
      {currentStage === "analyzing" && totalBreaks && currentBreak && (
        <div className="rounded-lg border bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-blue-900 dark:text-blue-100">
              Analyzing breaks with LLM...
            </span>
            <span className="text-blue-700 dark:text-blue-300">
              {currentBreak} / {totalBreaks}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-blue-200 dark:bg-blue-900">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-300 dark:bg-blue-400"
              style={{
                width: `${(currentBreak / totalBreaks) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
