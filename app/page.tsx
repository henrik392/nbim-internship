'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadZone } from '@/components/reconciliation/upload-zone';
import { ResultsTable } from '@/components/reconciliation/results-table';
import { StreamingAnalysis } from '@/components/reconciliation/streaming-analysis';
import { SummaryReport } from '@/components/reconciliation/summary-report';
import { mockBreaks, mockSummary } from '@/lib/reconciliation/mock-data';
import { ArrowLeft } from 'lucide-react';

export default function ReconciliationPage() {
  const [nbimFile, setNbimFile] = useState<File | null>(null);
  const [custodyFile, setCustodyFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleFilesSelected = (nbim: File | null, custody: File | null) => {
    setNbimFile(nbim);
    setCustodyFile(custody);
  };

  const handleAnalyze = async () => {
    if (!nbimFile || !custodyFile) return;

    setIsProcessing(true);

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 2000));

    setIsProcessing(false);
    setShowResults(true);
  };

  const handleReset = () => {
    setShowResults(false);
    setNbimFile(null);
    setCustodyFile(null);
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

      {!showResults ? (
        /* Upload Section */
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 rounded-lg border bg-white p-8 shadow-sm dark:bg-gray-950">
            <h2 className="mb-6 font-semibold text-xl">Upload Files</h2>
            <UploadZone
              onFilesSelected={handleFilesSelected}
              disabled={isProcessing}
            />

            {/* Action Button */}
            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleAnalyze}
                disabled={!canAnalyze}
                size="lg"
                className="min-w-48"
              >
                {isProcessing ? (
                  <>
                    <span className="mr-2 inline-block size-4 animate-spin rounded-full border-2 border-solid border-current border-r-transparent" />
                    Analyzing...
                  </>
                ) : (
                  'Start Reconciliation'
                )}
              </Button>
            </div>

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
                      Custody:{' '}
                      <span className="font-mono">{custodyFile.name}</span> (
                      {(custodyFile.size / 1024).toFixed(1)} KB)
                    </li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Results Section */
        <div className="space-y-8">
          {/* Back Button */}
          <div>
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2"
            >
              <ArrowLeft className="size-4" />
              New Analysis
            </Button>
          </div>

          {/* Summary Report */}
          <SummaryReport summary={mockSummary} />

          {/* Results Table */}
          <div>
            <h2 className="mb-4 font-semibold text-xl text-gray-900 dark:text-gray-100">
              Reconciliation Breaks
            </h2>
            <ResultsTable breaks={mockBreaks} />
          </div>

          {/* Detailed Analysis */}
          <StreamingAnalysis breaks={mockBreaks} />
        </div>
      )}
    </div>
  );
}
