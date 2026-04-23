import { type ClientCtaUrls, type ClientProfile } from "@/lib/client-config";
import type { NormalizedCustomer } from "@/lib/normalize";
import { EMAIL_TYPES, type EmailType } from "@/lib/rules";

export type CampaignAudienceType = "standard" | "prospect" | "soldList" | "maintenance";

export type CampaignBreakdown = Record<EmailType, number>;

export type CampaignReport = {
  campaignId: string;
  clientId: string;
  clientName: string;
  campaignName: string;
  audienceType: CampaignAudienceType;
  audienceStartDate?: string;
  audienceEndDate?: string;
  date: string;
  totalEmails: number;
  breakdown: CampaignBreakdown;
  brandSnapshot?: CampaignBrandSnapshot;
  emails: CampaignEmailSnapshot[];
};

export type CampaignBrandSnapshot = {
  storeName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  ctaUrls: ClientCtaUrls;
  phone: string;
  address: string;
  website: string;
  senderName: string;
  senderTitle: string;
  footerText: string;
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
};

export const CAMPAIGN_REPORTS_STORAGE_KEY = "bdc-email-campaign-reports";

export const CAMPAIGN_AUDIENCE_LABELS: Record<CampaignAudienceType, string> = {
  standard: "Standard",
  prospect: "Prospect",
  soldList: "Sold List",
  maintenance: "Maintenance"
};

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
  options?: {
    campaignName?: string;
    audienceType?: CampaignAudienceType;
    audienceStartDate?: string;
    audienceEndDate?: string;
  }
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
    ctaLine: customer.ctaLine ?? ""
  }));

  return {
    campaignId: createCampaignId(),
    clientId: client.clientId,
    clientName: client.clientName,
    campaignName: options?.campaignName?.trim() || formatCampaignName(client.clientName, date),
    audienceType: options?.audienceType ?? "standard",
    audienceStartDate: options?.audienceStartDate,
    audienceEndDate: options?.audienceEndDate,
    date,
    totalEmails: generatedCustomers.length,
    breakdown,
    brandSnapshot: {
      storeName: client.storeName,
      logoUrl: client.logoUrl,
      primaryColor: client.primaryColor,
      secondaryColor: client.secondaryColor,
      accentColor: client.accentColor,
      ctaUrls: client.ctaUrls,
      phone: client.phone,
      address: client.address,
      website: client.website,
      senderName: client.senderName,
      senderTitle: client.senderTitle,
      footerText: client.footerText
    },
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
      audienceType: report.audienceType ?? "standard",
      audienceStartDate: report.audienceStartDate,
      audienceEndDate: report.audienceEndDate,
      brandSnapshot: report.brandSnapshot,
      emails: report.emails ?? []
    }));
  } catch {
    return [];
  }
}

export function saveCampaignReports(reports: CampaignReport[]) {
  const trimmedReports = [...reports];

  while (trimmedReports.length > 0) {
    try {
      window.localStorage.setItem(CAMPAIGN_REPORTS_STORAGE_KEY, JSON.stringify(trimmedReports));
      return;
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "QuotaExceededError") {
        throw error;
      }

      trimmedReports.pop();
    }
  }

  throw new Error("Unable to save campaign history because browser storage is full.");
}

export function addCampaignReport(report: CampaignReport) {
  saveCampaignReports([report, ...loadCampaignReports()].slice(0, 20));
}

export function deleteCampaignReport(campaignId: string) {
  saveCampaignReports(loadCampaignReports().filter((report) => report.campaignId !== campaignId));
}
