export const CAMPAIGN_TYPES = [
  "Smart / Auto",
  "New Car Sales",
  "Trade / Upgrade",
  "Service",
  "Maintenance",
  "Lease",
  "Custom"
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

export const OFFER_STRATEGIES = [
  "All Available Offers",
  "Lease Priority",
  "Finance Priority",
  "Cash/Rebate Priority",
  "Price Priority",
  "No Offers"
] as const;

export type OfferStrategy = (typeof OFFER_STRATEGIES)[number];

export type CampaignConfig = {
  campaignId: string;
  campaignName: string;
  campaignType: CampaignType | "";
  offerStrategy: OfferStrategy;
  useIncentives: boolean;
  aiTone: string;
};

export function createCampaignId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `campaign-${Date.now()}`;
}

export function createCampaignConfig(seed?: Partial<CampaignConfig>): CampaignConfig {
  const seededType = seed?.campaignType ?? "";
  const frameworkUsesOpenOfferMatching =
    seededType === "New Car Sales" || seededType === "Smart / Auto";
  const defaultStrategy =
    frameworkUsesOpenOfferMatching
      ? "All Available Offers"
      : seed?.offerStrategy ?? "No Offers";
  const defaultUseIncentives =
    frameworkUsesOpenOfferMatching
      ? true
      : seed?.useIncentives ?? defaultStrategy !== "No Offers";

  return {
    campaignId: seed?.campaignId ?? createCampaignId(),
    campaignName: seed?.campaignName ?? "",
    campaignType: seededType,
    offerStrategy: defaultStrategy,
    useIncentives: defaultUseIncentives,
    aiTone: seed?.aiTone ?? "Friendly, helpful, and conversational."
  };
}

export function sanitizeCampaignConfig(campaign: CampaignConfig): CampaignConfig {
  const normalizedStrategy =
    campaign.useIncentives === false ? "No Offers" : campaign.offerStrategy;

  return {
    ...campaign,
    campaignName: campaign.campaignName.trim(),
    campaignType: campaign.campaignType,
    offerStrategy: normalizedStrategy,
    aiTone: campaign.aiTone.trim() || "Friendly, helpful, and conversational."
  };
}

export function campaignTypeUsesServiceLanguage(campaignType: CampaignConfig["campaignType"]) {
  return campaignType === "Service" || campaignType === "Maintenance";
}

export function campaignTypeBlocksServiceEmail(campaignType: CampaignConfig["campaignType"]) {
  return campaignType === "New Car Sales";
}
