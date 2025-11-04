'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { UploadZone } from '@/components/reconciliation/upload-zone';

export default function ReconciliationPage() {
  const [nbimFile, setNbimFile] = useState<File | null>(null);
  const [custodyFile, setCustodyFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFilesSelected = (nbim: File | null, custody: File | null) => {
    setNbimFile(nbim);
    setCustodyFile(custody);
  };

  const handleAnalyze = async () => {
    if (!nbimFile || !custodyFile) return;

    setIsProcessing(true);
    // TODO: Implement reconciliation logic
    console.log('Analyzing:', { nbimFile, custodyFile });
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

      {/* Upload Section */}
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

        {/* Instructions */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-900 dark:bg-blue-950/20">
          <h3 className="mb-3 font-semibold text-blue-900 dark:text-blue-100">
            How it works
          </h3>
          <ol className="space-y-2 text-blue-800 text-sm dark:text-blue-200">
            <li>1. Upload your NBIM booking and custodian CSV files</li>
            <li>2. Click "Start Reconciliation" to analyze discrepancies</li>
            <li>
              3. Review LLM-powered severity classifications and recommendations
            </li>
            <li>4. Export results or take action on identified breaks</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
