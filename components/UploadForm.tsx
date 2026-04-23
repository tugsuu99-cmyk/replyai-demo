"use client";

import type { ParsedCsv } from "@/lib/csv";
import { parseCsv } from "@/lib/csv";

type UploadFormProps = {
  onParsed: (parsed: ParsedCsv, fileName: string) => void;
};

export function UploadForm({ onParsed }: UploadFormProps) {
  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    onParsed(parseCsv(text), file.name);
  }

  return (
    <section className="border border-slate-800 bg-slate-950 p-6 shadow-sm shadow-black/20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-ink">BDC Email MVP</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Upload a CSV, review detected columns, map the fields that matter, then preview a clean
            normalized customer dataset.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-800">
          Upload CSV
          <input className="sr-only" type="file" accept=".csv,text/csv" onChange={handleFileChange} />
        </label>
      </div>
    </section>
  );
}
