import type { EmailType } from "@/lib/rules";

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

export function selectHeroImage(
  emailType: EmailType,
  usedHeroUrls: string[] = [],
  heroOverrides: HeroOverrides = {}
) {
  const heroes = [...(heroOverrides[emailType] ?? []), ...heroLibrary[emailType]].filter(Boolean);

  if (heroes.length === 0) {
    return "";
  }

  // Prefer images not already used in this generation run, then rotate back
  // through the campaign library once every option has appeared.
  const availableHeroes = heroes.filter((hero) => !usedHeroUrls.includes(hero));
  const mostRecentHero = usedHeroUrls[usedHeroUrls.length - 1];
  const fallbackPool = heroes.length > 1 ? heroes.filter((hero) => hero !== mostRecentHero) : heroes;
  const pool = availableHeroes.length > 0 ? availableHeroes : fallbackPool;
  const randomIndex = Math.floor(Math.random() * pool.length);

  return pool[randomIndex];
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
