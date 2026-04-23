"use client";

import { Fragment, useState } from "react";
import { EmailPreview } from "@/components/EmailPreview";
import type { BrandConfig } from "@/lib/brand-config";
import type { NormalizedCustomer } from "@/lib/normalize";
import { emailTypeLabel, type EmailType } from "@/lib/rules";

type LeadsTableProps = {
  customers: NormalizedCustomer[];
  brandConfig?: BrandConfig;
  getBrandConfig?: (customer: NormalizedCustomer) => BrandConfig;
  selectedCustomerId?: string;
  onSelectCustomer?: (customer: NormalizedCustomer) => void;
};

function formatNumber(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function formatCurrency(value?: number) {
  return typeof value === "number"
    ? value.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "-";
}

function emailTypeClasses(type: EmailType) {
  const classes: Record<EmailType, string> = {
    trade: "border-green-500/30 bg-green-950/40 text-green-300",
    service: "border-orange-500/30 bg-orange-950/40 text-orange-300",
    lease: "border-blue-500/30 bg-blue-950/40 text-blue-300",
    general: "border-slate-600 bg-slate-800 text-slate-300"
  };

  return classes[type];
}

function generationStatusClasses(status?: NormalizedCustomer["generationStatus"]) {
  if (status === "loading") {
    return "border-sky-500/30 bg-sky-950/40 text-sky-200";
  }

  if (status === "success") {
    return "border-green-500/30 bg-green-950/40 text-green-300";
  }

  if (status === "error") {
    return "border-red-500/30 bg-red-950/40 text-red-300";
  }

  return "border-slate-700 bg-slate-900 text-slate-400";
}

export function LeadsTable({
  customers,
  brandConfig,
  getBrandConfig,
  selectedCustomerId,
  onSelectCustomer
}: LeadsTableProps) {
  const [expandedCustomerId, setExpandedCustomerId] = useState<string>();

  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-950 shadow-sm shadow-black/20">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">Step 3: Cleaned data preview</h2>
          <p className="text-sm text-slate-400">
            Only mapped, normalized fields are shown here. Unmapped CSV columns are dropped.
          </p>
        </div>
        <span className="text-sm font-medium text-slate-400">{customers.length} customers</span>
      </div>

      <div className="max-h-[560px] overflow-auto">
        {customers.length === 0 ? (
          <div className="border-t border-slate-800 px-5 py-10 text-center">
            <p className="text-sm font-medium text-slate-200">No customers matched the current filters.</p>
            <p className="mt-2 text-sm text-slate-400">
              Try widening the prospect, sold, or last service filters in Mapping, then build the cleaned preview again.
            </p>
          </div>
        ) : (
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900 text-xs uppercase tracking-normal text-slate-400">
              <tr>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Email type</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Status</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">First name</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Last name</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Email</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Year</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Make</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Model</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Mileage</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Lease end</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Last service</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Trade value</th>
                <th className="whitespace-nowrap border-b border-slate-800 px-4 py-3">Email preview</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => {
              const isExpanded = expandedCustomerId === customer.id;
              const hasGeneratedEmail = Boolean(customer.subject && customer.headline && customer.emailBody);

              return (
                <Fragment key={customer.id}>
                  <tr
                    className={`cursor-pointer border-b border-slate-800 text-slate-300 transition hover:bg-slate-900 ${
                      selectedCustomerId === customer.id ? "bg-slate-900 ring-1 ring-inset ring-teal-500/40" : "bg-slate-950"
                    }`}
                    onClick={() => onSelectCustomer?.(customer)}
                  >
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex min-w-20 items-center justify-center border px-2 py-1 text-xs font-semibold ${emailTypeClasses(
                          customer.emailType
                        )}`}
                      >
                        {emailTypeLabel(customer.emailType)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span
                        className={`inline-flex min-w-20 items-center justify-center rounded-full border px-2 py-1 text-xs font-semibold capitalize ${generationStatusClasses(
                          customer.generationStatus
                        )}`}
                      >
                        {customer.generationStatus ?? "idle"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.firstName || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.lastName || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.email || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.year ?? "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.make || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.model || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatNumber(customer.mileage)}</td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.leaseEndDate || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{customer.lastServiceDate || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{formatCurrency(customer.tradeValue)}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button
                        type="button"
                        className="rounded-xl border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:border-slate-800 disabled:text-slate-600"
                        disabled={!hasGeneratedEmail}
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedCustomerId(isExpanded ? undefined : customer.id);
                        }}
                      >
                        {isExpanded ? "Hide" : "Preview"}
                      </button>
                    </td>
                  </tr>
                  {isExpanded ? (
                    <tr className="border-b border-slate-800 bg-slate-900">
                      <td colSpan={13} className="px-4 py-4">
                        <EmailPreview customer={customer} brandConfig={getBrandConfig?.(customer) ?? brandConfig} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
