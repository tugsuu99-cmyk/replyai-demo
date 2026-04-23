import { clientProfileToBrandConfig, type ClientProfile } from "@/lib/client-config";
import { renderBrandedEmailHtml } from "@/lib/email-template";
import type { NormalizedCustomer } from "@/lib/normalize";
import { EMAIL_TYPES, type EmailType } from "@/lib/rules";

export type CampaignBreakdown = Record<EmailType, number>;

export type CampaignReport = {
  campaignId: string;
  clientId: string;
  clientName: string;
  campaignName: string;
  date: string;
  totalEmails: number;
  breakdown: CampaignBreakdown;
  emails: CampaignEmailSnapshot[];
};

export type CampaignEmailSnapshot = {
  customerId: string;
  firstName: string;
  lastName?: string;
  emailType: EmailType;
  subject: string;
  headline: string;
  emailBody: string;
  ctaLine?: string;
  htmlEmail: string;
};

export const CAMPAIGN_REPORTS_STORAGE_KEY = "bdc-email-campaign-reports";

function emptyBreakdown(): CampaignBreakdown {
  return EMAIL_TYPES.reduce(
    (breakdown, emailType) => ({
      ...breakdown,
      [emailType]: 0
    }),
    {} as CampaignBreakdown
  );
}

function createCampaignId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `campaign-${Date.now()}`;
}

export function formatCampaignName(clientName: string, date: string) {
  const timestamp = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(date));

  return `${clientName} - ${timestamp}`;
}

export function buildCampaignReport(
  client: ClientProfile,
  customers: NormalizedCustomer[],
  campaignName?: string
): CampaignReport {
  const breakdown = emptyBreakdown();
  const generatedCustomers = customers.filter((customer) => customer.subject && customer.emailBody);
  const date = new Date().toISOString();

  for (const customer of generatedCustomers) {
    breakdown[customer.emailType] += 1;
  }

  const emails = generatedCustomers.map<CampaignEmailSnapshot>((customer) => ({
    customerId: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    emailType: customer.emailType,
    subject: customer.subject ?? "",
    headline: customer.headline ?? "",
    emailBody: customer.emailBody ?? "",
    ctaLine: customer.ctaLine ?? "",
    htmlEmail: renderBrandedEmailHtml(customer, clientProfileToBrandConfig(client, customer.emailType))
  }));

  return {
    campaignId: createCampaignId(),
    clientId: client.clientId,
    clientName: client.clientName,
    campaignName: campaignName?.trim() || formatCampaignName(client.clientName, date),
    date,
    totalEmails: generatedCustomers.length,
    breakdown,
    emails
  };
}

export function loadCampaignReports(): CampaignReport[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(CAMPAIGN_REPORTS_STORAGE_KEY);

  if (!storedValue) {
    return [];
  }

  try {
    return (JSON.parse(storedValue) as CampaignReport[]).map((report) => ({
      ...report,
      clientName: report.clientName ?? report.clientId,
      campaignName: report.campaignName ?? formatCampaignName(report.clientName ?? report.clientId, report.date),
      emails: report.emails ?? []
    }));
  } catch {
    return [];
  }
}

export function saveCampaignReports(reports: CampaignReport[]) {
  window.localStorage.setItem(CAMPAIGN_REPORTS_STORAGE_KEY, JSON.stringify(reports));
}

export function addCampaignReport(report: CampaignReport) {
  saveCampaignReports([report, ...loadCampaignReports()]);
}

export function deleteCampaignReport(campaignId: string) {
  saveCampaignReports(loadCampaignReports().filter((report) => report.campaignId !== campaignId));
}
