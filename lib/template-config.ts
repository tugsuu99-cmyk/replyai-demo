import type { EmailType } from "@/lib/rules";

export type HeadlineStyle = {
  color: string;
  fontSize: number;
  lineHeight: number;
  fontWeight: number;
};

export type HeroStyle = {
  height: number;
  backgroundColor: string;
};

export type EmailTypeTemplateConfig = {
  headlineStyle: HeadlineStyle;
  heroStyle: HeroStyle;
  heroEyebrow: string;
  heroTitle: string;
  ctaLabel: string;
  supportText: string;
  showSignatureBlock: boolean;
};

export type EmailShellConfig = {
  outerBackground: string;
  shellBackground: string;
  shellBorder: string;
  shellWidth: number;
  outerPadding: number;
  headerPadding: string;
  contentPadding: string;
  bodyColor: string;
  bodyFontSize: number;
  bodyLineHeight: number;
  footerBackground: string;
};

export const emailShellConfig: EmailShellConfig = {
  outerBackground: "#f1f5f9",
  shellBackground: "#ffffff",
  shellBorder: "#e2e8f0",
  shellWidth: 640,
  outerPadding: 12,
  headerPadding: "22px 24px 18px",
  contentPadding: "20px 24px 4px",
  bodyColor: "#334155",
  bodyFontSize: 15,
  bodyLineHeight: 1.48,
  footerBackground: "#0f172a"
};

const defaultHeadlineStyle: HeadlineStyle = {
  color: "#0f172a",
  fontSize: 24,
  lineHeight: 1.2,
  fontWeight: 700
};

export const emailTypeTemplateConfig: Record<EmailType, EmailTypeTemplateConfig> = {
  trade: {
    headlineStyle: { ...defaultHeadlineStyle, color: "#0f172a" },
    heroStyle: { height: 252, backgroundColor: "#064e3b" },
    heroEyebrow: "Vehicle value check",
    heroTitle: "See where your trade stands",
    ctaLabel: "Check trade options",
    supportText: "Takes less than 2 minutes",
    showSignatureBlock: true
  },
  service: {
    headlineStyle: { ...defaultHeadlineStyle, color: "#0f172a" },
    heroStyle: { height: 252, backgroundColor: "#9a3412" },
    heroEyebrow: "Service follow-up",
    heroTitle: "Keep your vehicle on track",
    ctaLabel: "Schedule service",
    supportText: "Quick appointment help",
    showSignatureBlock: true
  },
  lease: {
    headlineStyle: { ...defaultHeadlineStyle, color: "#0f172a" },
    heroStyle: { height: 252, backgroundColor: "#1e40af" },
    heroEyebrow: "Lease timing",
    heroTitle: "Review your next options",
    ctaLabel: "Review lease options",
    supportText: "Simple next-step review",
    showSignatureBlock: true
  },
  general: {
    headlineStyle: defaultHeadlineStyle,
    heroStyle: { height: 252, backgroundColor: "#334155" },
    heroEyebrow: "Quick check-in",
    heroTitle: "A quick note from our team",
    ctaLabel: "Get in touch",
    supportText: "A quick reply is all it takes",
    showSignatureBlock: true
  }
};
