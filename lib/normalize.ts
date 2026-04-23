import type { CsvRow } from "@/lib/csv";
import { getEmailType, type EmailType } from "@/lib/rules";

export type FieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "year"
  | "make"
  | "model"
  | "mileage"
  | "leaseEndDate"
  | "lastServiceDate"
  | "tradeValue";

export type ColumnMapping = Partial<Record<FieldKey, string>>;
export type CustomerContextFields = Record<string, string>;

export type NormalizedCustomer = {
  id: string;
  clientId?: string;
  firstName: string;
  lastName?: string;
  email: string;
  year?: number;
  make?: string;
  model?: string;
  mileage?: number;
  leaseEndDate?: string;
  lastServiceDate?: string;
  tradeValue?: number;
  emailType: EmailType;
  subject?: string;
  headline?: string;
  emailBody?: string;
  ctaLine?: string;
  heroImageUrl?: string;
  customContext?: CustomerContextFields;
  generationStatus?: "idle" | "loading" | "success" | "error";
  generationError?: string;
};

export const FIELD_LABELS: Record<FieldKey, string> = {
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  year: "Year",
  make: "Make",
  model: "Model",
  mileage: "Mileage",
  leaseEndDate: "Lease end date",
  lastServiceDate: "Last service date",
  tradeValue: "Trade value"
};

export const REQUIRED_FIELDS = new Set<FieldKey>(["firstName", "email"]);

export const FIELD_KEYS = Object.keys(FIELD_LABELS) as FieldKey[];

const FIELD_SYNONYMS: Record<FieldKey, string[]> = {
  firstName: [
    "first",
    "first name",
    "firstname",
    "first_name",
    "fname",
    "customer first name",
    "given name"
  ],
  lastName: [
    "last",
    "last name",
    "lastname",
    "last_name",
    "lname",
    "customer last name",
    "surname",
    "family name"
  ],
  email: ["email", "email address", "emailaddress", "email_address", "customer email", "e-mail"],
  year: ["year", "vehicle year", "vehicleyear", "model year", "modelyear", "veh year"],
  make: ["make", "vehicle make", "vehiclemake", "veh make"],
  model: ["model", "vehicle model", "vehiclemodel", "veh model"],
  mileage: ["mileage", "miles", "odometer", "odo", "vehicle mileage"],
  leaseEndDate: [
    "lease end",
    "lease end date",
    "lease_end_date",
    "lease expiration",
    "lease expiry",
    "maturity date"
  ],
  lastServiceDate: [
    "service date",
    "last service",
    "last service date",
    "last_service_date",
    "ro date",
    "repair order date"
  ],
  tradeValue: [
    "trade value",
    "trade_value",
    "estimated trade",
    "estimated trade value",
    "appraisal value",
    "equity"
  ]
};

function compact(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeText(value?: string) {
  const cleaned = value?.trim().replace(/\s+/g, " ");
  return cleaned || undefined;
}

function normalizeName(value?: string) {
  return normalizeText(value)?.replace(/[^a-zA-Z'\-\s]/g, "");
}

function normalizeEmail(value?: string) {
  const email = normalizeText(value)?.toLowerCase();
  return email && email.includes("@") ? email : email || "";
}

function normalizeNumber(value?: string) {
  const cleaned = value?.replace(/[$,\s]/g, "").trim();

  if (!cleaned) {
    return undefined;
  }

  const number = Number(cleaned);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeInteger(value?: string) {
  const number = normalizeNumber(value);
  return typeof number === "number" ? Math.round(number) : undefined;
}

function normalizeDate(value?: string) {
  const cleaned = normalizeText(value);

  if (!cleaned) {
    return undefined;
  }

  const date = new Date(cleaned);

  if (Number.isNaN(date.getTime())) {
    return cleaned;
  }

  return date.toISOString().slice(0, 10);
}

function splitName(name?: string) {
  const parts = normalizeName(name)?.split(" ").filter(Boolean) ?? [];

  return {
    firstName: parts[0],
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : undefined
  };
}

function mappedValue(row: CsvRow, mapping: ColumnMapping, field: FieldKey) {
  const header = mapping[field];
  return header ? row[header] : undefined;
}

function scoreHeaderForField(header: string, field: FieldKey) {
  const headerCompact = compact(header);

  return FIELD_SYNONYMS[field].reduce((bestScore, synonym) => {
    const synonymCompact = compact(synonym);

    if (headerCompact === synonymCompact) {
      return Math.max(bestScore, 100);
    }

    if (headerCompact.endsWith(synonymCompact) || headerCompact.startsWith(synonymCompact)) {
      return Math.max(bestScore, 80);
    }

    if (headerCompact.includes(synonymCompact)) {
      return Math.max(bestScore, 65);
    }

    return bestScore;
  }, 0);
}

export function inferColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const usedHeaders = new Set<string>();

  // Each normalized field competes for the best available CSV header. Keeping
  // this logic here makes future DMS-specific synonyms easy to add without
  // changing component code.
  for (const field of FIELD_KEYS) {
    const bestMatch = headers
      .filter((header) => !usedHeaders.has(header))
      .map((header) => ({ header, score: scoreHeaderForField(header, field) }))
      .sort((a, b) => b.score - a.score)[0];

    if (bestMatch && bestMatch.score >= 65) {
      mapping[field] = bestMatch.header;
      usedHeaders.add(bestMatch.header);
    }
  }

  return mapping;
}

export function getIgnoredHeaders(headers: string[], mapping: ColumnMapping, includedHeaders: string[] = []) {
  const mappedHeaders = new Set(Object.values(mapping).filter(Boolean));
  const includedHeaderSet = new Set(includedHeaders);
  return headers.filter((header) => !mappedHeaders.has(header) && !includedHeaderSet.has(header));
}

export function normalizeCustomer(
  row: CsvRow,
  mapping: ColumnMapping,
  index: number,
  includedHeaders: string[] = []
): NormalizedCustomer {
  const mappedFirstName = mappedValue(row, mapping, "firstName");
  const splitMappedName = splitName(mappedFirstName);
  const firstName = splitMappedName.firstName || "";
  const lastName = normalizeName(mappedValue(row, mapping, "lastName")) || splitMappedName.lastName;
  const customContext = Object.fromEntries(
    includedHeaders
      .map((header) => [header, normalizeText(row[header])])
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
  );
  const customerWithoutType = {
    id: `customer-${index + 1}`,
    firstName,
    lastName,
    email: normalizeEmail(mappedValue(row, mapping, "email")),
    year: normalizeInteger(mappedValue(row, mapping, "year")),
    make: normalizeText(mappedValue(row, mapping, "make")),
    model: normalizeText(mappedValue(row, mapping, "model")),
    mileage: normalizeInteger(mappedValue(row, mapping, "mileage")),
    leaseEndDate: normalizeDate(mappedValue(row, mapping, "leaseEndDate")),
    lastServiceDate: normalizeDate(mappedValue(row, mapping, "lastServiceDate")),
    tradeValue: normalizeNumber(mappedValue(row, mapping, "tradeValue")),
    customContext: Object.keys(customContext).length > 0 ? customContext : undefined
  };

  return {
    ...customerWithoutType,
    emailType: getEmailType(customerWithoutType)
  };
}

export function normalizeCustomers(rows: CsvRow[], mapping: ColumnMapping, includedHeaders: string[] = []) {
  return rows.map((row, index) => normalizeCustomer(row, mapping, index, includedHeaders));
}
