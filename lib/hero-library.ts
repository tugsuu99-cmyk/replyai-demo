import { inferBodyType, type BodyType } from "@/lib/body-type";
import type { EmailType } from "@/lib/rules";
import type { NormalizedCustomer } from "@/lib/normalize";
import type { NormalizedOffer } from "@/lib/offer-matching";

export type HeroOverrides = Partial<Record<EmailType, string[]>>;

export const HERO_OVERRIDES_STORAGE_KEY = "bdc-email-hero-overrides";

export const heroLibrary: Record<EmailType, string[]> = {
  // Shared defaults keep the preview polished even before a client uploads
  // their own hero set. These should stay realistic and automotive-focused.
  trade: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80"
  ],
  service: [
    "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1511919884226-fd3cad34687c?auto=format&fit=crop&w=1400&q=80"
  ],
  lease: [
    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1503736334956-4c8f8e92946d?auto=format&fit=crop&w=1400&q=80"
  ],
  general: [
    "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=80"
  ]
};

const bodyTypeHeroLibrary: Record<Exclude<BodyType, "Unknown">, string[]> = {
  SUV: [
    "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80"
  ],
  Truck: [
    "https://images.unsplash.com/photo-1542282088-fe8426682b8f?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1606016159991-78b4f3d55306?auto=format&fit=crop&w=1400&q=80"
  ],
  Sedan: [
    "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1400&q=80"
  ],
  Van: [
    "https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=1400&q=80"
  ],
  EV: [
    "https://images.unsplash.com/photo-1593941707882-a5bac6861d75?auto=format&fit=crop&w=1400&q=80",
    "https://images.unsplash.com/photo-1617788138017-80ad40651399?auto=format&fit=crop&w=1400&q=80"
  ]
};

function selectFromPool(heroes: string[], usedHeroUrls: string[] = []) {
  const filteredHeroes = heroes.filter(Boolean);

  if (filteredHeroes.length === 0) {
    return "";
  }

  // Prefer images not already used in this generation run, then rotate back
  // through the campaign library once every option has appeared.
  const availableHeroes = filteredHeroes.filter((hero) => !usedHeroUrls.includes(hero));
  const mostRecentHero = usedHeroUrls[usedHeroUrls.length - 1];
  const fallbackPool =
    filteredHeroes.length > 1
      ? filteredHeroes.filter((hero) => hero !== mostRecentHero)
      : filteredHeroes;
  const pool = availableHeroes.length > 0 ? availableHeroes : fallbackPool;
  const randomIndex = Math.floor(Math.random() * pool.length);

  return pool[randomIndex];
}

function resolveCustomerBodyType(
  customer: Pick<NormalizedCustomer, "bodyType" | "model" | "make" | "matchedOffer"> & {
    matchedOffer?: NormalizedOffer | null;
  }
) {
  if (customer.matchedOffer?.bodyType && customer.matchedOffer.bodyType !== "Unknown") {
    return customer.matchedOffer.bodyType;
  }

  return customer.bodyType ?? inferBodyType(customer.model, customer.make);
}

export function selectHeroImageForCustomer(
  customer: Pick<NormalizedCustomer, "emailType" | "bodyType" | "model" | "make" | "matchedOffer"> & {
    matchedOffer?: NormalizedOffer | null;
  },
  usedHeroUrls: string[] = [],
  heroOverrides: HeroOverrides = {}
) {
  if (customer.matchedOffer?.imageUrl) {
    return customer.matchedOffer.imageUrl;
  }

  const customHeroes = heroOverrides[customer.emailType] ?? [];

  if (customHeroes.length > 0) {
    return selectFromPool(customHeroes, usedHeroUrls);
  }

  const resolvedBodyType = resolveCustomerBodyType(customer);

  if (resolvedBodyType !== "Unknown") {
    return selectFromPool(bodyTypeHeroLibrary[resolvedBodyType], usedHeroUrls);
  }

  return selectFromPool(heroLibrary[customer.emailType], usedHeroUrls);
}

export function selectHeroImage(
  emailType: EmailType,
  usedHeroUrls: string[] = [],
  heroOverrides: HeroOverrides = {}
) {
  return selectFromPool([...(heroOverrides[emailType] ?? []), ...heroLibrary[emailType]], usedHeroUrls);
}

export function loadHeroOverrides(): HeroOverrides {
  if (typeof window === "undefined") {
    return {};
  }

  const storedValue = window.localStorage.getItem(HERO_OVERRIDES_STORAGE_KEY);

  if (!storedValue) {
    return {};
  }

  try {
    return JSON.parse(storedValue) as HeroOverrides;
  } catch {
    return {};
  }
}

export function saveHeroOverrides(overrides: HeroOverrides) {
  window.localStorage.setItem(HERO_OVERRIDES_STORAGE_KEY, JSON.stringify(overrides));
}
