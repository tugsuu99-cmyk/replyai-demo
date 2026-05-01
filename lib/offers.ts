import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { inferBodyType } from "@/lib/body-type";
import type { NormalizedOffer, OfferType } from "@/lib/offer-matching";

type OfferFieldKey =
  | "year"
  | "make"
  | "model"
  | "vehicleTitle"
  | "bodyType"
  | "offerType"
  | "offers"
  | "headline"
  | "details"
  | "disclaimer"
  | "imageUrl"
  | "ctaUrl"
  | "active";

const OFFER_FIELD_SYNONYMS: Record<OfferFieldKey, string[]> = {
  year: ["year", "model year", "vehicle year"],
  make: ["make", "brand", "vehicle make"],
  vehicleTitle: ["vehicle title", "model title", "vehicle name", "nameplate title", "vehicle title/trim"],
  model: ["model", "vehicle model", "offer model", "model name", "nameplate"],
  bodyType: ["body type", "bodytype", "segment", "vehicle segment", "category"],
  offerType: ["offer type", "offertype", "offer category"],
  offers: [
    "offers",
    "offer",
    "offer copy",
    "offer text",
    "offer content",
    "apr offers",
    "lease offers",
    "incentives",
    "specials",
    "special offers"
  ],
  headline: ["headline", "title", "offer headline", "offer title"],
  details: ["details", "description", "offer details", "copy", "message"],
  disclaimer: ["disclaimer", "fine print", "legal", "terms", "offer disclaimer"],
  imageUrl: ["image url", "image link", "hero image", "hero image url", "vdp image", "vdp image url", "vdp image link", "photo url", "vehicle image"],
  ctaUrl: ["vdp url", "vdp link", "inventory url", "inventory link", "vehicle details url", "offer url", "cta url", "url", "link"],
  active: ["active", "enabled", "is active", "status", "live"]
};

const IGNORED_OFFER_HEADERS = new Set(["medium"]);

const INVALID_OFFER_TEXT = new Set([
  "medium",
  "offers",
  "disclaimer",
  "slider",
  "lease page",
  "client offer"
]);

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cleanText(value?: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().replace(/\s+/g, " ");
}

function dedupeRepeatedYear(value: string) {
  return value.replace(/\b(20\d{2})\s+\1\b/g, "$1").trim();
}

function normalizeOfferType(value?: unknown): OfferType {
  const cleaned = cleanText(value).toLowerCase();

  if (!cleaned) {
    return "general";
  }

  if (/\blease\b|\/mo\b|\bper\s+month\b/.test(cleaned)) {
    return "lease";
  }

  if (/\b(apr|finance|financing)\b/.test(cleaned)) {
    return "finance";
  }

  if (/\b(rebate|bonus cash|customer cash|total cash)\b/.test(cleaned)) {
    return "rebate";
  }

  if (/\bcash\b/.test(cleaned)) {
    return "cash";
  }

  if (/\b(price|discount|msrp|sale)\b/.test(cleaned)) {
    return "price";
  }

  return "general";
}

function normalizeActive(value?: unknown) {
  const cleaned = cleanText(value).toLowerCase();

  if (!cleaned) {
    return true;
  }

  return !["false", "inactive", "no", "0", "expired"].includes(cleaned);
}

function scoreHeader(header: string, field: OfferFieldKey) {
  const headerCompact = compact(header);

  return OFFER_FIELD_SYNONYMS[field].reduce((bestScore, synonym) => {
    const synonymCompact = compact(synonym);

    if (headerCompact === synonymCompact) {
      return Math.max(bestScore, 100);
    }

    if (headerCompact.includes(synonymCompact) || synonymCompact.includes(headerCompact)) {
      return Math.max(bestScore, 80);
    }

    return bestScore;
  }, 0);
}

