import type { NormalizedCustomer } from "@/lib/normalize";

export type GeneratedEmail = {
  subject: string;
  headline: string;
  emailBody: string;
  ctaLine?: string;
};

function vehicleLabel(customer: NormalizedCustomer) {
  return [customer.year, customer.make, customer.model].filter(Boolean).join(" ") || "the customer's vehicle";
}

function shortVehicleLabel(customer: NormalizedCustomer) {
  return [customer.year, customer.model].filter(Boolean).join(" ") || customer.model || "your vehicle";
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

function emailTypeInstructions(customer: NormalizedCustomer) {
  const vehicle = vehicleLabel(customer);
  const formattedTradeValue = formatCurrency(customer.tradeValue);

  switch (customer.emailType) {
    case "trade":
      return [
        `Angle: quick question about whether they are still driving ${vehicle}.`,
        customer.tradeValue
          ? `Their mapped estimated trade value is ${formattedTradeValue}. Mention that estimate once in a natural, conservative way using words like around or about.`
          : "Mention trade value or what it may be worth only in general terms.",
        "Suggest an upgrade conversation without naming prices, payments, rebates, or discounts."
      ].join("\n");
    case "service":
      return [
        `Angle: quick service check-in for ${vehicle}.`,
        "Mention maintenance and catching small things before they become bigger issues.",
        "Use soft urgency. Do not imply the vehicle is unsafe or overdue unless the data says so."
      ].join("\n");
    case "lease":
      return [
        "Angle: quick note because their lease may be coming up.",
        "Mention they have options without over-explaining them.",
        "Offer to talk through next steps in plain language."
      ].join("\n");
    case "general":
      return [
        `Angle: simple check-in about ${vehicle}.`,
        "Offer help without turning it into a pitch."
      ].join("\n");
  }
}

export function buildEmailPrompt(customer: NormalizedCustomer) {
  const vehicle = vehicleLabel(customer);
  const shortVehicle = shortVehicleLabel(customer);
  const formattedTradeValue = formatCurrency(customer.tradeValue);
  const customContextEntries = Object.entries(customer.customContext ?? {});

  return [
    "You write dealership BDC emails that sound like a real BDC rep or sales manager.",
    "Return strict JSON only with content fields. Do not return HTML.",
    "Use exactly these JSON keys: subject, headline, emailBody, ctaLine.",
    "ctaLine can be an empty string if the emailBody already ends with the right simple response prompt.",
    "",
    "Voice and tone:",
    "- Conversational, natural, and slightly informal.",
    "- Friendly and helpful, but not corporate.",
    "- No fluff, buzzwords, hype, or generic marketing language.",
    "- Make it feel like a quick question or a wanted-to-reach-out note.",
    "- Occasional casual phrasing is good, such as \"just wanted to reach out\" or \"quick heads up\".",
    "- Do not make every email start with \"I wanted to reach out\".",
    "",
    "Structure:",
    "- emailBody must be 80 to 120 words.",
    "- Use 2 to 4 short paragraphs max.",
    "- Keep the same basic flow: opening, vehicle or situation context, then CTA.",
    "- Use short sentences.",
    "- Make it easy to skim.",
    "- Do not over-explain.",
    "- Do not make emails completely different from the assigned email type strategy.",
    "",
    "Consistency by email type:",
    "- Trade emails should stay focused on value and a possible upgrade opportunity.",
    "- Service emails should stay focused on a maintenance reminder.",
    "- Lease emails should stay focused on timing and options.",
    "- General emails should stay focused on a simple check-in.",
    "",
    "Controlled variation:",
    "- Do not reuse identical phrasing across customers.",
    "- Vary the opening sentence, core-message phrasing, and CTA wording slightly.",
    "- Avoid repeating the same opening or closing sentence.",
    "- Use slight variation in sentence length.",
    "- Use slight tone variation while staying friendly BDC style.",
    "- Balance consistency and uniqueness. Do not make the emails identical, but do not make them drastically different.",
    "",
    "Personalization:",
    "- Use vehicle info naturally when available.",
    "- Mention mileage or the customer's situation only when relevant.",
    "- If a trade email includes a known trade value, mention that estimate once naturally in the body.",
    "- If additional selected CRM fields are provided below, use the relevant ones naturally when they help the email feel more personal.",
    "- Do not force missing data into the email.",
    "",
    "CTA:",
    "- ctaLine must be a simple response prompt. Prefer a question, but a casual line like \"Let me know if you'd like me to run numbers.\" is okay.",
    "- End the emailBody with the same ctaLine as the final line when ctaLine is provided.",
    "- Rotate CTA wording naturally across customers.",
    "- CTA examples: \"Would you be open to taking a look?\", \"Do you have a few minutes this week?\", \"Would it make sense to check options?\", \"Let me know if you'd like me to run numbers.\"",
    "",
    "Subject line:",
    "- Keep it under 6 words when possible.",
    "- Make it curiosity-driven, not salesy.",
    "- It should feel like a real person wrote it.",
    "- Avoid spam words like free, deal, offer, save, urgent, guaranteed, approved, or limited.",
    `- Good examples: \"Still driving your ${shortVehicle}?\", \"Got a minute?\", \"Quick ${customer.model || "vehicle"} question\", \"Worth a quick look?\"`,
    "",
    "Headline:",
    "- Short, human, and useful inside a branded email template.",
    "- Do not make it sound like an ad.",
    "- Keep it aligned with the assigned email type.",
    "- You may include the customer's first name only if it sounds natural.",
    "- For trade headlines, focus on value or upgrade interest.",
    "",
    "Safety rules: do not generate pricing, APR, rebates, discounts, incentives, guarantees, or fabricated offers.",
    "Never write \"limited time offer\" or similar pressure language.",
    "Only reference general opportunities supported by the data.",
    "",
    `Email type: ${customer.emailType}`,
    emailTypeInstructions(customer),
    "",
    "Customer data:",
    `First name: ${customer.firstName || "there"}`,
    `Last name: ${customer.lastName || "unknown"}`,
    `Email: ${customer.email || "unknown"}`,
    `Vehicle: ${vehicle}`,
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
