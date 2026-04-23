export type BrandConfig = {
  storeName: string;
  logoUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  ctaUrl: string;
  phone: string;
  address: string;
  website: string;
  senderName: string;
  senderTitle: string;
  footerText: string;
};

function svgDataUri(svg: string) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const logoSvg = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="80" viewBox="0 0 320 80">
  <rect width="320" height="80" rx="8" fill="#0f766e"/>
  <text x="28" y="50" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="#ffffff">Your Dealership</text>
</svg>`);

export const defaultBrandConfig: BrandConfig = {
  storeName: "Your Dealership",
  logoUrl: logoSvg,
  primaryColor: "#0f766e",
  secondaryColor: "#0f172a",
  accentColor: "#14b8a6",
  ctaUrl: "https://example.com",
  phone: "(555) 123-4567",
  address: "123 Main Street, Your City, ST 12345",
  website: "example.com",
  senderName: "Alex from Your Dealership",
  senderTitle: "BDC Manager",
  footerText: "You are receiving this because you previously worked with our dealership."
};
