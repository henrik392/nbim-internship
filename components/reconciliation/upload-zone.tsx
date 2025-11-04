"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

type UploadZoneProps = {
  onFilesSelected: (nbimFile: File | null, custodyFile: File | null) => void;
  disabled?: boolean;
};

export function UploadZone({ onFilesSelected, disabled }: UploadZoneProps) {
  const [nbimFile, setNbimFile] = useState<File | null>(null);
  const [custodyFile, setCustodyFile] = useState<File | null>(null);
  const [nbimDragActive, setNbimDragActive] = useState(false);
  const [custodyDragActive, setCustodyDragActive] = useState(false);

  const handleDrag = useCallback(
    (e: React.DragEvent, type: "nbim" | "custody") => {
      e.preventDefault();
      e.stopPropagation();

      if (e.type === "dragenter" || e.type === "dragover") {
        if (type === "nbim") {
          setNbimDragActive(true);
        } else {
          setCustodyDragActive(true);
        }
      } else if (e.type === "dragleave") {
        if (type === "nbim") {
          setNbimDragActive(false);
        } else {
          setCustodyDragActive(false);
        }
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "nbim" | "custody") => {
      e.preventDefault();
      e.stopPropagation();
      setNbimDragActive(false);
      setCustodyDragActive(false);

      const files = e.dataTransfer.files;
      if (files?.[0] && files[0].type === "text/csv") {
        if (type === "nbim") {
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
    (e: React.ChangeEvent<HTMLInputElement>, type: "nbim" | "custody") => {
      const files = e.target.files;
      if (files?.[0]) {
        if (type === "nbim") {
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
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          nbimDragActive && "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:border-gray-400"
        )}
        onClick={() =>
          !disabled && document.getElementById("nbim-upload")?.click()
        }
        onDragEnter={(e) => handleDrag(e, "nbim")}
        onDragLeave={(e) => handleDrag(e, "nbim")}
        onDragOver={(e) => handleDrag(e, "nbim")}
        onDrop={(e) => handleDrop(e, "nbim")}
      >
        <input
          accept=".csv"
          className="hidden"
          disabled={disabled}
          id="nbim-upload"
          onChange={(e) => handleFileInput(e, "nbim")}
          type="file"
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
          "relative rounded-lg border-2 border-dashed p-8 text-center transition-colors",
          custodyDragActive && "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
          disabled && "cursor-not-allowed opacity-50",
          !disabled && "cursor-pointer hover:border-gray-400"
        )}
        onClick={() =>
          !disabled && document.getElementById("custody-upload")?.click()
        }
        onDragEnter={(e) => handleDrag(e, "custody")}
        onDragLeave={(e) => handleDrag(e, "custody")}
        onDragOver={(e) => handleDrag(e, "custody")}
        onDrop={(e) => handleDrop(e, "custody")}
      >
        <input
          accept=".csv"
          className="hidden"
          disabled={disabled}
          id="custody-upload"
          onChange={(e) => handleFileInput(e, "custody")}
          type="file"
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
