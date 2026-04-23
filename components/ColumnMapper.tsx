"use client";

import { useState } from "react";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  REQUIRED_FIELDS,
  getIgnoredHeaders,
  type ColumnMapping,
  type FieldKey
} from "@/lib/normalize";

type ColumnMapperProps = {
  headers: string[];
  mapping: ColumnMapping;
  includedHeaders: string[];
  onMappingChange: (mapping: ColumnMapping) => void;
  onIncludedHeadersChange: (headers: string[]) => void;
  onConfirm: () => void;
};

export function ColumnMapper({
  headers,
  mapping,
  includedHeaders,
  onMappingChange,
  onIncludedHeadersChange,
  onConfirm
}: ColumnMapperProps) {
  const [selectedIgnoredHeader, setSelectedIgnoredHeader] = useState("");
  const ignoredHeaders = getIgnoredHeaders(headers, mapping, includedHeaders);
  const canContinue = Boolean(mapping.firstName && mapping.email);

  function updateMapping(field: FieldKey, header: string) {
    // Empty string means "ignore this normalized field." The original CSV
    // column remains visible in this step but will not be passed forward.
    onMappingChange({
      ...mapping,
      [field]: header || undefined
    });
  }

  function mapIgnoredHeader(field: FieldKey | "__include__" | "") {
    if (!selectedIgnoredHeader || !field) {
      return;
    }

    if (field === "__include__") {
      onIncludedHeadersChange([...includedHeaders, selectedIgnoredHeader]);
      setSelectedIgnoredHeader("");
      return;
    }

    // Clicking an ignored header is a shortcut back into the main mapping
    // table. The chosen field now owns that CSV column and it drops out of the
    // ignored list automatically.
    onMappingChange({
      ...mapping,
      [field]: selectedIgnoredHeader
    });
    setSelectedIgnoredHeader("");
  }

  function removeIncludedHeader(header: string) {
    onIncludedHeadersChange(includedHeaders.filter((includedHeader) => includedHeader !== header));
  }

  return (
    <section className="border border-slate-800 bg-slate-950 p-5 shadow-sm shadow-black/20">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-ink">Step 2: Confirm column mapping</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            The app guessed common customer fields from your CSV headers. Confirm each dropdown before
            building the clean dataset.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-400">{headers.length} columns found</span>
      </div>

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-slate-200">Uploaded CSV columns</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {headers.map((header) => (
            <span key={header} className="border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
              {header}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {FIELD_KEYS.map((field) => (
          <label key={field} className="grid gap-1 text-sm">
            <span className="font-medium text-slate-200">
              {FIELD_LABELS[field]}
              {REQUIRED_FIELDS.has(field) ? <span className="text-red-600"> *</span> : null}
            </span>
            <select
              className="border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
              value={mapping[field] ?? ""}
              onChange={(event) => updateMapping(field, event.target.value)}
            >
              <option value="">Ignore / unavailable</option>
              {headers.map((header) => (
                <option key={header} value={header}>
                  {header}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <span className="font-semibold text-slate-100">Ignored columns</span>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Click one to either map it to a normalized field or include it in the AI email context.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {ignoredHeaders.length > 0 ? (
                ignoredHeaders.map((header) => (
                  <button
                    key={header}
                    type="button"
                    className={`rounded-md border px-2.5 py-1 text-xs transition ${
                      selectedIgnoredHeader === header
                        ? "border-teal-400 bg-teal-400/10 text-teal-200"
                        : "border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500"
                    }`}
                    onClick={() => setSelectedIgnoredHeader(header)}
                  >
                    {header}
                  </button>
                ))
              ) : (
                <span className="text-xs text-slate-500">No ignored columns right now.</span>
              )}
            </div>
          </div>

          {selectedIgnoredHeader ? (
            <label className="grid min-w-60 gap-1 text-xs text-slate-300">
              Map <span className="font-semibold text-slate-100">{selectedIgnoredHeader}</span> to
              <select
                className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
                value=""
                onChange={(event) => mapIgnoredHeader(event.target.value as FieldKey | "__include__" | "")}
              >
                <option value="">Choose a field</option>
                <option value="__include__">Include in email context</option>
                {FIELD_KEYS.map((field) => (
                  <option key={field} value={field}>
                    {FIELD_LABELS[field]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        {includedHeaders.length > 0 ? (
          <div className="mt-4 border-t border-slate-800 pt-4">
            <span className="font-semibold text-slate-100">Included in email context</span>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              These extra columns are passed to AI and can be used when relevant.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {includedHeaders.map((header) => (
                <button
                  key={header}
                  type="button"
                  className="rounded-md border border-teal-800 bg-teal-400/10 px-2.5 py-1 text-xs text-teal-200 transition hover:border-teal-500"
                  onClick={() => removeIncludedHeader(header)}
                >
                  {header} ×
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">First name and email are required before previewing clean data.</p>
        <button
          type="button"
          className="bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canContinue}
          onClick={onConfirm}
        >
          Build cleaned preview
        </button>
      </div>
    </section>
  );
}
