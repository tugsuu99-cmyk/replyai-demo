export type AutomakerPalette = {
  brand: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
};

export const automakerPalettes: AutomakerPalette[] = [
  { brand: "Acura", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#9ca3af" },
  { brand: "Audi", primaryColor: "#bb0a30", secondaryColor: "#111827", accentColor: "#f8fafc" },
  { brand: "BMW", primaryColor: "#0066b1", secondaryColor: "#111827", accentColor: "#f3f4f6" },
  { brand: "Buick", primaryColor: "#7f1d1d", secondaryColor: "#111827", accentColor: "#d1d5db" },
  { brand: "Cadillac", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#c9a646" },
  { brand: "Chevrolet", primaryColor: "#f6b000", secondaryColor: "#111827", accentColor: "#ffffff" },
  { brand: "Chrysler", primaryColor: "#1d4ed8", secondaryColor: "#111827", accentColor: "#dbeafe" },
  { brand: "Dodge", primaryColor: "#b91c1c", secondaryColor: "#111827", accentColor: "#f8fafc" },
  { brand: "Ford", primaryColor: "#003478", secondaryColor: "#ffffff", accentColor: "#2f80ed" },
  { brand: "Genesis", primaryColor: "#111827", secondaryColor: "#f5f0e6", accentColor: "#b08968" },
  { brand: "GMC", primaryColor: "#c8102e", secondaryColor: "#111827", accentColor: "#f8fafc" },
  { brand: "Honda", primaryColor: "#cc0000", secondaryColor: "#111827", accentColor: "#ffffff" },
  { brand: "Hyundai", primaryColor: "#002c5f", secondaryColor: "#f8fafc", accentColor: "#7aa6c2" },
  { brand: "Infiniti", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#9ca3af" },
  { brand: "Jaguar", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#0f766e" },
  { brand: "Jeep", primaryColor: "#4b5320", secondaryColor: "#111827", accentColor: "#d8c690" },
  { brand: "Kia", primaryColor: "#05141f", secondaryColor: "#ffffff", accentColor: "#c41230" },
  { brand: "Land Rover", primaryColor: "#005a2b", secondaryColor: "#111827", accentColor: "#ffffff" },
  { brand: "Lexus", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#a3a3a3" },
  { brand: "Lincoln", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#bda56d" },
  { brand: "Mazda", primaryColor: "#101820", secondaryColor: "#ffffff", accentColor: "#b91c1c" },
  { brand: "Mercedes-Benz", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#9ca3af" },
  { brand: "MINI", primaryColor: "#111827", secondaryColor: "#ffffff", accentColor: "#16a34a" },
  { brand: "Mitsubishi", primaryColor: "#ed0000", secondaryColor: "#111827", accentColor: "#ffffff" },
  { brand: "Nissan", primaryColor: "#c3002f", secondaryColor: "#111827", accentColor: "#f8fafc" },
  { brand: "Porsche", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#d4af37" },
  { brand: "Ram", primaryColor: "#111827", secondaryColor: "#f8fafc", accentColor: "#a3a3a3" },
  { brand: "Subaru", primaryColor: "#003399", secondaryColor: "#f8fafc", accentColor: "#facc15" },
  { brand: "Tesla", primaryColor: "#cc0000", secondaryColor: "#111827", accentColor: "#ffffff" },
  { brand: "Toyota", primaryColor: "#eb0a1e", secondaryColor: "#111827", accentColor: "#ffffff" },
  { brand: "Volkswagen", primaryColor: "#001e50", secondaryColor: "#ffffff", accentColor: "#00b0f0" },
  { brand: "Volvo", primaryColor: "#003057", secondaryColor: "#ffffff", accentColor: "#7aa6c2" }
];

export function findAutomakerPalette(brand: string) {
  return automakerPalettes.find((palette) => palette.brand.toLowerCase() === brand.toLowerCase());
}
