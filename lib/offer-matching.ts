import type { CampaignConfig, OfferStrategy } from "@/lib/campaign";
import { inferBodySize, inferBodyType, type BodyType } from "@/lib/body-type";
import type { CustomerIntent, NormalizedCustomer } from "@/lib/normalize";
import { hasServiceTrigger, hasTradeTrigger, type EmailType } from "@/lib/rules";

export type OfferMatchReason = "model" | "bodyType" | "offerStrategy" | "noOffersAvailable" | "none";

export type OfferType = "lease" | "finance" | "cash" | "rebate" | "price" | "general";

export type NormalizedOffer = {
  year?: number;
  make?: string;
  brand?: string;
  model: string;
  trim?: string;
  vehicleTitle?: string;
  vehicleLabel?: string;
  bodyType: BodyType;
  offerType: OfferType;
  headline: string;
  details: string;
  disclaimer: string;
  imageUrl?: string;
  heroImageFit?: "cover" | "contain";
  ctaUrl?: string;
  active: boolean;
};

function usesSalesOfferFramework(campaignType: CampaignConfig["campaignType"]) {
  return campaignType === "New Car Sales" || campaignType === "Smart / Auto";
}

function resolvePrimaryEmailType(
  customer: Pick<NormalizedCustomer, "emailType" | "matchedOffer" | "tradeBlock" | "serviceBlock">,
  campaign: CampaignConfig
): "offer" | EmailType {
  if (usesSalesOfferFramework(campaign.campaignType) && customer.matchedOffer) {
    return "offer";
  }

  if (customer.tradeBlock) {
    return "trade";
  }

  if (customer.serviceBlock) {
    return "service";
  }

  if (usesSalesOfferFramework(campaign.campaignType)) {
    return "general";
  }

  return customer.emailType;
}

function strategyMatchesOffer(strategy: OfferStrategy, offer: NormalizedOffer) {
  switch (strategy) {
    case "Lease Priority":
      return offer.offerType === "lease";
    case "Finance Priority":
      return offer.offerType === "finance";
    case "Cash/Rebate Priority":
      return offer.offerType === "cash" || offer.offerType === "rebate";
    case "Price Priority":
      return offer.offerType === "price";
    case "All Available Offers":
      return true;
    case "No Offers":
      return false;
  }
}

function allowedOfferTypesForStrategy(strategy: OfferStrategy): OfferType[] {
  switch (strategy) {
    case "Lease Priority":
      return ["lease"];
    case "Finance Priority":
      return ["finance"];
    case "Cash/Rebate Priority":
      return ["rebate", "cash", "price"];
    case "Price Priority":
      return ["price"];
    case "All Available Offers":
      return ["lease", "finance", "cash", "rebate", "price", "general"];
    case "No Offers":
      return [];
  }
}

function allowedOfferTypesForIntent(customerIntent: CustomerIntent, strategy: OfferStrategy): OfferType[] {
  switch (customerIntent) {
    case "lease":
      return ["lease"];
    case "finance":
      return ["finance"];
    case "cash":
      return ["rebate", "cash", "price"];
    case "unknown":
      return allowedOfferTypesForStrategy(strategy);
  }
}