function inferOfferHeaders(headers: string[]) {
  const eligibleHeaders = headers.filter((header) => !IGNORED_OFFER_HEADERS.has(compact(header)));
  const assigned = new Set<string>();
  const mapping: Partial<Record<OfferFieldKey, string>> = {};

  for (const field of Object.keys(OFFER_FIELD_SYNONYMS) as OfferFieldKey[]) {
    const bestHeader = eligibleHeaders
      .filter((header) => !assigned.has(header))
      .map((header) => ({ header, score: scoreHeader(header, field) }))
      .sort((left, right) => right.score - left.score)[0];

    if (bestHeader && bestHeader.score >= 70) {
      mapping[field] = bestHeader.header;
      assigned.add(bestHeader.header);
    }
  }

  return mapping;
}

const OFFER_CUE_PATTERN =
  /\b(?:lease\s+for|purchase\s+for|finance\s+for|\d+(?:\.\d+)?%\s*apr|apr|bonus\s+cash|customer\s+cash|total\s+cash|incentives?|specials?|special\s+offers?|msrp|sale\s+price|starting\s+at|now\s+through|expires?)\b/i;

const GENERIC_TRIM_TOKENS = new Set([
  "2wd",
  "4wd",
  "awd",
  "fwd",
  "rwd",
  "s",
  "se",
  "sel",
  "sel plus",
  "limited",
  "platinum",
  "sport",
  "premium",
  "luxury",
  "advanced",
  "preferred",
  "signature",
  "active",
  "ultimate",
  "base",
  "pro",
  "sr",
  "sv",
  "sl",
  "slt",
  "denali",
  "elevation",
  "lt",
  "ls",
  "ltz",
  "xl",
  "xlt",
  "lariat",
  "tremor",
  "king ranch",
  "platinum plus",
  "reserve",
  "touring",
  "elite",
  "essence",
  "preferred awd",
  "preferred fwd"
]);

function looksLikeTrimFragment(value: string) {
  const cleaned = value.trim().toLowerCase();

  if (!cleaned) {
    return false;
  }

  if (GENERIC_TRIM_TOKENS.has(cleaned)) {
    return true;
  }

  return /^(?:\d+(?:\.\d+)?[a-z]{0,3}|[2-4]wd|awd|fwd|rwd|ev|hev|phev|hybrid)$/i.test(cleaned);
}

function stripOfferCueText(value: string) {
  const cleaned = dedupeRepeatedYear(cleanText(value));
  const cueMatch = cleaned.match(OFFER_CUE_PATTERN);

  if (!cueMatch) {
    return cleaned;
  }

  if (cueMatch.index === 0) {
    return "";
  }

  return cleaned.slice(0, cueMatch.index).trim();
}

