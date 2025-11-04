"use client";

import { AlertCircle, DollarSign, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OpenRouterKeyUsage } from "@/lib/openrouter/types";

export function OpenRouterUsage() {
  const [usage, setUsage] = useState<OpenRouterKeyUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsage = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/openrouter/usage");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch usage data");
      }

      const data = await response.json();
      setUsage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch usage");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsage();
  }, []);

  if (isLoading && !usage) {
    return (
      <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 dark:border-purple-900 dark:bg-purple-950/20">
        <div className="flex items-center gap-3">
          <RefreshCw className="size-5 animate-spin text-purple-600 dark:text-purple-400" />
          <span className="text-purple-900 text-sm dark:text-purple-100">
            Loading OpenRouter usage...
          </span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950/20">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 text-red-600 dark:text-red-400" />
          <div className="flex-1">
            <h3 className="mb-1 font-semibold text-red-900 dark:text-red-100">
              Failed to Load Usage Data
            </h3>
            <p className="text-red-700 text-sm dark:text-red-300">{error}</p>
            <Button
              className="mt-3"
              onClick={fetchUsage}
              size="sm"
              variant="outline"
            >
              <RefreshCw className="mr-2 size-3" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!usage) {
    return null;
  }

  const { data } = usage;
  const hasLimit = data.limit !== null;
  const usagePercent = hasLimit
    ? ((data.usage / (data.limit ?? 1)) * 100).toFixed(1)
    : null;

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-6 shadow-sm dark:border-purple-900 dark:bg-purple-950/20">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <DollarSign className="mt-1 size-8 text-purple-600 dark:text-purple-400" />
          <div className="flex-1">
            <div className="mb-4 flex items-center gap-3">
              <h3 className="font-semibold text-lg text-purple-900 dark:text-purple-100">
                OpenRouter API Usage
              </h3>
              {data.is_free_tier && (
                <span className="rounded bg-purple-200 px-2 py-1 font-medium text-purple-800 text-xs dark:bg-purple-800 dark:text-purple-200">
                  Free Tier
                </span>
              )}
            </div>

            {/* Credit Limit & Remaining */}
            {hasLimit && (
              <div className="mb-6">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-purple-700 dark:text-purple-300">
                    Credits Used:
                  </span>
                  <span className="font-bold text-lg text-purple-900 dark:text-purple-100">
                    ${data.usage.toFixed(2)} / ${data.limit?.toFixed(2) ?? "∞"}
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-purple-200 dark:bg-purple-900">
                  <div
                    className={`h-full rounded-full transition-all ${
                      Number(usagePercent) > 80
                        ? "bg-red-500"
                        : Number(usagePercent) > 50
                          ? "bg-orange-500"
                          : "bg-green-500"
                    }`}
                    style={{
                      width: `${Math.min(Number(usagePercent), 100)}%`,
                    }}
                  />
                </div>
                <div className="mt-2 text-right text-purple-600 text-sm dark:text-purple-400">
                  {usagePercent}% used • $
                  {data.limit_remaining?.toFixed(2) ?? "0.00"} remaining
                </div>
              </div>
            )}

            {/* Usage Breakdown */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-md bg-purple-100 p-3 dark:bg-purple-900/40">
                <div className="text-purple-600 text-xs font-medium uppercase dark:text-purple-400">
                  Daily
                </div>
                <div className="mt-1 font-bold text-lg text-purple-900 dark:text-purple-100">
                  ${data.usage_daily.toFixed(4)}
                </div>
              </div>
              <div className="rounded-md bg-purple-100 p-3 dark:bg-purple-900/40">
                <div className="text-purple-600 text-xs font-medium uppercase dark:text-purple-400">
                  Weekly
                </div>
                <div className="mt-1 font-bold text-lg text-purple-900 dark:text-purple-100">
                  ${data.usage_weekly.toFixed(4)}
                </div>
              </div>
              <div className="rounded-md bg-purple-100 p-3 dark:bg-purple-900/40">
                <div className="text-purple-600 text-xs font-medium uppercase dark:text-purple-400">
                  Monthly
                </div>
                <div className="mt-1 font-bold text-lg text-purple-900 dark:text-purple-100">
                  ${data.usage_monthly.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Limit Reset Info */}
            {data.limit_reset && (
              <div className="mt-4 rounded border border-purple-300 bg-purple-100/50 p-3 dark:border-purple-800 dark:bg-purple-900/30">
                <span className="text-purple-700 dark:text-purple-300">
                  Limit resets:{" "}
                </span>
                <span className="font-semibold text-purple-900 dark:text-purple-100">
                  {data.limit_reset}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Refresh Button */}
        <Button onClick={fetchUsage} size="sm" type="button" variant="outline">
          <RefreshCw className={`size-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>
    </div>
  );
}
