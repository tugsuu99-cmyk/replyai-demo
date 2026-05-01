"use client";

import { useState } from "react";
import { defaultBrandConfig, type BrandConfig } from "@/lib/brand-config";
import { renderBrandedEmailHtml } from "@/lib/email-template";
import { normalizeModelKey } from "@/lib/offer-matching";
import type { NormalizedCustomer } from "@/lib/normalize";

type EmailPreviewProps = {
  customer: NormalizedCustomer;
  brandConfig?: BrandConfig;
  campaignType?: string;
  offerStrategy?: string;
};

export function EmailPreview({
  customer,
  brandConfig = defaultBrandConfig,
  campaignType,
  offerStrategy
}: EmailPreviewProps) {
  const [isFullPreviewOpen, setIsFullPreviewOpen] = useState(false);
  const html = renderBrandedEmailHtml(customer, brandConfig);
  const matchedOffer = customer.matchedOffer;
  const customerBodyType = customer.bodyType || "Unknown";
  const offerBodyType = matchedOffer?.bodyType || "-";
  const rawPurchaseType = customer.rawIntentValue || customer.purchaseType || "-";
  const customerIntent = customer.customerIntent || "unknown";
  const primaryEmailType = customer.primaryEmailType || customer.emailType;
  const addOnBlocks = customer.addOnBlocks?.join(", ") || "none";
  const allowedOfferTypes =
    customer.allowedOfferTypes && customer.allowedOfferTypes.length > 0
      ? customer.allowedOfferTypes.join(", ")
      : "-";
  const matchedOfferType = matchedOffer?.offerType || "-";
  const normalizedCustomerModel = normalizeModelKey(customer.model, customer.make) || "-";
  const normalizedOfferModel = matchedOffer
    ? normalizeModelKey(matchedOffer.model, matchedOffer.make || matchedOffer.brand)
    : "-";
  const offersAfterIntentFilterCount = customer.offersAfterIntentFilterCount ?? 0;
  const modelMatchFound = customer.modelMatchFound ? "true" : "false";
  const bodyTypeMatchFound = customer.bodyTypeMatchFound ? "true" : "false";
  const tradeBlock = customer.tradeBlock ? "yes" : "no";
  const serviceBlock = customer.serviceBlock ? "yes" : "no";
  const matchResult = matchedOffer ? "matched" : "blocked";
  const matchReason =
    customer.matchReason === "model"
      ? "Exact model match"
      : customer.matchReason === "bodyType"
        ? "Body type fallback"
        : customer.matchReason === "offerStrategy"
          ? "Offer strategy fallback"
          : customer.matchReason === "noOffersAvailable"
            ? "No approved offers loaded"
          : "No offer match";

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
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Campaign</span>
              <div className="mt-2 grid gap-1 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Type:</span> {campaignType || "-"}
                </p>
                <p>
                  <span className="text-slate-500">Offer strategy:</span> {offerStrategy || "-"}
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3">
              <span className="text-xs font-semibold uppercase tracking-normal text-slate-500">Offer match</span>
              <p className="mt-1 font-medium text-ink">{matchReason}</p>
              <div className="mt-2 grid gap-1 text-sm text-slate-300">
                <p>
                  <span className="text-slate-500">Customer body type:</span> {customerBodyType}
                </p>
                <p>
                  <span className="text-slate-500">Raw purchase type:</span> {rawPurchaseType}
                </p>
                <p>
                  <span className="text-slate-500">Primary email type:</span> {primaryEmailType}
                </p>
                <p>
                  <span className="text-slate-500">Add-on blocks:</span> {addOnBlocks}
                </p>
                <p>
                  <span className="text-slate-500">Customer intent:</span> {customerIntent}
                </p>
                <p>
                  <span className="text-slate-500">Allowed offer types:</span> {allowedOfferTypes}
                </p>
                <p>
                  <span className="text-slate-500">Offers after intent filter:</span> {offersAfterIntentFilterCount}
                </p>
                <p>
                  <span className="text-slate-500">Model match found:</span> {modelMatchFound}
                </p>
                <p>
                  <span className="text-slate-500">Body type match found:</span> {bodyTypeMatchFound}
                </p>
                <p>
                  <span className="text-slate-500">Offer body type:</span> {offerBodyType}
                </p>
                <p>
                  <span className="text-slate-500">Matched offer type:</span> {matchedOfferType}
                </p>
                <p>
                  <span className="text-slate-500">Trade block:</span> {tradeBlock}
                </p>
                <p>
                  <span className="text-slate-500">Service block:</span> {serviceBlock}
                </p>
                <p>
                  <span className="text-slate-500">Customer model key:</span> {normalizedCustomerModel}
                </p>
                <p>
                  <span className="text-slate-500">Offer model key:</span> {normalizedOfferModel}
                </p>
                <p>
                  <span className="text-slate-500">Match result:</span> {matchResult}
                </p>
              </div>
              {matchedOffer ? (
                <div className="mt-2 grid gap-1 text-sm text-slate-300">
                  <p>
                    <span className="text-slate-500">Headline:</span> {matchedOffer.headline || "-"}
                  </p>
                  <p>
                    <span className="text-slate-500">Model:</span> {matchedOffer.model || "-"}
                  </p>
                  <p>
                    <span className="text-slate-500">Body type:</span> {matchedOffer.bodyType}
                  </p>
                  <p>
                    <span className="text-slate-500">Offer type:</span> {matchedOffer.offerType}
                  </p>
                  {matchedOffer.details ? (
                    <p className="leading-6">
                      <span className="text-slate-500">Details:</span> {matchedOffer.details}
                    </p>
                  ) : null}
                  {customer.offerDisclaimer ? (
                    <p className="leading-6">
                      <span className="text-slate-500">Disclaimer:</span> {customer.offerDisclaimer}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="mt-1 text-sm text-slate-400">No offer will be mentioned for this customer.</p>
              )}
            </div>
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
