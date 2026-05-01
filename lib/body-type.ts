export const BODY_TYPES = ["SUV", "Truck", "Sedan", "Van", "EV", "Unknown"] as const;

export type BodyType = (typeof BODY_TYPES)[number];

const MODEL_BODY_TYPE_LOOKUP: Record<string, BodyType> = {
  gv60: "SUV",
  gv70: "SUV",
  gv80: "SUV",
  g70: "Sedan",
  g80: "Sedan",
  g90: "Sedan",
  qx50: "SUV",
  qx55: "SUV",
  qx60: "SUV",
  qx80: "SUV",
  q50: "Sedan",
  q60: "Sedan",
  kona: "SUV",
  tucson: "SUV",
  "santa fe": "SUV",
  palisade: "SUV",
  venue: "SUV",
  "ioniq 5": "EV",
  "ioniq 6": "EV",
  elantra: "Sedan",
  accent: "Sedan",
  terrain: "SUV",
  acadia: "SUV",
  yukon: "SUV",
  canyon: "Truck",
  "hummer ev": "EV",
  rogue: "SUV",
  pathfinder: "SUV",
  murano: "SUV",
  armada: "SUV",
  kicks: "SUV",
  equinox: "SUV",
  traverse: "SUV",
  tahoe: "SUV",
  suburban: "SUV",
  explorer: "SUV",
  expedition: "SUV",
  bronco: "SUV",
  wrangler: "SUV",
  escape: "SUV",
  edge: "SUV",
  outlander: "SUV",
  rav4: "SUV",
  highlander: "SUV",
  pilot: "SUV",
  "cr-v": "SUV",
  crv: "SUV",
  "rogue sport": "SUV",
  frontier: "Truck",
  titan: "Truck",
  colorado: "Truck",
  silverado: "Truck",
  sierra: "Truck",
  ranger: "Truck",
  f150: "Truck",
  "f-150": "Truck",
  maverick: "Truck",
  tacoma: "Truck",
  tundra: "Truck",
  gladiator: "Truck",
  accord: "Sedan",
  altima: "Sedan",
  sentra: "Sedan",
  maxima: "Sedan",
  camry: "Sedan",
  corolla: "Sedan",
  malibu: "Sedan",
  fusion: "Sedan",
  civic: "Sedan",
  sonata: "Sedan",
  odyssey: "Van",
  sienna: "Van",
  pacifica: "Van",
  transit: "Van",
  sprinter: "Van",
  leaf: "EV",
  ariya: "EV",
  bolt: "EV",
  "blazer ev": "EV",
  "mach-e": "EV",
  lightning: "EV",
  "model 3": "EV",
  "model y": "EV"
};

const MODEL_PREFIX_BODY_TYPE_RULES: Array<{
  pattern: RegExp;
  bodyType: BodyType;
}> = [
  { pattern: /^gv\d+/i, bodyType: "SUV" },
  { pattern: /^g\d+/i, bodyType: "Sedan" },
  { pattern: /^qx\d+/i, bodyType: "SUV" },
  { pattern: /^q\d+/i, bodyType: "Sedan" }
];

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanBodyText(value?: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().toLowerCase();
}

export function normalizeBodyType(value?: string): BodyType {
  const cleaned = cleanBodyText(value);

  if (!cleaned) {
    return "Unknown";
  }

  if (cleaned.includes("sport utility") || cleaned.includes("cuv") || cleaned.includes("suv")) {
    return "SUV";
  }

  if (cleaned.includes("truck") || cleaned.includes("pickup")) {
    return "Truck";
  }

  if (cleaned.includes("sedan") || cleaned.includes("coupe")) {
    return "Sedan";
  }

  if (cleaned.includes("van") || cleaned.includes("minivan")) {
    return "Van";
  }

  if (cleaned.includes("ev") || cleaned.includes("electric")) {
    return "EV";
  }

  return "Unknown";
}

export function inferBodyType(model?: string, make?: string, explicitBodyType?: string): BodyType {
  const normalizedExplicit = normalizeBodyType(explicitBodyType);

  if (normalizedExplicit !== "Unknown") {
    return normalizedExplicit;
  }

  const lookupKey = [make, model]
    .filter(Boolean)
    .join(" ")
    .trim()
    .toLowerCase();
  const compactLookupKey = compact(lookupKey);

  for (const [candidate, bodyType] of Object.entries(MODEL_BODY_TYPE_LOOKUP)) {
    if (compact(candidate) === compactLookupKey || compactLookupKey.endsWith(compact(candidate))) {
      return bodyType;
    }
  }

  const fallbackModelKey = compact(model ?? "");

  for (const [candidate, bodyType] of Object.entries(MODEL_BODY_TYPE_LOOKUP)) {
    if (compact(candidate) === fallbackModelKey) {
      return bodyType;
    }
  }

  const normalizedModel = (model ?? "").trim().toLowerCase();

  for (const rule of MODEL_PREFIX_BODY_TYPE_RULES) {
    if (rule.pattern.test(normalizedModel)) {
      return rule.bodyType;
    }
  }

  return "Unknown";
}
