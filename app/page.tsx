"use client";

import { ArrowLeft } from "lucide-react";
import { useState } from "react";
import {
  ProgressIndicator,
  type WorkflowStage,
} from "@/components/reconciliation/progress-indicator";
import { ResultsTable } from "@/components/reconciliation/results-table";
import { StreamingAnalysis } from "@/components/reconciliation/streaming-analysis";
import { SummaryReport } from "@/components/reconciliation/summary-report";
import { UploadZone } from "@/components/reconciliation/upload-zone";
import { Button } from "@/components/ui/button";
import type {
  ReconciliationBreak,
  ReconciliationSummary,
} from "@/lib/reconciliation/types";

export default function ReconciliationPage() {
  const [nbimFile, setNbimFile] = useState<File | null>(null);
  const [custodyFile, setCustodyFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [breaks, setBreaks] = useState<ReconciliationBreak[]>([]);
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<WorkflowStage>("upload");

  const handleFilesSelected = (nbim: File | null, custody: File | null) => {
    setNbimFile(nbim);
    setCustodyFile(custody);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!nbimFile || !custodyFile) {
      return;
    }

    setIsProcessing(true);
    setError(null);
    setCurrentStage("parsing");

    try {
      // Simulate progress stages
      setTimeout(() => setCurrentStage("matching"), 300);
      setTimeout(() => setCurrentStage("analyzing"), 600);

      // Create form data for API request
      const formData = new FormData();
      formData.append("nbimFile", nbimFile);
      formData.append("custodyFile", custodyFile);

      // Call API endpoint
      const response = await fetch("/api/reconciliation/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process files");
      }

      const data = await response.json();

      setCurrentStage("complete");
      setBreaks(data.breaks);
      setSummary(data.summary);

      // Show results after a brief delay
      setTimeout(() => setShowResults(true), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process files");
      console.error("Processing error:", err);
      setCurrentStage("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setShowResults(false);
    setBreaks([]);
    setSummary(null);
    setNbimFile(null);
    setCustodyFile(null);
    setError(null);
    setCurrentStage("upload");
  };

  const canAnalyze = nbimFile && custodyFile && !isProcessing;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="font-bold text-4xl tracking-tight">
          NBIM Dividend Reconciliation
        </h1>
        <p className="mt-3 text-gray-600 text-lg dark:text-gray-400">
          LLM-powered intelligent break detection and analysis
        </p>
      </div>

      {showResults ? (
        /* Results Section */
        <div className="space-y-8">
          {/* Back Button */}
          <div>
            <Button className="gap-2" onClick={handleReset} variant="outline">
              <ArrowLeft className="size-4" />
              New Analysis
            </Button>
          </div>

          {/* Summary Report */}
          {summary && <SummaryReport summary={summary} />}

          {/* Results Table */}
          <div>
            <h2 className="mb-4 font-semibold text-gray-900 text-xl dark:text-gray-100">
              Reconciliation Breaks
            </h2>
            <ResultsTable breaks={breaks} />
          </div>

          {/* Note: LLM Analysis will be added in Milestone 2 */}
          {breaks.length > 0 && breaks[0].severity && (
            <StreamingAnalysis breaks={breaks} />
          )}
        </div>
      ) : (
        /* Upload Section */
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 rounded-lg border bg-white p-8 shadow-sm dark:bg-gray-950">
            <h2 className="mb-6 font-semibold text-xl">Upload Files</h2>
            {/* Progress Indicator */}
            {isProcessing && (
              <div className="mb-8">
                <ProgressIndicator currentStage={currentStage} />
              </div>
            )}

            {!isProcessing && (
              <UploadZone
                disabled={isProcessing}
                onFilesSelected={handleFilesSelected}
              />
            )}

            {/* Action Button */}
            <div className="mt-8 flex justify-center">
              <Button
                className="min-w-48"
                disabled={!canAnalyze}
                onClick={handleAnalyze}
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent border-solid" />
                    Analyzing...
                  </>
                ) : (
                  "Start Reconciliation"
                )}
              </Button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950/20">
                <h3 className="mb-1 font-medium text-red-900 dark:text-red-100">
                  Error Processing Files
                </h3>
                <p className="text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* File Info */}
            {(nbimFile || custodyFile) && (
              <div className="mt-6 rounded-md bg-gray-50 p-4 text-sm dark:bg-gray-900">
                <h3 className="mb-2 font-medium">Selected Files:</h3>
                <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                  {nbimFile && (
                    <li>
                      NBIM: <span className="font-mono">{nbimFile.name}</span> (
                      {(nbimFile.size / 1024).toFixed(1)} KB)
                    </li>
                  )}
                  {custodyFile && (
                    <li>
                      Custody:{" "}
                      <span className="font-mono">{custodyFile.name}</span> (
                      {(custodyFile.size / 1024).toFixed(1)} KB)
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
