import type { CampaignConfig } from "@/lib/campaign";
import type { NormalizedOffer, OfferMatchReason } from "@/lib/offer-matching";
import type { NormalizedCustomer } from "@/lib/normalize";

export type GeneratedEmail = {
  subject: string;
  headline?: string;
  emailBody: string;
  ctaLine?: string;
};

function vehicleLabel(customer: NormalizedCustomer) {
  return [customer.year, customer.make, customer.model].filter(Boolean).join(" ") || "the customer's vehicle";
}

function shortVehicleLabel(customer: NormalizedCustomer) {
  return [customer.year, customer.model].filter(Boolean).join(" ") || customer.model || "your vehicle";
}

function matchedOfferVehicleLabel(matchedOffer: NormalizedOffer | null | undefined) {
  return (
    matchedOffer?.vehicleTitle ||
    matchedOffer?.vehicleLabel ||
    [matchedOffer?.year, matchedOffer?.make || matchedOffer?.brand, matchedOffer?.model]
      .filter(Boolean)
      .join(" ") ||
    matchedOffer?.model ||
    "the offered vehicle"
  );
}

function formatBodyTypeLabel(bodyType?: NormalizedCustomer["bodyType"]) {
  if (!bodyType || bodyType === "Unknown") {
    return "vehicle";
  }

  return bodyType.toLowerCase();
}

function pluralizeBodyType(bodyType?: NormalizedCustomer["bodyType"]) {
  const label = formatBodyTypeLabel(bodyType);

  switch (label) {
    case "suv":
      return "SUVs";
    case "ev":
      return "EVs";
    case "truck":
      return "trucks";
    case "sedan":
      return "sedans";
    case "van":
      return "vans";
    default:
      return "vehicles";
  }
}

function formatCurrency(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "unknown";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(value);
}

function offerInstructions(
  customer: NormalizedCustomer,
  matchedOffer: NormalizedOffer | null | undefined,
  matchReason: OfferMatchReason | undefined
) {
  if (!matchedOffer) {
    return [
      "No matched offer is available.",
      "Do not mention incentives, rebates, APR, pricing, or offer language."
    ].join("\n");
  }

  const instructions = [
    `Matched offer headline: ${matchedOffer.headline || "none"}`,
    `Matched offer details: ${matchedOffer.details || "none"}`,
    `Matched offer model: ${matchedOffer.model || "none"}`,
    `Matched offer vehicle title: ${matchedOfferVehicleLabel(matchedOffer)}`,
    `Matched offer type: ${matchedOffer.offerType}`,
    `Match reason: ${matchReason || "none"}`,
    "You must mention the matched offer in the email body exactly once.",
    "Keep the offer mention to one short sentence max.",
    "The offer mention should feel like a useful heads-up, not an ad.",
    "Whenever you mention a matched offer or incentive, include the full year, make, and model in that sentence.",
    "Do not quote or invent pricing, APR, rebates, cash back, discounts, or incentives that are not already present in the offer details.",
    "Do not mention the disclaimer in the email body. The template will place the exact source disclaimer at the bottom automatically."
  ];

  if (matchReason === "model") {
    instructions.push(
      "For an exact model match, mention the full matched offer year, make, and model plus one concrete offer detail from the source headline or details.",
      "Do not stack multiple numbers or terms in the same email."
    );
  }

  if (matchReason === "bodyType") {
    instructions.push(
      `This is only a body-type fallback match. Since the customer is driving a ${customer.bodyType || "similar vehicle"}, you may use soft language like "Since you're currently driving a similar ${customer.bodyType || "vehicle"}, this ${matchedOffer.model || "option"} may be worth a look." Do not imply they own the offered model.`,
      "For a body-type fallback, still mention the full matched offer year, make, and model plus one concrete offer detail from the source headline if available.",
      "Keep it to a single sentence and frame it as an available option, not their vehicle."
    );
  }

  if (matchReason === "offerStrategy") {
    instructions.push(
      "This is an offer-strategy fallback only. Keep the offer mention very light and optional.",
      "Do not quote monthly payment, APR, term length, due-at-signing, cash amount, or other numeric offer terms for an offer-strategy fallback."
    );
  }

  return instructions.join("\n");
}