function tokenizeVehicleSection(value: string) {
  return stripOfferCueText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function inferModelFromText(text?: string, fallbackModel?: string) {
  const cleaned = stripOfferCueText(text ?? "");

  if (cleaned) {
    return cleaned;
  }

  return cleanText(fallbackModel) || "";
}

function cleanOfferHeadline(text?: string) {
  return (text ?? "")
    .replace(/\s+/g, " ")
    .replace(/\b(lease|finance|cash|rebate|price)\s+priority\b/i, "")
    .trim();
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function extractUrls(value?: string) {
  return (value ?? "").match(/https?:\/\/[^\s<>"')]+/gi) ?? [];
}

function isValidImageUrl(url: string) {
  return /^https?:\/\/.+\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(url);
}

function splitModelAndTrim(vehicleSection: string, explicitModel?: string) {
  const cleanedSection = stripOfferCueText(vehicleSection);
  const fallbackModel = cleanText(explicitModel);

  if (!cleanedSection) {
    return {
      model: fallbackModel,
      trim: ""
    };
  }

  if (fallbackModel) {
    const sectionCompact = compact(cleanedSection);
    const explicitCompact = compact(fallbackModel);

    if (sectionCompact.startsWith(explicitCompact)) {
      const trim = cleanedSection.slice(fallbackModel.length).trim();
      return {
        model: fallbackModel,
        trim
      };
    }
  }

  const tokens = tokenizeVehicleSection(cleanedSection);

  if (tokens.length <= 1) {
    return {
      model: cleanedSection,
      trim: ""
    };
  }

  const trailingTokens = tokens.slice(1);

  if (trailingTokens.length > 0 && trailingTokens.every(looksLikeTrimFragment)) {
    return {
      model: tokens[0],
      trim: trailingTokens.join(" ")
    };
  }

  const lastToken = tokens[tokens.length - 1];
  const trimCandidate = tokens.slice(1).join(" ");

  if (
    GENERIC_TRIM_TOKENS.has(lastToken.toLowerCase()) ||
    GENERIC_TRIM_TOKENS.has(trimCandidate.toLowerCase())
  ) {
    return {
      model: tokens.slice(0, tokens.length - 1).join(" "),
      trim: lastToken
    };
  }

  return {
    model: cleanedSection,
    trim: ""
  };
}

function extractVehicleMeta(
  text?: string,
  fallback?: {
    explicitYear?: number;
    explicitMake?: string;
    explicitModel?: string;
    explicitVehicleTitle?: string;
  }
) {
  const explicitYear = fallback?.explicitYear;
  const explicitMake = cleanText(fallback?.explicitMake);
  const explicitModel = cleanText(fallback?.explicitModel);
  const explicitVehicleTitle = dedupeRepeatedYear(cleanText(fallback?.explicitVehicleTitle));
  const sourceText = dedupeRepeatedYear(cleanText(text));
  const cleaned = sourceText || explicitVehicleTitle;

  if (!cleaned && !explicitModel) {
    return null;
  }

  const yearMatch = cleaned.match(/\b(20\d{2})\b/);
  const year = explicitYear ?? (yearMatch ? Number(yearMatch[1]) : undefined);
  const conditionMatch = cleaned.match(/\b(New|Certified|Used)\b/i);
  const condition = conditionMatch?.[1];

  let titleSection = explicitVehicleTitle;

  if (!titleSection && cleaned) {
    titleSection = stripOfferCueText(cleaned);
  }

  if (titleSection && year) {
    const yearIndex = titleSection.search(new RegExp(`\\b${year}\\b`, "i"));

    if (yearIndex >= 0) {
      titleSection = titleSection.slice(yearIndex).trim();
    }
  }

  const titleTokens = tokenizeVehicleSection(titleSection);
  const brand = explicitMake || titleTokens[1] || titleTokens[0] || "";
  const afterBrandTokens = titleTokens.filter((token, index) => {
    if (condition && index === 0 && token.toLowerCase() === condition.toLowerCase()) {
      return false;
    }

    if (year && token === String(year)) {
      return false;
    }

    if (brand && token.toLowerCase() === brand.toLowerCase()) {
      return false;
    }

    return true;
  });
  const { model, trim } = splitModelAndTrim(afterBrandTokens.join(" "), explicitModel);
  const vehicleTitleBase = [
    condition || "New",
    year ? String(year) : "",
    brand,
    model,
    trim
  ]
    .filter(Boolean)
    .join(" ");
  const vehicleTitle = dedupeRepeatedYear(vehicleTitleBase || explicitVehicleTitle || cleaned);

  return {
    year,
    make: brand,
    brand,
    model: model || explicitModel || "",
    trim,
    vehicleTitle,
    vehicleLabel: vehicleTitle
  };
}

function stripHtml(value: string, preserveLineBreaks = false) {
  const text = decodeHtmlEntities(value.replace(/<[^>]+>/g, preserveLineBreaks ? "\n" : " "));

  if (!preserveLineBreaks) {
    return text.replace(/\s+/g, " ").trim();
  }

  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function isInvalidOfferText(value?: string) {
  const cleaned = cleanText(value).toLowerCase();
  return !cleaned || INVALID_OFFER_TEXT.has(cleaned);
}

function splitOfferChunks(rawOffers?: string) {
  return (rawOffers ?? "")
    .split(/\s+\bOR\b\s+|\n{2,}|(?:\r?\n)[\-*•]\s+|(?:^|[.;])\s*(?=(?:New\s+20\d{2}\s+[A-Za-z]+\s+[A-Za-z0-9-]+)|(?:\d+(\.\d+)?%\s*APR)|(?:Lease\s+for\s+\$)|(?:Piemonte Price)|(?:MSRP)|(?:Discount)|(?:Bonus Cash)|(?:Customer Cash)|(?:Total Cash))/gim)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function splitOfferLines(rawOffers?: string) {
  return (rawOffers ?? "")
    .split(/\r?\n/)
    .map((line) => dedupeRepeatedYear(cleanText(line)))
    .filter(Boolean);
}

function isVehicleDescriptorLine(line: string) {
  const cleaned = dedupeRepeatedYear(cleanText(line));

  if (!cleaned) {
    return false;
  }

  if (/\b(new|used|certified)\b/i.test(cleaned) && /\b20\d{2}\b/.test(cleaned)) {
    return true;
  }

  return /\b20\d{2}\b/.test(cleaned) && !OFFER_CUE_PATTERN.test(cleaned);
}

function resolveOfferLinks(
  explicitImageCandidate: string,
  explicitCtaCandidate: string,
  discoveredUrls: string[]
) {
  const explicitUrls = [explicitImageCandidate, explicitCtaCandidate].filter(Boolean);
  const imageUrl =
    explicitUrls.find(isValidImageUrl) || discoveredUrls.find(isValidImageUrl) || "";
  const ctaUrl =
    explicitUrls.find((url) => !isValidImageUrl(url)) ||
    discoveredUrls.find((url) => !isValidImageUrl(url)) ||
    "";

  return { imageUrl, ctaUrl };
}

function removeVehicleTitleFromText(text: string, vehicleTitle?: string) {
  const normalizedText = dedupeRepeatedYear(cleanText(text));
  const normalizedVehicleTitle = dedupeRepeatedYear(cleanText(vehicleTitle));

  if (!normalizedVehicleTitle) {
    return normalizedText;
  }

  return normalizedText
    .replace(
      new RegExp(`\\b${normalizedVehicleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i"),
      ""
    )
    .replace(/\s{2,}/g, " ")
    .trim();
}

function sanitizeOfferHeadline(headline: string, vehicleTitle?: string) {
  return cleanOfferHeadline(removeVehicleTitleFromText(headline, vehicleTitle));
}

function buildOfferFromTextChunk(
  chunk: string,
  row: Record<string, unknown>,
  mapping: Partial<Record<OfferFieldKey, string>>
): NormalizedOffer | null {
  const explicitYear = Number.parseInt(cleanText(rowValue(row, mapping.year)), 10);
  const explicitMake = cleanText(rowValue(row, mapping.make));
  const explicitModel = cleanText(rowValue(row, mapping.model));
  const explicitVehicleTitle = cleanText(rowValue(row, mapping.vehicleTitle));
  const vehicleMeta =
    extractVehicleMeta(chunk, {
      explicitYear: Number.isFinite(explicitYear) ? explicitYear : undefined,
      explicitMake,
      explicitModel,
      explicitVehicleTitle
    }) ??
    extractVehicleMeta(
      cleanText(rowValue(row, mapping.headline)) ||
        cleanText(rowValue(row, mapping.details)) ||
        cleanText(rowValue(row, mapping.offers)),
      {
        explicitYear: Number.isFinite(explicitYear) ? explicitYear : undefined,
        explicitMake,
        explicitModel,
        explicitVehicleTitle
      }
    );
  const model = cleanText(vehicleMeta?.model) || inferModelFromText(chunk, explicitModel);
  const normalizedChunk = dedupeRepeatedYear(cleanText(chunk));
  const chunkWithoutVehicleTitle = removeVehicleTitleFromText(
    normalizedChunk,
    vehicleMeta?.vehicleTitle
  );
  const headlineLine = sanitizeOfferHeadline(
    chunkWithoutVehicleTitle.split(/\n/)[0] || chunkWithoutVehicleTitle || normalizedChunk,
    vehicleMeta?.vehicleTitle
  );
  const offerType = normalizeOfferType(
    cleanText(rowValue(row, mapping.offerType)) || headlineLine || chunk
  );
  const details = chunkWithoutVehicleTitle.replace(headlineLine, "").trim() || chunkWithoutVehicleTitle || normalizedChunk;
  const explicitImageUrl = cleanText(rowValue(row, mapping.imageUrl));
  const explicitCtaUrl = cleanText(rowValue(row, mapping.ctaUrl));
  const discoveredUrls = [
    ...extractUrls(cleanText(rowValue(row, mapping.offers))),
    ...extractUrls(cleanText(rowValue(row, mapping.details))),
    ...extractUrls(chunk)
  ];
  const { imageUrl, ctaUrl } = resolveOfferLinks(
    explicitImageUrl,
    explicitCtaUrl,
    discoveredUrls
  );

  if ((!headlineLine && !details) || isInvalidOfferText(headlineLine) || isInvalidOfferText(model)) {
    return null;
  }

  return {
    year: Number.isFinite(explicitYear) ? explicitYear : vehicleMeta?.year,
    make: explicitMake || vehicleMeta?.make || "",
    brand: explicitMake || vehicleMeta?.brand || "",
    model,
    trim: vehicleMeta?.trim || "",
    vehicleTitle:
      vehicleMeta?.vehicleTitle ||
      dedupeRepeatedYear([explicitYear, explicitMake, model, vehicleMeta?.trim].filter(Boolean).join(" ")),
    vehicleLabel:
      vehicleMeta?.vehicleLabel ||
      dedupeRepeatedYear([explicitYear, explicitMake, model, vehicleMeta?.trim].filter(Boolean).join(" ")),
    bodyType: inferBodyType(model, undefined, rowValue(row, mapping.bodyType)),
    offerType,
    headline: headlineLine || model || "Available offer",
    details,
    disclaimer: String(rowValue(row, mapping.disclaimer)),
    imageUrl,
    heroImageFit: imageUrl ? "cover" : undefined,
    ctaUrl,
    active: normalizeActive(rowValue(row, mapping.active))
  } satisfies NormalizedOffer;
}

function rowValue(row: Record<string, unknown>, header?: string) {
  if (!header) {
    return "";
  }

  const raw = row[header];

  if (raw == null) {
    return "";
  }

  return String(raw);
}

function normalizeOfferRow(row: Record<string, unknown>, headers: string[]): NormalizedOffer[] {
  const mapping = inferOfferHeaders(headers);
  const offersColumn = cleanText(rowValue(row, mapping.offers));

  if (offersColumn) {
    const splitOffers = splitOfferChunks(offersColumn)
      .map((chunk) => buildOfferFromTextChunk(chunk, row, mapping))
      .filter((offer): offer is NormalizedOffer => offer !== null);

    return splitOffers;
  }

  const model = cleanText(rowValue(row, mapping.model));
  const headline = cleanText(rowValue(row, mapping.headline)) || model;
  const details = cleanText(rowValue(row, mapping.details));
  const disclaimer = String(rowValue(row, mapping.disclaimer));
  const explicitYear = Number.parseInt(cleanText(rowValue(row, mapping.year)), 10);
  const explicitMake = cleanText(rowValue(row, mapping.make));
  const explicitVehicleTitle = cleanText(rowValue(row, mapping.vehicleTitle));
  const explicitImageUrl = cleanText(rowValue(row, mapping.imageUrl));
  const explicitCtaUrl = cleanText(rowValue(row, mapping.ctaUrl));
  const discoveredUrls = [
    ...extractUrls(headline),
    ...extractUrls(details)
  ];
  const { imageUrl, ctaUrl } = resolveOfferLinks(
    explicitImageUrl,
    explicitCtaUrl,
    discoveredUrls
  );
  const vehicleMeta = extractVehicleMeta(`${headline} ${details}`, {
    explicitYear: Number.isFinite(explicitYear) ? explicitYear : undefined,
    explicitMake,
    explicitModel: model,
    explicitVehicleTitle
  });

  if (!headline && !details) {
    return [];
  }

  return [
    {
      year: Number.isFinite(explicitYear) ? explicitYear : vehicleMeta?.year,
      make: explicitMake || vehicleMeta?.make || "",
      brand: explicitMake || vehicleMeta?.brand || "",
      model: cleanText(vehicleMeta?.model) || model,
      trim: vehicleMeta?.trim || "",
      vehicleTitle:
        vehicleMeta?.vehicleTitle ||
        dedupeRepeatedYear([explicitYear, explicitMake, model, vehicleMeta?.trim].filter(Boolean).join(" ")),
      vehicleLabel:
        vehicleMeta?.vehicleLabel ||
        dedupeRepeatedYear([explicitYear, explicitMake, model, vehicleMeta?.trim].filter(Boolean).join(" ")),
      bodyType: inferBodyType(cleanText(vehicleMeta?.model) || model, undefined, rowValue(row, mapping.bodyType)),
      offerType: normalizeOfferType(rowValue(row, mapping.offerType) || `${headline} ${details}`),
      headline: sanitizeOfferHeadline(headline || "Offer available", vehicleMeta?.vehicleTitle),
      details,
      disclaimer,
      imageUrl,
      heroImageFit: imageUrl ? "cover" : undefined,
      ctaUrl,
      active: normalizeActive(rowValue(row, mapping.active))
    }
  ];
}

export function parseOfferCsv(text: string) {
  const workbook = XLSX.read(text, { type: "string" });
  return parseOfferWorkbook(workbook);
}

export function parseOfferWorkbookInput(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" });
  return parseOfferWorkbook(workbook);
}

function parseOfferWorkbook(workbook: XLSX.WorkBook) {
  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    return [];
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: ""
  });
  const headers = Object.keys(rows[0] ?? {});

  return rows.flatMap((row) => normalizeOfferRow(row, headers));
}

function extractDisclaimer(lines: string[]) {
  return lines.filter((line) =>
    /\b(disclaimer|apr|plus tax|with approved credit|see dealer|expires|offer|payments?)\b/i.test(line)
  );
}

function extractDocxTableRows(html: string) {
  const rowMatches = html.match(/<tr[\s\S]*?<\/tr>/gi) ?? [];

  return rowMatches
    .map((rowHtml) => {
      const cells = rowHtml.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) ?? [];
      return cells.map((cell) =>
        stripHtml(
          cell
            .replace(/^<t[dh][^>]*>/i, "")
            .replace(/<\/t[dh]>$/i, "")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/p>/gi, "\n")
            .replace(/<\/div>/gi, "\n"),
          true
        )
      );
    })
    .filter((cells) => cells.length >= 3);
}

function buildDocxOfferFromRow(offersText: string, disclaimer: string, vdpUrls: string[] = []) {
  const offerLines = splitOfferLines(offersText);
  const vehicleLineIndex = offerLines.findIndex(isVehicleDescriptorLine);
  const vehicleLine = vehicleLineIndex >= 0 ? offerLines[vehicleLineIndex] : "";
  const nonVehicleLines = offerLines.filter((_, index) => index !== vehicleLineIndex);
  const flattenedOffers = cleanText(nonVehicleLines.join(" "))
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\s+\bOR\b\s+/gi, " OR ");

  const vehicleMeta = extractVehicleMeta(vehicleLine || offersText);
  const model = cleanText(vehicleMeta?.model) || inferModelFromText(vehicleLine || offersText, vehicleMeta?.model);
  const bodyType = inferBodyType(model, vehicleMeta?.make);
  const withoutVehicleIntro = cleanText(
    vehicleMeta?.vehicleTitle
      ? flattenedOffers.replace(new RegExp(`^${vehicleMeta.vehicleTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*`, "i"), "")
      : flattenedOffers
  );
  const withoutModel = cleanText(removeVehicleTitleFromText(withoutVehicleIntro, vehicleMeta?.vehicleTitle));

  if (!withoutModel || isInvalidOfferText(model)) {
    return [];
  }

  const chunks = withoutModel.includes(" OR ")
    ? withoutModel.split(/\s+OR\s+/i).map((chunk) => cleanText(chunk))
    : [withoutModel];

  return chunks
    .map<NormalizedOffer | null>((chunk) => {
      if (!chunk) {
        return null;
      }

      const offerType = normalizeOfferType(chunk);
      const headline = sanitizeOfferHeadline(
        chunk.match(
          /(Lease for \$[^.]+\/mo|\d+(?:\.\d+)?%\s*APR[^.]*|(?:Total|Customer|Bonus)\s+Cash[^.]*|MSRP[^]*$|Piemonte Price[^]*$)/i
        )?.[0] ?? chunk,
        vehicleMeta?.vehicleTitle
      );
      const details = cleanText(chunk) || headline;

      if (isInvalidOfferText(headline)) {
        return null;
      }

      const chunkUrls = [...vdpUrls, ...extractUrls(chunk)];
      const imageUrl = vdpUrls.find(isValidImageUrl) || chunkUrls.find(isValidImageUrl) || "";
      const ctaUrl =
        vdpUrls.find((url) => !isValidImageUrl(url)) ||
        chunkUrls.find((url) => !isValidImageUrl(url)) ||
        "";

      return {
        year: vehicleMeta?.year,
        make: vehicleMeta?.make || "",
        brand: vehicleMeta?.brand || "",
        model,
        trim: vehicleMeta?.trim || "",
        vehicleTitle: vehicleMeta?.vehicleTitle || model,
        vehicleLabel: vehicleMeta?.vehicleLabel || model,
        bodyType,
        offerType,
        headline: headline || `${model} offer`,
        details,
        disclaimer: disclaimer.trim(),
        imageUrl,
        heroImageFit: imageUrl ? "cover" : undefined,
        ctaUrl,
        active: true
      };
    })
    .filter((offer): offer is NormalizedOffer => Boolean(offer));
}

export async function parseOfferDocxInput(buffer: ArrayBuffer) {
  const htmlResult = await mammoth.convertToHtml({
    buffer: Buffer.from(buffer)
  });

  const tableRows = extractDocxTableRows(htmlResult.value);
  const tableOffers = tableRows.flatMap((cells) => {
    const [medium = "", offersText = "", disclaimer = "", vdpImageLink = ""] = cells;
    const vdpUrls = extractUrls(vdpImageLink);
    const mediumCompact = compact(medium);
    const offersCompact = compact(offersText);
    const disclaimerCompact = compact(disclaimer);
    const imageCompact = compact(vdpImageLink);

    if (
      isInvalidOfferText(offersText) ||
      isInvalidOfferText(medium) && compact(offersText) === "offers"
    ) {
      return [];
    }

    if (mediumCompact === "medium" && offersCompact === "offers" && disclaimerCompact === "disclaimer") {
      return [];
    }

    if (
      mediumCompact === "medium" ||
      (offersCompact.endsWith("offers") &&
        ["disclaimer", "fineprint", "legal", "terms"].includes(disclaimerCompact) &&
        imageCompact.startsWith("vdpimage"))
    ) {
      return [];
    }

    return buildDocxOfferFromRow(offersText, disclaimer, vdpUrls);
  });

  if (tableOffers.length > 0) {
    return tableOffers;
  }

  const textResult = await mammoth.extractRawText({
    buffer: Buffer.from(buffer)
  });
  const blocks = textResult.value
    .split(/\n\s*\n/)
    .map((block) =>
      block
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
    )
    .filter((lines) => lines.length > 0);

  return blocks
    .map<NormalizedOffer | null>((lines) => {
      const rawHeadline = cleanText(lines[0] ?? "");
      const detailsLines = lines.slice(1);
      const disclaimerLines = extractDisclaimer(detailsLines);
      const disclaimer = cleanText(disclaimerLines.join("\n"));
      const details = cleanText(detailsLines.filter((line) => !disclaimerLines.includes(line)).join(" "));
      const sourceText = `${rawHeadline} ${details}`;
      const vehicleMeta = extractVehicleMeta(sourceText);
      const headline = sanitizeOfferHeadline(rawHeadline, vehicleMeta?.vehicleTitle);
      const model = cleanText(vehicleMeta?.model) || inferModelFromText(sourceText, vehicleMeta?.model || headline);
      const discoveredUrls = extractUrls(sourceText);

      if (!headline && !details) {
        return null;
      }

      if (isInvalidOfferText(headline) || isInvalidOfferText(model)) {
        return null;
      }

      return {
        year: vehicleMeta?.year,
        make: vehicleMeta?.make || "",
        brand: vehicleMeta?.brand || "",
        model,
        trim: vehicleMeta?.trim || "",
        vehicleTitle: vehicleMeta?.vehicleTitle || model,
        vehicleLabel: vehicleMeta?.vehicleLabel || model,
        bodyType: inferBodyType(model, vehicleMeta?.make),
        offerType: normalizeOfferType(`${headline} ${details}`),
        headline,
        details,
        disclaimer,
        imageUrl: discoveredUrls.find(isValidImageUrl) || "",
        heroImageFit: discoveredUrls.find(isValidImageUrl) ? "cover" : undefined,
        ctaUrl: discoveredUrls.find((url) => !isValidImageUrl(url)) || "",
        active: true
      };
    })
    .filter((offer): offer is NormalizedOffer => Boolean(offer));
}

export function detectOfferSourceType(fileName: string, mimeType?: string) {
  const lowerName = fileName.toLowerCase();
  const lowerMime = mimeType?.toLowerCase() ?? "";

  if (lowerName.endsWith(".docx") || lowerMime.includes("wordprocessingml")) {
    return "docx";
  }

  if (
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".xls") ||
    lowerMime.includes("spreadsheetml") ||
    lowerMime.includes("excel")
  ) {
    return "xlsx";
  }

  return "csv";
}

export function buildGoogleDriveDownload(url: string) {
  try {
    const parsed = new URL(url);

    if (!/google\./.test(parsed.hostname)) {
      return null;
    }

    const documentMatch = parsed.pathname.match(/\/document\/d\/([^/]+)/);

    if (documentMatch) {
      const id = documentMatch[1];
      return {
        url: `https://docs.google.com/document/d/${id}/export?format=docx`,
        fileName: `${id}.docx`
      };
    }

    const sheetMatch = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);

    if (sheetMatch) {
      const id = sheetMatch[1];
      return {
        url: `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`,
        fileName: `${id}.xlsx`
      };
    }

    const fileMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);

    if (fileMatch) {
      const id = fileMatch[1];
      return {
        url: `https://drive.google.com/uc?export=download&id=${id}`,
        fileName: `${id}`
      };
    }

    return null;
  } catch {
    return null;
  }
}

export async function parseOffersByType(
  buffer: ArrayBuffer,
  fileName: string,
  mimeType?: string
): Promise<NormalizedOffer[]> {
  const sourceType = detectOfferSourceType(fileName, mimeType);

  if (sourceType === "docx") {
    return parseOfferDocxInput(buffer);
  }

  if (sourceType === "xlsx") {
    return parseOfferWorkbookInput(buffer);
  }

  return parseOfferCsv(Buffer.from(buffer).toString("utf8"));
}