export function normalizeModelKey(model?: string, make?: string) {
  const cleanedModel = (model ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b(new|used|certified|cpo)\b/g, " ")
    .replace(/\b20\d{2}\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cleanedMake = (make ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  if (!cleanedModel) {
    return "";
  }

  if (cleanedMake) {
    const escapedMake = cleanedMake.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    return cleanedModel
      .replace(new RegExp(`^${escapedMake}\\s+`, "i"), "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return cleanedModel;
}

function looksLikeTrimToken(value: string) {
  const cleaned = value.trim().toLowerCase();

  if (!cleaned) {
    return false;
  }

  return /^(?:\d+(?:\.\d+)?[a-z]{0,3}|[2-4]wd|awd|fwd|rwd|ev|hev|phev|hybrid|sport|limited|premium|luxury|advanced|elite|platinum|xlt|lariat|denali|sl|sv|slt|lt|ltz|se|sel|s|base|pro)$/i.test(
    cleaned
  );
}

function modelKeysMatch(customerModel: string, offerModel: string) {
  if (!customerModel || !offerModel) {
    return false;
  }

  if (customerModel === offerModel) {
    return true;
  }

  const customerTokens = customerModel.split(" ");
  const offerTokens = offerModel.split(" ");
  const shorter = customerTokens.length <= offerTokens.length ? customerTokens : offerTokens;
  const longer = shorter === customerTokens ? offerTokens : customerTokens;

  if (longer.length <= shorter.length) {
    return false;
  }

  const sharedPrefix = shorter.every((token, index) => token === longer[index]);
  return sharedPrefix && longer.slice(shorter.length).every(looksLikeTrimToken);
}

function pickBestOffer(candidates: NormalizedOffer[], strategy: OfferStrategy) {
  if (candidates.length === 0) {
    return null;
  }

  const scoredCandidates = candidates
    .map((offer, index) => ({
      offer,
      index,
      score: (strategyMatchesOffer(strategy, offer) ? 2 : 0) + 1
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index);

  return scoredCandidates[0]?.offer ?? null;
}

function bodyTypeMatchesWithSize(
  customer: Pick<NormalizedCustomer, "make" | "model" | "bodyType">,
  offer: Pick<NormalizedOffer, "make" | "brand" | "model" | "bodyType" | "vehicleTitle" | "vehicleLabel">
) {
  const customerBodyType = customer.bodyType ?? inferBodyType(customer.model, customer.make);
  const offerBodyType = offer.bodyType;

  if (customerBodyType === "Unknown" || offerBodyType === "Unknown") {
    return false;
  }

  if (customerBodyType !== offerBodyType) {
    return false;
  }

  const customerBodySize = inferBodySize(customer.model, customer.make, customer.bodyType);
  const offerBodySize = inferBodySize(
    offer.model,
    offer.make || offer.brand,
    offer.vehicleTitle || offer.vehicleLabel
  );

  if (customerBodySize === "Unknown" || offerBodySize === "Unknown") {
    return true;
  }

  return customerBodySize === offerBodySize;
}

export function matchOfferToCustomer(
  customer: Pick<NormalizedCustomer, "make" | "model" | "bodyType" | "customerIntent">,
  campaign: CampaignConfig,
  offers: NormalizedOffer[]
) {
  const activeOffers = offers.filter((offer) => offer.active);
  const allowedOfferTypes = allowedOfferTypesForIntent(
    customer.customerIntent ?? "unknown",
    campaign.offerStrategy
  );

  if (activeOffers.length === 0 || allowedOfferTypes.length === 0) {
    return {
      offer: null,
      reason: "none" as const,
      allowedOfferTypes,
      offersAfterIntentFilterCount: 0,
      modelMatchFound: false,
      bodyTypeMatchFound: false
    };
  }

  const customerModel = normalizeModelKey(customer.model, customer.make);
  const customerBodyType = customer.bodyType ?? inferBodyType(customer.model, customer.make);
  const intentFilteredOffers = activeOffers.filter((offer) => allowedOfferTypes.includes(offer.offerType));

  const exactModelMatches = intentFilteredOffers.filter((offer) => {
    if (!modelKeysMatch(customerModel, normalizeModelKey(offer.model, offer.make || offer.brand))) {
      return false;
    }

    if (customerBodyType === "Unknown" || offer.bodyType === "Unknown") {
      return true;
    }

    return bodyTypeMatchesWithSize(customer, offer);
  });
  const modelMatchFound = exactModelMatches.length > 0;
  const exactModelMatch = pickBestOffer(exactModelMatches, campaign.offerStrategy);

  if (exactModelMatch) {
    return {
      offer: exactModelMatch,
      reason: "model" as const,
      allowedOfferTypes,
      offersAfterIntentFilterCount: intentFilteredOffers.length,
      modelMatchFound,
      bodyTypeMatchFound: false
    };
  }

  const bodyTypeMatches =
    customerBodyType !== "Unknown"
      ? intentFilteredOffers.filter((offer) => bodyTypeMatchesWithSize(customer, offer))
      : [];
  const bodyTypeMatchFound = bodyTypeMatches.length > 0;
  const bodyTypeMatch = pickBestOffer(bodyTypeMatches, campaign.offerStrategy);

  if (bodyTypeMatch) {
    return {
      offer: bodyTypeMatch,
      reason: "bodyType" as const,
      allowedOfferTypes,
      offersAfterIntentFilterCount: intentFilteredOffers.length,
      modelMatchFound,
      bodyTypeMatchFound
    };
  }

  return {
    offer: null,
    reason: "none" as const,
    allowedOfferTypes,
    offersAfterIntentFilterCount: intentFilteredOffers.length,
    modelMatchFound,
    bodyTypeMatchFound
  };
}

export function applyOfferMatchesToCustomers(
  customers: NormalizedCustomer[],
  campaign: CampaignConfig,
  offers: NormalizedOffer[]
) {
  return customers.map((customer) => {
    const match = campaign.useIncentives
      ? matchOfferToCustomer(customer, campaign, offers)
      : {
          offer: null,
          reason: "none" as const,
          allowedOfferTypes: [] as OfferType[],
          offersAfterIntentFilterCount: 0,
          modelMatchFound: false,
          bodyTypeMatchFound: false
        };

    const tradeBlock = usesSalesOfferFramework(campaign.campaignType)
      ? hasTradeTrigger(customer)
      : false;
    const serviceBlock = usesSalesOfferFramework(campaign.campaignType)
      ? hasServiceTrigger(customer)
      : false;
    const customerWithBlocks = {
      ...customer,
      matchedOffer: match.offer,
      tradeBlock,
      serviceBlock
    };
    const addOnBlocks: Array<"Trade" | "Service"> = [];

    if (customerWithBlocks.matchedOffer && tradeBlock) {
      addOnBlocks.push("Trade");
    }

    if (customerWithBlocks.matchedOffer && serviceBlock) {
      addOnBlocks.push("Service");
    }

    return {
      ...customerWithBlocks,
      matchReason: match.reason,
      allowedOfferTypes: match.allowedOfferTypes,
      offersAfterIntentFilterCount: match.offersAfterIntentFilterCount,
      modelMatchFound: match.modelMatchFound,
      bodyTypeMatchFound: match.bodyTypeMatchFound,
      primaryEmailType: resolvePrimaryEmailType(customerWithBlocks, campaign),
      addOnBlocks,
      offerDisclaimer: match.offer?.disclaimer || undefined
    };
  });
}