function emailTypeInstructions(customer: NormalizedCustomer) {
  const vehicle = vehicleLabel(customer);
  const formattedTradeValue = formatCurrency(customer.tradeValue);
  const primaryEmailType = customer.primaryEmailType || customer.emailType;
  const tradeBlock = customer.tradeBlock;
  const serviceBlock = customer.serviceBlock;

  if (primaryEmailType === "offer") {
    return [
      `Primary angle: main sales or offer message about ${vehicle}.`,
      "Lead with the matched offer and keep the sales message as the main point of the email.",
      tradeBlock
        ? customer.tradeValue
          ? `Add a brief trade-in block using soft language like "Your current vehicle may put you in a good position to review options" and use the mapped estimate of ${formattedTradeValue}. Keep it secondary to the offer.`
          : 'Add a brief trade-in block using soft language like "Your current vehicle may put you in a good position to review options," but keep it secondary to the offer.'
        : "Do not add a trade-in block unless explicitly supported by the customer data.",
      serviceBlock
        ? 'Add a brief service follow-up block using helpful language like "It may also be a good time to review service if it has been a while," but keep it secondary to the offer.'
        : "Do not add a service block unless explicitly supported by the customer data."
    ].join("\n");
  }

  switch (primaryEmailType) {
    case "trade":
      return [
        `Angle: quick question about whether they are still driving ${vehicle}.`,
        customer.tradeValue
          ? `Their mapped estimated trade value is ${formattedTradeValue}. Mention that estimate once in a natural, conservative way using words like around or about.`
          : "Mention trade value only in general terms if it helps the conversation.",
        "Suggest an upgrade conversation without sounding pushy."
      ].join("\n");
    case "service":
      return [
        `Angle: quick service check-in for ${vehicle}.`,
        "Mention maintenance and catching small things before they become bigger issues.",
        "Use soft urgency. Do not sound alarming."
      ].join("\n");
    case "lease":
      return [
        `Angle: quick note about options for ${vehicle}.`,
        "Mention timing and options in plain language.",
        "Keep it simple and easy to respond to."
      ].join("\n");
    case "general":
      return [
        `Angle: simple check-in about ${vehicle}.`,
        "Offer help without turning it into a pitch."
      ].join("\n");
  }
}

export function buildEmailHeadline(
  customer: NormalizedCustomer,
  campaign: CampaignConfig,
  matchedOffer?: NormalizedOffer | null
) {
  const vehicle = [customer.year, customer.make, customer.model].filter(Boolean).join(" ");
  const firstName = customer.firstName ? `${customer.firstName}, ` : "";
  const bodyType = formatBodyTypeLabel(customer.bodyType);
  const bodyTypePlural = pluralizeBodyType(customer.bodyType);
  const primaryEmailType = customer.primaryEmailType || customer.emailType;

  if (campaign.campaignType === "New Car Sales" || campaign.campaignType === "Smart / Auto") {
    if (matchedOffer && customer.model) {
      return `${firstName}a quick look at new options for your ${customer.model}`.trim();
    }

    if (matchedOffer) {
      return `${firstName}a quick look at new ${bodyType} options`.trim();
    }

    if (primaryEmailType === "trade") {
      return vehicle ? `${firstName}a quick value check on your ${vehicle}` : `${firstName}a quick value check`;
    }

    if (primaryEmailType === "service") {
      return vehicle ? `${firstName}a quick service follow-up` : `${firstName}a quick service follow-up`;
    }

    if (customer.model && bodyType !== "vehicle") {
      return `${firstName}${bodyTypePlural} worth a look for your ${customer.model}`.trim();
    }

    if (customer.model) {
      return `${firstName}options worth a look for your ${customer.model}`.trim();
    }

    if (bodyType !== "vehicle") {
      return `${firstName}a few ${bodyTypePlural} worth a look`.trim();
    }

    return `${firstName}a few options worth a look`.trim();
  }

  if (primaryEmailType === "trade") {
    return vehicle ? `${firstName}a quick value check on your ${vehicle}` : `${firstName}a quick value check`;
  }

  if (primaryEmailType === "lease") {
    return vehicle ? `${firstName}a quick look at your next options` : `${firstName}a quick look at your next options`;
  }

  if (primaryEmailType === "service") {
    return vehicle ? `${firstName}a quick service follow-up` : `${firstName}a quick service follow-up`;
  }

  return `${firstName}${campaign.campaignType || "a quick note from our team"}`.trim();
}

