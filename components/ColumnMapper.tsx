"use client";

import { useMemo, useState } from "react";
import {
  FIELD_LABELS,
  LAST_SERVICE_DAY_OPTIONS,
  REQUIRED_FIELDS,
  getIgnoredHeaders,
  type ColumnMapping,
  type FieldKey
} from "@/lib/normalize";

type ColumnMapperProps = {
  headers: string[];
  mapping: ColumnMapping;
  includedHeaders: string[];
  prospectYearOptions: string[];
  soldYearOptions: string[];
  prospectDateStart: string;
  prospectDateEnd: string;
  soldDateStart: string;
  soldDateEnd: string;
  lastServiceDays: number | "";
  applyProspectDateFilter: boolean;
  applySoldDateFilter: boolean;
  applyLastServiceFilter: boolean;
  onProspectDateStartChange: (value: string) => void;
  onProspectDateEndChange: (value: string) => void;
  onSoldDateStartChange: (value: string) => void;
  onSoldDateEndChange: (value: string) => void;
  onLastServiceDaysChange: (value: number | "") => void;
  onApplyProspectDateFilterChange: (value: boolean) => void;
  onApplySoldDateFilterChange: (value: boolean) => void;
  onApplyLastServiceFilterChange: (value: boolean) => void;
  onMappingChange: (mapping: ColumnMapping) => void;
  onIncludedHeadersChange: (headers: string[]) => void;
  requiresCampaignName?: boolean;
  onConfirm: () => void;
};

const primaryFields: FieldKey[] = ["firstName", "lastName", "email"];
const optionalFields: FieldKey[] = [
  "prospectDate",
  "soldDate",
  "year",
  "make",
  "model",
  "mileage",
  "leaseEndDate",
  "lastServiceDate",
  "tradeValue"
];

