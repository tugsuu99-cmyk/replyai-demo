"use client";

import { useState } from "react";
import { defaultBrandConfig, type BrandConfig } from "@/lib/brand-config";
import { renderBrandedEmailHtml } from "@/lib/email-template";
import type { NormalizedCustomer } from "@/lib/normalize";

type EmailPreviewProps = {
  customer: NormalizedCustomer;
  brandConfig?: BrandConfig;
};

export function EmailPreview({ customer, brandConfig = defaultBrandConfig }: EmailPreviewProps) {
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const html = renderBrandedEmailHtml(customer, brandConfig);

  return (
    <>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(360px,1fr)]">
        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-sm shadow-black/20">
          <h3 className="text-sm font-semibold text-ink">Plain text preview</h3>
          <div className="mt-3 grid gap-3 text-sm text-slate-300">
            <div>
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Subject</span>
              <p className="mt-1 font-semibold text-ink">{customer.subject}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Headline</span>
              <p className="mt-1 font-semibold text-ink">{customer.headline}</p>
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Email body</span>
              <p className="mt-1 whitespace-pre-wrap leading-6">{customer.emailBody}</p>
            </div>
            {customer.ctaLine ? (
              <div>
                <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">CTA line</span>
                <p className="mt-1 font-medium text-ink">{customer.ctaLine}</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-950 p-4 shadow-sm shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-sm font-semibold text-ink">Branded HTML preview</h3>
            <button
              type="button"
              className="rounded-xl border border-accent px-3 py-1.5 text-xs font-semibold text-accent transition hover:bg-teal-950"
              onClick={() => setIsFullPreviewOpen(true)}
            >
              Preview full email
            </button>
          </div>
          <iframe
            title={`Branded email preview for ${customer.firstName || customer.email}`}
            className="mt-3 h-[560px] w-full rounded-xl border border-slate-800 bg-white"
            srcDoc={html}
          />
        </section>
      </div>

      {isFullPreviewOpen ? (
        <div className="fixed inset-0 z-50 bg-slate-950/90 p-4 backdrop-blur-sm">
          <div className="mx-auto flex h-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-ink">Full email preview</h3>
                <p className="text-xs text-slate-400">{customer.subject}</p>
              </div>
              <button
                type="button"
                className="rounded-xl border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-accent hover:text-accent"
                onClick={() => setIsFullPreviewOpen(false)}
              >
                Close
              </button>
            </div>
            <iframe
              title={`Full branded email preview for ${customer.firstName || customer.email}`}
              className="min-h-0 flex-1 rounded-b-2xl bg-white"
              srcDoc={html}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