export function buildEmailPrompt(
  customer: NormalizedCustomer,
  campaign: CampaignConfig,
  matchedOffer?: NormalizedOffer | null,
  matchReason?: OfferMatchReason
) {
  const vehicle = vehicleLabel(customer);
  const shortVehicle = shortVehicleLabel(customer);
  const formattedTradeValue = formatCurrency(customer.tradeValue);
  const customContextEntries = Object.entries(customer.customContext ?? {});

  return [
    "You write dealership BDC emails that sound like a real BDC rep or sales manager.",
    "Return strict JSON only with these keys: subject, headline, emailBody, ctaLine.",
    "Do not return HTML, markdown, or commentary.",
    "",
    "Voice and tone:",
    "- Confident but not pushy.",
    "- Helpful BDC or sales manager tone.",
    "- Clear, conversational, and natural.",
    "- Friendly and helpful, not corporate and not ad-like.",
    "- No jargon, fluff, buzzwords, hype, or generic marketing language.",
    "- No pressure language, exaggerated claims, or fake urgency.",
    "- No ALL CAPS.",
    `- The requested campaign tone is: ${campaign.aiTone}`,
    "",
    "Structure:",
    "- emailBody must be 70 to 110 words.",
    "- Use 2 to 4 short paragraphs max.",
    "- Keep the same basic flow: opening, context, CTA.",
    "- End with a simple question.",
    "- Do not repeat the hero headline or email headline wording inside the body.",
    "- Make headline concise, natural, and distinct from the hero line.",
    "",
    "Safety rules:",
    "- Never invent pricing, APR, rebates, incentives, discounts, or approvals.",
    "- Never use spammy or pushy language.",
    "- If no matched offer exists, do not mention incentives or offer language.",
    "- If a matched offer exists, include exactly one sentence in the body that mentions it clearly.",
    "- Do not oversell a matched offer.",
    "- Do not repeat the full disclaimer in the body.",
    "- Do not invent savings, eligibility, guarantees, or approvals.",
    "",
    "Banned words and phrases:",
    '- Avoid these exact words or phrases unless they appear inside required source data: "honestly", "to be truthful", "contract", "buy", "cheap", "I think", "maybe", "probably", "just checking in", "just wanted", "hopefully", "I want to", "sorry to bother you", "we are the best", "problem", "cost", "price", "sign here", "features", "synergy", "disruptive", "leasing-edge", "limited time", "act now".',
    "",
    "Preferred swaps:",
    '- Use "own", "upgrade", or "get into" instead of "buy".',
    '- Use "paperwork" or "agreement" instead of "contract".',
    '- Use "value-driven" or "cost-effective" instead of "cheap".',
    '- Use "opportunity" or "challenge" instead of "problem".',
    '- Use "amount", "monthly amount", or "investment" instead of "cost" or "price".',
    '- Use "benefits" instead of "features".',
    '- Use "you might find value in" instead of "I want to show you".',
    '- Use "reaching out with a quick update" instead of "just checking in".',
    '- Use "may", "could", or "looks like" instead of "maybe" or "probably".',
    "",
    `Campaign name: ${campaign.campaignName}`,
    `Campaign type: ${campaign.campaignType || "General campaign"}`,
    `Offer strategy: ${campaign.offerStrategy}`,
    `Use incentives: ${campaign.useIncentives ? "yes" : "no"}`,
    "Campaign type sets the overall framework, tone, and allowed content blocks.",
    "Customer data still decides lease, finance, cash, trade, and service messaging triggers.",
    "",
    `Email type: ${customer.emailType}`,
    `Primary email type: ${customer.primaryEmailType || customer.emailType}`,
    `Trade block: ${customer.tradeBlock ? "yes" : "no"}`,
    `Service block: ${customer.serviceBlock ? "yes" : "no"}`,
    `Add-on blocks: ${customer.addOnBlocks?.join(", ") || "none"}`,
    emailTypeInstructions(customer),
    "",
    "Offer guidance:",
    offerInstructions(customer, matchedOffer, matchReason),
    "",
    "Controlled variation:",
    "- Vary the opening sentence, core message phrasing, and CTA wording across customers.",
    "- Keep the strategy consistent for the assigned email type.",
    "- Avoid defaulting to repetitive openings or weak phrasing.",
    "- Rotate between different natural openings like reaching out with a quick update, a simple follow-up, a short note, or a quick question.",
    "- For no-offer general emails, make the second paragraph meaningfully different from the first instead of repeating the same check-in idea.",
    "- Keep the body conversational, but do not let paragraph one and paragraph two say the same thing in slightly different words.",
    "",
    "Subject line:",
    "- Keep it under 6 words when possible.",
    "- Make it curiosity-driven, not salesy.",
    "- Avoid spam words like free, deal, offer, save, urgent, guaranteed, approved, or limited.",
    `- Good examples: "Still driving your ${shortVehicle}?", "Got a minute?", "Quick ${customer.model || "vehicle"} question"`,
    "",
    "Headline:",
    "- Keep it short and useful for the content header.",
    "- Do not copy the subject line exactly.",
    "- Do not repeat the hero phrasing exactly.",
    "- Keep it consultative, specific, and natural.",
    "",
    "CTA line:",
    "- Provide a short response prompt that can also be used in the template button area.",
    "- Examples: \"Would you be open to taking a look?\", \"Do you have a few minutes this week?\", \"Would it make sense to check options?\"",
    "- Keep it helpful and low-pressure.",
    "",
    "Customer data:",
    `First name: ${customer.firstName || "there"}`,
    `Last name: ${customer.lastName || "unknown"}`,
    `Email: ${customer.email || "unknown"}`,
    `Vehicle: ${vehicle}`,
    `Body type: ${customer.bodyType || "Unknown"}`,
    `Mileage: ${customer.mileage ?? "unknown"}`,
    `Lease end date: ${customer.leaseEndDate || "unknown"}`,
    `Last service date: ${customer.lastServiceDate || "unknown"}`,
    `Trade value: ${formattedTradeValue}`,
    ...(customContextEntries.length > 0
      ? [
          "",
          "Additional selected customer context:",
          ...customContextEntries.map(([key, value]) => `${key}: ${value}`)
        ]
      : [])
  ].join("\n");
}
