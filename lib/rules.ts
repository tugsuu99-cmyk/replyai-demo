import type { NormalizedCustomer } from "@/lib/normalize";

export type EmailType = "trade" | "service" | "lease" | "general";

export const EMAIL_TYPES: EmailType[] = ["trade", "service", "lease", "general"];

type RuleCustomer = Pick<
  NormalizedCustomer,
  "mileage" | "leaseEndDate" | "lastServiceDate"
>;

function parseSafeDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function addMonths(date: Date, months: number) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate;
}

function isWithinNextMonths(value: string | undefined, months: number, referenceDate: Date) {
  const date = parseSafeDate(value);

  if (!date) {
    return false;
  }

  return date >= referenceDate && date <= addMonths(referenceDate, months);
}

function isMissingOrOlderThanMonths(value: string | undefined, months: number, referenceDate: Date) {
  const date = parseSafeDate(value);

  if (!date) {
    return true;
  }

  return date < addMonths(referenceDate, -months);
}

export function hasTradeTrigger(customer: Pick<NormalizedCustomer, "mileage">) {
  return typeof customer.mileage === "number" && customer.mileage > 70000;
}

export function hasLeaseTrigger(
  customer: Pick<NormalizedCustomer, "leaseEndDate">,
  referenceDate = new Date()
) {
  return isWithinNextMonths(customer.leaseEndDate, 6, referenceDate);
}

export function hasServiceTrigger(
  customer: Pick<NormalizedCustomer, "lastServiceDate">,
  referenceDate = new Date()
) {
  return isMissingOrOlderThanMonths(customer.lastServiceDate, 6, referenceDate);
}

export function getEmailType(customer: RuleCustomer, referenceDate = new Date()): EmailType {
  // Rule order matters. Put the strongest and most specific outreach reasons
  // first, then let lower-priority follow-up categories catch the rest.
  if (hasTradeTrigger(customer)) {
    return "trade";
  }

  if (hasLeaseTrigger(customer, referenceDate)) {
    return "lease";
  }

  if (hasServiceTrigger(customer, referenceDate)) {
    return "service";
  }

  return "general";
}

export function emailTypeLabel(type: EmailType) {
  const labels: Record<EmailType, string> = {
    trade: "Trade",
    service: "Service",
    lease: "Lease",
    general: "General"
  };

  return labels[type];
}
