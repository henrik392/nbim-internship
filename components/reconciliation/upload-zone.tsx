'use client';

import { useCallback, useState } from 'react';
import { Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

type UploadZoneProps = {
  onFilesSelected: (nbimFile: File | null, custodyFile: File | null) => void;
  disabled?: boolean;
};

export function UploadZone({ onFilesSelected, disabled }: UploadZoneProps) {
  const [nbimFile, setNbimFile] = useState<File | null>(null);
  const [custodyFile, setCustodyFile] = useState<File | null>(null);
  const [nbimDragActive, setNbimDragActive] = useState(false);
  const [custodyDragActive, setCustodyDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent, type: 'nbim' | 'custody') => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      if (type === 'nbim') {
        setNbimDragActive(true);
      } else {
        setCustodyDragActive(true);
      }
    } else if (e.type === 'dragleave') {
      if (type === 'nbim') {
        setNbimDragActive(false);
      } else {
        setCustodyDragActive(false);
      }
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: 'nbim' | 'custody') => {
      e.preventDefault();
      e.stopPropagation();
      setNbimDragActive(false);
      setCustodyDragActive(false);

      const files = e.dataTransfer.files;
      if (files?.[0] && files[0].type === 'text/csv') {
        if (type === 'nbim') {
          setNbimFile(files[0]);
          onFilesSelected(files[0], custodyFile);
        } else {
          setCustodyFile(files[0]);
          onFilesSelected(nbimFile, files[0]);
        }
      }
    },
    [nbimFile, custodyFile, onFilesSelected]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>, type: 'nbim' | 'custody') => {
      const files = e.target.files;
      if (files?.[0]) {
        if (type === 'nbim') {
          setNbimFile(files[0]);
          onFilesSelected(files[0], custodyFile);
        } else {
          setCustodyFile(files[0]);
          onFilesSelected(nbimFile, files[0]);
        }
      }
    },
    [nbimFile, custodyFile, onFilesSelected]
  );

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* NBIM Upload */}
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          nbimDragActive && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'cursor-pointer hover:border-gray-400'
        )}
        onDragEnter={(e) => handleDrag(e, 'nbim')}
        onDragLeave={(e) => handleDrag(e, 'nbim')}
        onDragOver={(e) => handleDrag(e, 'nbim')}
        onDrop={(e) => handleDrop(e, 'nbim')}
        onClick={() => !disabled && document.getElementById('nbim-upload')?.click()}
      >
        <input
          id="nbim-upload"
          type="file"
          className="hidden"
          accept=".csv"
          onChange={(e) => handleFileInput(e, 'nbim')}
          disabled={disabled}
        />
        <Upload className="mx-auto size-12 text-gray-400" />
        <h3 className="mt-4 font-semibold text-lg">NBIM Booking File</h3>
        {nbimFile ? (
          <p className="mt-2 text-green-600 text-sm dark:text-green-400">
            ✓ {nbimFile.name}
          </p>
        ) : (
          <>
            <p className="mt-2 text-gray-500 text-sm">
              Drop your NBIM CSV file here
            </p>
            <p className="text-gray-400 text-xs">or click to browse</p>
          </>
        )}
      </div>

      {/* Custody Upload */}
      <div
        className={cn(
          'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          custodyDragActive && 'border-blue-500 bg-blue-50 dark:bg-blue-950/20',
          disabled && 'cursor-not-allowed opacity-50',
          !disabled && 'cursor-pointer hover:border-gray-400'
        )}
        onDragEnter={(e) => handleDrag(e, 'custody')}
        onDragLeave={(e) => handleDrag(e, 'custody')}
        onDragOver={(e) => handleDrag(e, 'custody')}
        onDrop={(e) => handleDrop(e, 'custody')}
        onClick={() => !disabled && document.getElementById('custody-upload')?.click()}
      >
        <input
          id="custody-upload"
          type="file"
          className="hidden"
          accept=".csv"
          onChange={(e) => handleFileInput(e, 'custody')}
          disabled={disabled}
        />
        <Upload className="mx-auto size-12 text-gray-400" />
        <h3 className="mt-4 font-semibold text-lg">Custodian File</h3>
        {custodyFile ? (
          <p className="mt-2 text-green-600 text-sm dark:text-green-400">
            ✓ {custodyFile.name}
          </p>
        ) : (
          <>
            <p className="mt-2 text-gray-500 text-sm">
              Drop your Custodian CSV file here
            </p>
            <p className="text-gray-400 text-xs">or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}
