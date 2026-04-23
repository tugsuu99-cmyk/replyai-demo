import { defaultBrandConfig, type BrandConfig } from "@/lib/brand-config";
import type { EmailType } from "@/lib/rules";

export type ClientCtaUrls = Record<EmailType | "default", string>;

export type ClientProfile = {
  clientId: string;
  clientName: string;
  automakerBrand: string;
  storeName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  website: string;
  phone: string;
  address: string;
  senderName: string;
  senderTitle: string;
  footerText: string;
  ctaUrls: ClientCtaUrls;
};

export const CLIENT_PROFILES_STORAGE_KEY = "bdc-email-client-profiles";
export const SELECTED_CLIENT_STORAGE_KEY = "bdc-email-selected-client";

export const defaultClientProfile: ClientProfile = {
  clientId: "default-client",
  clientName: "Default dealership",
  automakerBrand: "",
  storeName: defaultBrandConfig.storeName,
  logoUrl: defaultBrandConfig.logoUrl,
  primaryColor: defaultBrandConfig.primaryColor,
  secondaryColor: defaultBrandConfig.secondaryColor,
  accentColor: defaultBrandConfig.accentColor,
  website: defaultBrandConfig.website,
  phone: defaultBrandConfig.phone,
  address: defaultBrandConfig.address,
  senderName: defaultBrandConfig.senderName,
  senderTitle: defaultBrandConfig.senderTitle,
  footerText: defaultBrandConfig.footerText,
  ctaUrls: {
    default: defaultBrandConfig.ctaUrl,
    trade: defaultBrandConfig.ctaUrl,
    service: defaultBrandConfig.ctaUrl,
    lease: defaultBrandConfig.ctaUrl,
    general: defaultBrandConfig.ctaUrl
  }
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}`;
}

export function createClientProfile(seed?: Partial<ClientProfile>): ClientProfile {
  return {
    ...defaultClientProfile,
    clientId: seed?.clientId ?? createId(),
    clientName: seed?.clientName ?? "New dealership",
    automakerBrand: seed?.automakerBrand ?? "",
    storeName: seed?.storeName ?? "New dealership",
    logoUrl: seed?.logoUrl ?? defaultClientProfile.logoUrl,
    primaryColor: seed?.primaryColor ?? defaultClientProfile.primaryColor,
    secondaryColor: seed?.secondaryColor ?? defaultClientProfile.secondaryColor,
    accentColor: seed?.accentColor ?? defaultClientProfile.accentColor,
    website: seed?.website ?? defaultClientProfile.website,
    phone: seed?.phone ?? defaultClientProfile.phone,
    address: seed?.address ?? defaultClientProfile.address,
    senderName: seed?.senderName ?? defaultClientProfile.senderName,
    senderTitle: seed?.senderTitle ?? defaultClientProfile.senderTitle,
    footerText: seed?.footerText ?? defaultClientProfile.footerText,
    ctaUrls: {
      ...defaultClientProfile.ctaUrls,
      ...seed?.ctaUrls
    }
  };
}

export function clientProfileToBrandConfig(client: ClientProfile, emailType?: EmailType): BrandConfig {
  const secondaryColor =
    client.automakerBrand.toLowerCase() === "nissan" && client.secondaryColor.toLowerCase() === "#111827"
      ? "#000000"
      : client.secondaryColor;

  return {
    storeName: client.storeName,
    logoUrl: client.logoUrl,
    primaryColor: client.primaryColor,
    secondaryColor,
    accentColor: client.accentColor,
    ctaUrl: emailType ? client.ctaUrls[emailType] || client.ctaUrls.default : client.ctaUrls.default,
    phone: client.phone,
    address: client.address,
    website: client.website,
    senderName: client.senderName,
    senderTitle: client.senderTitle,
    footerText: client.footerText
  };
}

export function loadClientProfiles() {
  if (typeof window === "undefined") {
    return [defaultClientProfile];
  }

  const storedValue = window.localStorage.getItem(CLIENT_PROFILES_STORAGE_KEY);

  if (!storedValue) {
    return [defaultClientProfile];
  }

  try {
    const parsed = JSON.parse(storedValue) as ClientProfile[];
    const profiles = parsed.length > 0 ? parsed : [defaultClientProfile];

    return profiles.map((profile) => createClientProfile(profile));
  } catch {
    return [defaultClientProfile];
  }
}

export function saveClientProfiles(profiles: ClientProfile[]) {
  window.localStorage.setItem(CLIENT_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
}

export function loadSelectedClientId(profiles: ClientProfile[]) {
  if (typeof window === "undefined") {
    return profiles[0]?.clientId ?? defaultClientProfile.clientId;
  }

  const storedId = window.localStorage.getItem(SELECTED_CLIENT_STORAGE_KEY);
  const fallbackId = profiles[0]?.clientId ?? defaultClientProfile.clientId;

  return profiles.some((profile) => profile.clientId === storedId) ? storedId || fallbackId : fallbackId;
}

export function saveSelectedClientId(clientId: string) {
  window.localStorage.setItem(SELECTED_CLIENT_STORAGE_KEY, clientId);
}
