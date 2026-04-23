import { stringifyCsv, type CsvRow } from "@/lib/csv";
import { clientProfileToBrandConfig, type ClientProfile } from "@/lib/client-config";
import { renderBrandedEmailHtml } from "@/lib/email-template";
import type { NormalizedCustomer } from "@/lib/normalize";

export const SENDPULSE_EXPORT_HEADERS = [
  "email",
  "firstName",
  "subject",
  "emailBody",
  "ctaLine",
  "htmlEmail",
  "emailType",
  "clientId"
];

export function buildSendPulseRows(customers: NormalizedCustomer[], client: ClientProfile): CsvRow[] {
  return customers.map((customer) => {
    const customerWithClient = { ...customer, clientId: client.clientId };
    const brandConfig = clientProfileToBrandConfig(client, customer.emailType);

    return {
      email: customer.email,
      firstName: customer.firstName,
      subject: customer.subject ?? "",
      emailBody: customer.emailBody ?? "",
      ctaLine: customer.ctaLine ?? "",
      htmlEmail:
        customer.subject && customer.emailBody
          ? renderBrandedEmailHtml(customerWithClient, brandConfig)
          : "",
      emailType: customer.emailType,
      clientId: client.clientId
    };
  });
}

export function exportSendPulseCsv(customers: NormalizedCustomer[], client: ClientProfile) {
  return stringifyCsv(SENDPULSE_EXPORT_HEADERS, buildSendPulseRows(customers, client));
}

// Placeholder for a later SendPulse API adapter. Keeping this file local-only
// lets the CSV export shape stabilize without connecting to any outside system.
export async function sendToSendPulsePlaceholder() {
  throw new Error("SendPulse API integration is intentionally not connected yet.");
}
