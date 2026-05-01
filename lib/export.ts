import { stringifyCsv, type CsvRow } from "@/lib/csv";
import { clientProfileToBrandConfig, defaultClientProfile } from "@/lib/client-config";
import { renderBrandedEmailHtml } from "@/lib/email-template";
import type { NormalizedCustomer } from "@/lib/normalize";

export function buildCleanedCustomerRows(customers: NormalizedCustomer[]): CsvRow[] {
  return customers.map((customer) => ({
    firstName: customer.firstName,
    lastName: customer.lastName ?? "",
    email: customer.email,
    prospectDate: customer.prospectDate ?? "",
    soldDate: customer.soldDate ?? "",
    year: customer.year?.toString() ?? "",
    make: customer.make ?? "",
    model: customer.model ?? "",
    bodyType: customer.bodyType ?? "",
    mileage: customer.mileage?.toString() ?? "",
    leaseEndDate: customer.leaseEndDate ?? "",
    lastServiceDate: customer.lastServiceDate ?? "",
    tradeValue: customer.tradeValue?.toString() ?? "",
    emailType: customer.emailType,
    matchedOfferModel: customer.matchedOffer?.model ?? "",
    matchedOfferBodyType: customer.matchedOffer?.bodyType ?? "",
    matchedOfferType: customer.matchedOffer?.offerType ?? "",
    matchedOfferHeadline: customer.matchedOffer?.headline ?? "",
    matchedOfferDetails: customer.matchedOffer?.details ?? "",
    matchReason: customer.matchReason ?? "",
    disclaimer: customer.offerDisclaimer ?? "",
    subject: customer.subject ?? "",
    headline: customer.headline ?? "",
    emailBody: customer.emailBody ?? "",
    ctaLine: customer.ctaLine ?? "",
    heroImageUrl: customer.heroImageUrl ?? "",
    brandedEmailHtml:
      customer.subject && customer.emailBody
        ? renderBrandedEmailHtml(customer, clientProfileToBrandConfig(defaultClientProfile, customer.emailType))
        : ""
  }));
}

export function exportCleanedCustomersCsv(customers: NormalizedCustomer[]) {
  const headers = [
    "firstName",
    "lastName",
    "email",
    "prospectDate",
    "soldDate",
    "year",
    "make",
    "model",
    "bodyType",
    "mileage",
    "leaseEndDate",
    "lastServiceDate",
    "tradeValue",
    "emailType",
    "matchedOfferModel",
    "matchedOfferBodyType",
    "matchedOfferType",
    "matchedOfferHeadline",
    "matchedOfferDetails",
    "matchReason",
    "disclaimer",
    "subject",
    "headline",
    "emailBody",
    "ctaLine",
    "heroImageUrl",
    "brandedEmailHtml"
  ];

  return stringifyCsv(headers, buildCleanedCustomerRows(customers));
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
