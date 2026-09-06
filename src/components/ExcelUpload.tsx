"use client";

import { useRef, useState } from "react";
import { parseFleetWorkbook } from "@/lib/excelImport";
import { useFleet } from "@/lib/fleetStore";

export default function ExcelUpload() {
  const { appendTrucks } = useFleet();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const trucks = await parseFleetWorkbook(file);
      if (trucks.length === 0) {
        setError("No rows found — check the sheet has a header row with driver/source/destination columns.");
        return;
      }
      appendTrucks(trucks);
    } catch {
      setError("Couldn't read that file — is it a valid .xlsx/.csv?");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="font-display text-xs font-medium uppercase tracking-wide px-3 py-1.5 rounded border border-hairline text-ink-muted hover:text-ink hover:border-brand-gold/50 transition-colors"
      >
        Upload Excel
      </button>
      {error && <span className="text-xs text-brand-red">{error}</span>}
    </div>
  );
}