function FieldSelect({
  headers,
  value,
  onChange
}: {
  headers: string[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <select
      className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
      value={value ?? ""}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Ignore / unavailable</option>
      {headers.map((header) => (
        <option key={header} value={header}>
          {header}
        </option>
      ))}
    </select>
  );
}

export function ColumnMapper({
  headers,
  mapping,
  includedHeaders,
  prospectYearOptions,
  soldYearOptions,
  prospectDateStart,
  prospectDateEnd,
  soldDateStart,
  soldDateEnd,
  lastServiceDays,
  applyProspectDateFilter,
  applySoldDateFilter,
  applyLastServiceFilter,
  onProspectDateStartChange,
  onProspectDateEndChange,
  onSoldDateStartChange,
  onSoldDateEndChange,
  onLastServiceDaysChange,
  onApplyProspectDateFilterChange,
  onApplySoldDateFilterChange,
  onApplyLastServiceFilterChange,
  onMappingChange,
  onIncludedHeadersChange,
  requiresCampaignName,
  onConfirm
}: ColumnMapperProps) {
  const [editingField, setEditingField] = useState<FieldKey | null>(null);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [selectedIgnoredHeader, setSelectedIgnoredHeader] = useState("");

  const ignoredHeaders = getIgnoredHeaders(headers, mapping, includedHeaders);
  const canContinue = Boolean(mapping.firstName && mapping.email) && !requiresCampaignName;
  const hasLastServiceDate = Boolean(mapping.lastServiceDate);
  const hasProspectDate = Boolean(mapping.prospectDate);
  const hasSoldDate = Boolean(mapping.soldDate);

  const mappedOptionalCount = useMemo(
    () => optionalFields.filter((field) => Boolean(mapping[field])).length,
    [mapping]
  );

  function normalizeYearInput(value: string) {
    return value.replace(/\D/g, "").slice(0, 4);
  }

  function updateMapping(field: FieldKey, header: string) {
    onMappingChange({
      ...mapping,
      [field]: header || undefined
    });
    setEditingField(null);
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

    onMappingChange({
      ...mapping,
      [field]: selectedIgnoredHeader
    });
    setSelectedIgnoredHeader("");
  }

  function removeIncludedHeader(header: string) {
    onIncludedHeadersChange(includedHeaders.filter((includedHeader) => includedHeader !== header));
  }

  function renderFieldRow(field: FieldKey) {
    const assignedHeader = mapping[field];
    const isRequired = REQUIRED_FIELDS.has(field);
    const isEditing = editingField === field || (!assignedHeader && isRequired);

    return (
      <div
        key={field}
        className="grid gap-3 border-t border-slate-800 px-4 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto] sm:items-center"
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-100">
            {FIELD_LABELS[field]}
            {isRequired ? <span className="text-red-600"> *</span> : null}
          </p>
        </div>

        <div className="min-w-0">
          {isEditing ? (
            <FieldSelect headers={headers} value={assignedHeader} onChange={(value) => updateMapping(field, value)} />
          ) : assignedHeader ? (
            <div className="inline-flex items-center rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-sm text-slate-200">
              {assignedHeader}
            </div>
          ) : (
            <span className="text-sm text-slate-500">Ignored</span>
          )}
        </div>

        <div className="flex justify-start sm:justify-end">
          {isEditing ? (
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium text-slate-400 transition hover:text-slate-100"
              onClick={() => setEditingField(null)}
            >
              Done
            </button>
          ) : (
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-semibold text-accent transition hover:text-slate-100"
              onClick={() => setEditingField(field)}
            >
              Change
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-950 shadow-sm shadow-black/20">
      <div className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-100">Step 2: Confirm column mapping</h2>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-400">
            Keep the fields you need, ignore the rest, and build the cleaned preview.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-400">{headers.length} columns found</span>
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <p className="text-sm font-medium text-slate-100">Uploaded CSV columns</p>
        <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-auto">
          {headers.map((header) => (
            <span key={header} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
              {header}
            </span>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="mb-2">
          <h3 className="text-sm font-semibold text-slate-100">Required customer fields</h3>
          <p className="mt-1 text-xs text-slate-400">These are the core fields we use to build the cleaned dataset.</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
          {primaryFields.map(renderFieldRow)}
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">More fields</h3>
            <p className="mt-1 text-xs text-slate-400">
              Optional vehicle and date fields. Only open this when you need to adjust more mappings.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-accent hover:text-accent"
            onClick={() => setShowOptionalFields((current) => !current)}
          >
            {showOptionalFields ? "Hide fields" : `Show fields (${mappedOptionalCount}/${optionalFields.length})`}
          </button>
        </div>

        {showOptionalFields ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
            {optionalFields.map(renderFieldRow)}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {optionalFields
              .filter((field) => mapping[field])
              .map((field) => (
                <button
                  key={field}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs text-slate-200 transition hover:border-accent"
                  onClick={() => {
                    setShowOptionalFields(true);
                    setEditingField(field);
                  }}
                >
                  <span className="text-slate-400">{FIELD_LABELS[field]}</span>
                  <span>{mapping[field]}</span>
                </button>
              ))}
            {mappedOptionalCount === 0 ? <span className="text-xs text-slate-500">No optional fields mapped yet.</span> : null}
          </div>
        )}
      </div>

      <div className="border-t border-slate-800 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-100">Ignored columns</h3>
            <p className="mt-1 text-xs text-slate-400">
              Bring back a dropped column only when you want to map it or feed it to AI.
            </p>
          </div>
        </div>

        <div className="mt-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
          <div className="flex flex-wrap gap-2">
            {ignoredHeaders.length > 0 ? (
              ignoredHeaders.map((header) => (
                <button
                  key={header}
                  type="button"
                  className={`rounded-md border px-2.5 py-1 text-xs transition ${
                    selectedIgnoredHeader === header
                      ? "border-accent bg-accent/10 text-accent"
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

          {selectedIgnoredHeader ? (
            <label className="mt-3 grid max-w-sm gap-1 text-xs text-slate-300">
              Map <span className="font-semibold text-slate-100">{selectedIgnoredHeader}</span> to
              <select
                className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
                value=""
                onChange={(event) => mapIgnoredHeader(event.target.value as FieldKey | "__include__" | "")}
              >
                <option value="">Choose a field</option>
                <option value="__include__">Include in email context</option>
                {optionalFields.concat(primaryFields).map((field) => (
                  <option key={field} value={field}>
                    {FIELD_LABELS[field]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {includedHeaders.length > 0 ? (
            <div className="mt-4 border-t border-slate-800 pt-3">
              <p className="text-xs font-semibold text-slate-100">Included in email context</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {includedHeaders.map((header) => (
                  <button
                    key={header}
                    type="button"
                    className="rounded-md border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 transition hover:border-accent hover:text-accent"
                    onClick={() => removeIncludedHeader(header)}
                  >
                    {header} ×
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        {includedHeaders.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {includedHeaders.map((header) => (
              <span key={header} className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                {header}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {(hasLastServiceDate || hasProspectDate || hasSoldDate) ? (
        <div className="border-t border-slate-800 px-4 py-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-slate-100">Filters</h3>
            <p className="mt-1 text-xs text-slate-400">
              Narrow the master list before we build the cleaned preview.
            </p>
          </div>

          <div className="grid gap-3">
            {hasLastServiceDate ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px] lg:items-end">
                  <div>
                    <p className="text-sm font-medium text-slate-100">Last service date</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Include customers whose last service date is older than the selected number of days.
                    </p>
                    <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-accent focus:ring-accent"
                        checked={applyLastServiceFilter}
                        onChange={(event) => onApplyLastServiceFilterChange(event.target.checked)}
                      />
                      Apply this filter
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs text-slate-300">
                    Days since service
                    <select
                      className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
                      value={lastServiceDays}
                      disabled={!applyLastServiceFilter}
                      onChange={(event) => onLastServiceDaysChange(event.target.value ? Number(event.target.value) : "")}
                    >
                      <option value="">No service filter</option>
                      {LAST_SERVICE_DAY_OPTIONS.map((days) => (
                        <option key={days} value={days}>
                          {days} days
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
            ) : null}

            {hasProspectDate ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px] lg:items-end">
                  <div>
                    <p className="text-sm font-medium text-slate-100">Prospect date range</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Filter the master list by the mapped prospect date.
                    </p>
                    <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-accent focus:ring-accent"
                        checked={applyProspectDateFilter}
                        onChange={(event) => onApplyProspectDateFilterChange(event.target.checked)}
                      />
                      Apply this filter
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs text-slate-300">
                    From year
                    <input
                      className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="YYYY"
                      list="prospect-year-options"
                      value={prospectDateStart}
                      disabled={!applyProspectDateFilter}
                      onChange={(event) => onProspectDateStartChange(normalizeYearInput(event.target.value))}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-slate-300">
                    To year
                    <input
                      className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="YYYY"
                      list="prospect-year-options"
                      value={prospectDateEnd}
                      disabled={!applyProspectDateFilter}
                      onChange={(event) => onProspectDateEndChange(normalizeYearInput(event.target.value))}
                    />
                  </label>
                </div>
                {prospectYearOptions.length > 0 ? (
                  <datalist id="prospect-year-options">
                    {prospectYearOptions.map((year) => (
                      <option key={year} value={year} />
                    ))}
                  </datalist>
                ) : null}
              </div>
            ) : null}

            {hasSoldDate ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px_170px] lg:items-end">
                  <div>
                    <p className="text-sm font-medium text-slate-100">Sold date range</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Filter the master list by the mapped sold date.
                    </p>
                    <label className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-300">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-accent focus:ring-accent"
                        checked={applySoldDateFilter}
                        onChange={(event) => onApplySoldDateFilterChange(event.target.checked)}
                      />
                      Apply this filter
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs text-slate-300">
                    From year
                    <input
                      className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="YYYY"
                      list="sold-year-options"
                      value={soldDateStart}
                      disabled={!applySoldDateFilter}
                      onChange={(event) => onSoldDateStartChange(normalizeYearInput(event.target.value))}
                    />
                  </label>
                  <label className="grid gap-1 text-xs text-slate-300">
                    To year
                    <input
                      className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm text-slate-100 outline-none transition focus:border-accent focus:ring-2 focus:ring-teal-950"
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="YYYY"
                      list="sold-year-options"
                      value={soldDateEnd}
                      disabled={!applySoldDateFilter}
                      onChange={(event) => onSoldDateEndChange(normalizeYearInput(event.target.value))}
                    />
                  </label>
                </div>
                {soldYearOptions.length > 0 ? (
                  <datalist id="sold-year-options">
                    {soldYearOptions.map((year) => (
                      <option key={year} value={year} />
                    ))}
                  </datalist>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-slate-800 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">
          {requiresCampaignName
            ? "Add a campaign name before previewing clean data."
            : "First name and email are required before previewing clean data."}
        </p>
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-[#e3b400] disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canContinue}
          onClick={onConfirm}
        >
          Build cleaned preview
        </button>
      </div>
    </section>
  );
}
