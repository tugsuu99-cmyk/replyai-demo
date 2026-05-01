import type { BrandConfig } from "@/lib/brand-config";
import type { NormalizedCustomer } from "@/lib/normalize";
import type { EmailShellConfig, EmailTypeTemplateConfig } from "@/lib/template-config";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function bodyParagraphs(body: string, shellConfig: EmailShellConfig) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;font-size:${shellConfig.bodyFontSize}px;line-height:${shellConfig.bodyLineHeight};color:${shellConfig.bodyColor};">${escapeHtml(
          paragraph
        ).replaceAll("\n", "<br />")}</p>`
    )
    .join("");
}

function expandHexColor(color: string) {
  const trimmed = color.trim();

  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(trimmed)) {
    return null;
  }

  if (trimmed.length === 4) {
    return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`;
  }

  return trimmed;
}

function toRgb(color: string) {
  const hex = expandHexColor(color);

  if (!hex) {
    return null;
  }

  return {
    r: Number.parseInt(hex.slice(1, 3), 16),
    g: Number.parseInt(hex.slice(3, 5), 16),
    b: Number.parseInt(hex.slice(5, 7), 16)
  };
}

function isDarkColor(color: string) {
  const rgb = toRgb(color);

  if (!rgb) {
    return false;
  }

  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance < 0.42;
}

function mixColors(baseColor: string, overlayColor: string, overlayWeight: number) {
  const base = toRgb(baseColor);
  const overlay = toRgb(overlayColor);

  if (!base || !overlay) {
    return baseColor;
  }

  const weight = Math.min(1, Math.max(0, overlayWeight));
  const mixChannel = (baseChannel: number, overlayChannel: number) =>
    Math.round(baseChannel * (1 - weight) + overlayChannel * weight);

  return `rgb(${mixChannel(base.r, overlay.r)}, ${mixChannel(base.g, overlay.g)}, ${mixChannel(base.b, overlay.b)})`;
}

export function toTitleCase(value: string) {
  return value.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

function isValidHeroImageUrl(url?: string) {
  return Boolean(url && /^https?:\/\/.+\.(?:png|jpe?g|webp)(?:\?.*)?$/i.test(url));
}

function stripOfferWording(value: string) {
  return value
    .replace(
      /\s+(?:Lease\s+for|Purchase\s+for|Finance\s+for|\d+(?:\.\d+)?%\s*APR.*|APR.*|MSRP.*|Piemonte Price.*|Bonus Cash.*|Customer Cash.*|Total Cash.*)$/i,
      ""
    )
    .trim();
}

function sanitizeCtaLineToAction(ctaLine?: string, fallback = "View inventory") {
  const cleaned = ctaLine?.trim();

  if (!cleaned) {
    return fallback;
  }

  if (cleaned.length <= 24 && cleaned.split(/\s+/).length <= 4 && !/[?!.]$/.test(cleaned)) {
    return cleaned;
  }

  if (/detail|learn more|more info/i.test(cleaned)) {
    return "Get details";
  }

  if (/availability|available/i.test(cleaned)) {
    return "Check availability";
  }

  return fallback;
}

function genericHeroTitle(customer: Pick<NormalizedCustomer, "emailType" | "model" | "bodyType">) {
  const bodyTypeLabel =
    customer.bodyType && customer.bodyType !== "Unknown"
      ? customer.bodyType.toLowerCase()
      : "vehicle";

  switch (customer.emailType) {
    case "trade":
      return customer.model ? `A quick look at options for your ${customer.model}` : "A quick look at your next options";
    case "lease":
      return customer.model ? `A quick look at lease options for your ${customer.model}` : "A quick look at lease options";
    case "service":
      return customer.model ? `A quick service follow-up for your ${customer.model}` : "A quick service follow-up";
    case "general":
      return `A quick note about ${bodyTypeLabel} options`;
  }
}

function genericHeroEyebrow(customer: Pick<NormalizedCustomer, "emailType" | "bodyType">, templateConfig: EmailTypeTemplateConfig) {
  if (customer.emailType === "general" && customer.bodyType && customer.bodyType !== "Unknown") {
    return `Currently driving a ${customer.bodyType.toLowerCase()}?`;
  }

  return templateConfig.heroEyebrow;
}

function bodyTypeLabel(customer: Pick<NormalizedCustomer, "bodyType">) {
  if (!customer.bodyType || customer.bodyType === "Unknown") {
    return "vehicle";
  }

  if (customer.bodyType === "SUV" || customer.bodyType === "EV") {
    return customer.bodyType;
  }

  return customer.bodyType.toLowerCase();
}

function withIndefiniteArticle(label: string) {
  if (label === "vehicle") {
    return label;
  }

  return /^[aeiou]/i.test(label) ? `an ${label}` : `a ${label}`;
}

function bodyTypeHeroEyebrow(customer: Pick<NormalizedCustomer, "bodyType">) {
  const label = bodyTypeLabel(customer);

  if (label === "vehicle") {
    return "Worth a quick look";
  }

  return `Currently driving ${withIndefiniteArticle(label)}?`;
}

function bodyTypeHeroTitle(
  customer: Pick<NormalizedCustomer, "emailType" | "bodyType">,
  matchedOffer?: Pick<NonNullable<NormalizedCustomer["matchedOffer"]>, "model"> | null
) {
  const label = bodyTypeLabel(customer);
  const matchedModel = matchedOffer?.model;

  switch (customer.emailType) {
    case "trade":
      return matchedModel
        ? `If another ${label} is on your radar, this ${matchedModel} may be worth a look`
        : `If another ${label} is on your radar, this may be worth a look`;
    case "lease":
      return matchedModel
        ? `If you're open to another ${label}, this ${matchedModel} may be worth a look`
        : `If you're open to another ${label}, this may be worth a look`;
    case "service":
      return `If you're thinking ahead on your next ${label}, this may be worth a look`;
    case "general":
      return matchedModel
        ? `If another ${label} has your attention, this ${matchedModel} may be worth a look`
        : `If another ${label} has your attention, this may be worth a look`;
  }
}

function matchedOfferVehicleTitle(
  matchedOffer?:
    | Pick<NonNullable<NormalizedCustomer["matchedOffer"]>, "vehicleTitle" | "vehicleLabel" | "year" | "make" | "model" | "trim">
    | null
) {
  if (matchedOffer?.vehicleTitle?.trim()) {
    return stripOfferWording(matchedOffer.vehicleTitle.trim());
  }

  if (matchedOffer?.vehicleLabel?.trim()) {
    return stripOfferWording(matchedOffer.vehicleLabel.trim());
  }

  return (
    stripOfferWording(
      [matchedOffer?.year, matchedOffer?.make, matchedOffer?.model, matchedOffer?.trim]
        .filter(Boolean)
        .join(" ")
    ) || "Available offer"
  );
}

function matchedOfferEyebrow(
  matchedOffer?:
    | Pick<NonNullable<NormalizedCustomer["matchedOffer"]>, "vehicleTitle" | "vehicleLabel" | "year" | "make" | "model" | "trim">
    | null
) {
  return matchedOfferVehicleTitle(matchedOffer);
}

function matchedOfferCtaLabel(hasMatchedOffer: boolean, templateConfig: EmailTypeTemplateConfig) {
  if (!hasMatchedOffer) {
    return templateConfig.ctaLabel;
  }

  return "Get in touch";
}

function resolveEmailCtaLabel(
  ctaLine: string | undefined,
  hasMatchedOffer: boolean,
  templateConfig: EmailTypeTemplateConfig
) {
  const fallback = matchedOfferCtaLabel(hasMatchedOffer, templateConfig);
  return sanitizeCtaLineToAction(ctaLine, fallback);
}

export function getEmailCtaLabel(
  customer: Pick<NormalizedCustomer, "ctaLine" | "matchedOffer">,
  templateConfig: EmailTypeTemplateConfig
) {
  return resolveEmailCtaLabel(customer.ctaLine, Boolean(customer.matchedOffer), templateConfig);
}

export function getHeroContent({
  customer,
  templateConfig,
  brandConfig,
  heroImageUrl
}: {
  customer: Pick<NormalizedCustomer, "year" | "make" | "model" | "matchedOffer" | "matchReason" | "emailType" | "bodyType" | "ctaLine">;
  templateConfig: EmailTypeTemplateConfig;
  brandConfig: BrandConfig;
  heroImageUrl?: string;
}) {
  const matchedOffer = customer.matchedOffer;
  const matchReason = customer.matchReason;
  const hasMatchedOffer = Boolean(matchedOffer);
  const heroEyebrow = hasMatchedOffer
    ? matchedOfferEyebrow(matchedOffer)
    : matchReason === "bodyType"
      ? bodyTypeHeroEyebrow(customer)
      : genericHeroEyebrow(customer, templateConfig);
  const heroTitle = hasMatchedOffer
    ? matchedOffer?.headline || toTitleCase(templateConfig.heroTitle)
    : matchReason === "bodyType"
      ? bodyTypeHeroTitle(customer, matchedOffer)
      : genericHeroTitle(customer);
  const heroCtaLabel = getEmailCtaLabel(customer, templateConfig);
  const heroCtaUrl = matchedOffer?.ctaUrl || brandConfig.ctaUrl;
  const effectiveHeroImageUrl = hasMatchedOffer && isValidHeroImageUrl(heroImageUrl) ? heroImageUrl : undefined;
  const heroImageFit = matchedOffer?.heroImageFit || "cover";

  return {
    heroEyebrow,
    heroTitle,
    heroCtaLabel,
    heroCtaUrl,
    supportText: templateConfig.supportText,
    heroImageUrl: effectiveHeroImageUrl,
    heroImageFit,
    matchReason
  };
}

export function getHeroGradient(brandConfig: BrandConfig) {
  const heroBase = expandHexColor(brandConfig.primaryColor) ?? brandConfig.primaryColor;
  const heroTop = isDarkColor(brandConfig.secondaryColor)
    ? brandConfig.secondaryColor
    : mixColors(heroBase, "#000000", 0.72);
  const heroMid = mixColors(heroBase, "#000000", 0.45);

  return `linear-gradient(180deg, ${heroTop} 0%, ${heroMid} 52%, ${heroBase} 100%)`;
}

export function HeroSection({
  customer,
  templateConfig,
  brandConfig,
  heroImageUrl
}: {
  customer: Pick<NormalizedCustomer, "year" | "make" | "model" | "matchedOffer" | "matchReason" | "emailType" | "bodyType" | "ctaLine">;
  templateConfig: EmailTypeTemplateConfig;
  brandConfig: BrandConfig;
  heroImageUrl?: string;
}) {
  const heroGradient = getHeroGradient(brandConfig);
  const {
    heroEyebrow,
    heroTitle,
    heroCtaLabel,
    heroCtaUrl,
    supportText,
    heroImageUrl: resolvedHeroImageUrl,
    heroImageFit
  } = getHeroContent({
    customer,
    templateConfig,
    brandConfig,
    heroImageUrl
  });

  if (resolvedHeroImageUrl) {
    return `<tr>
      <td style="padding:20px 24px 8px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" class="hero-split-table" style="border-radius:16px;overflow:hidden;background:#0f172a;table-layout:fixed;">
          <tr>
            <td width="50%" valign="top" class="hero-split-copy" style="padding:0;background:${brandConfig.primaryColor};color:#ffffff;height:${templateConfig.heroStyle.height}px;">
              <div style="height:${templateConfig.heroStyle.height}px;padding:20px 20px 18px;overflow:hidden;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;">
              <div style="display:flex;flex-direction:column;align-items:flex-start;gap:14px;width:100%;">
              <p style="margin:0;font-size:15px;line-height:1.25;letter-spacing:.05em;color:rgba(255,255,255,.88);font-weight:700;">${escapeHtml(
                heroEyebrow
              )}</p>
              <div style="width:56px;height:2px;background:rgba(255,255,255,.92);"></div>
              <p style="margin:0;font-size:clamp(22px,3.1vw,34px);line-height:1.02;font-weight:800;letter-spacing:.01em;overflow-wrap:anywhere;word-break:break-word;max-width:100%;">${escapeHtml(
                heroTitle
              )}</p>
              </div>
              <a href="${escapeHtml(heroCtaUrl)}" style="display:inline-block;margin-top:16px;width:fit-content;min-width:180px;max-width:280px;background:transparent;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 18px;border-radius:12px;border:1.5px solid rgba(255,255,255,.92);text-align:center;align-self:flex-start;">
                ${escapeHtml(heroCtaLabel)}
              </a>
              </div>
            </td>
            <td width="50%" valign="top" class="hero-split-image" style="background:#e5e7eb;height:${templateConfig.heroStyle.height}px;">
              <img src="${escapeHtml(resolvedHeroImageUrl)}" alt="${escapeHtml(heroEyebrow)}" width="100%" referrerpolicy="no-referrer" style="display:block;width:100%;max-width:100%;height:${templateConfig.heroStyle.height}px;max-height:${templateConfig.heroStyle.height}px;object-fit:${heroImageFit};object-position:center;" />
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
  }

  return `<tr>
    <td style="padding:20px 24px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brandConfig.primaryColor};background-image:${heroGradient};border-radius:16px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:24px 24px 22px;color:#ffffff;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:.04em;color:rgba(255,255,255,.82);font-weight:700;">${escapeHtml(
              heroEyebrow
            )}</p>
            <p style="margin:0 auto 12px;max-width:500px;font-size:clamp(24px,4vw,38px);line-height:1.04;font-weight:800;text-align:center;letter-spacing:.02em;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(
              heroTitle
            )}</p>
            <div style="width:56px;height:2px;background:rgba(255,255,255,.92);margin:0 auto 16px;"></div>
            <a href="${escapeHtml(heroCtaUrl)}" style="display:inline-block;width:fit-content;min-width:180px;max-width:280px;background:transparent;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 18px;border-radius:12px;border:1.5px solid rgba(255,255,255,.9);text-align:center;">
              ${escapeHtml(heroCtaLabel)}
            </a>
            <p style="margin:10px 0 0;font-size:13px;line-height:1.4;color:rgba(255,255,255,.82);">${escapeHtml(
              supportText
            )}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function CTAButton({
  brandConfig,
  templateConfig,
  ctaLabel
}: {
  brandConfig: BrandConfig;
  templateConfig: EmailTypeTemplateConfig;
  ctaLabel?: string;
}) {
  return `<tr>
    <td style="padding:6px 24px 18px;">
      <a href="${brandConfig.ctaUrl}" style="display:inline-block;background:${brandConfig.primaryColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 17px;border-radius:12px;">
        ${escapeHtml(ctaLabel || templateConfig.ctaLabel)}
      </a>
      <p style="margin:8px 0 0;color:#64748b;font-size:13px;">${escapeHtml(templateConfig.supportText)}</p>
    </td>
  </tr>`;
}

export function SignatureBlock({ brandConfig }: { brandConfig: BrandConfig }) {
  return `<tr>
    <td style="padding:0 24px 22px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #e2e8f0;">
        <tr>
          <td style="padding-top:16px;color:#334155;font-size:14px;line-height:1.45;">
            <strong style="color:#0f172a;">${escapeHtml(brandConfig.senderName)}</strong><br />
            ${escapeHtml(brandConfig.senderTitle)}<br />
            ${escapeHtml(brandConfig.storeName)}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function FooterBlock({
  brandConfig,
  disclaimer
}: {
  brandConfig: BrandConfig;
  disclaimer?: string;
}) {
  return `<tr>
    <td style="padding:18px 24px;background:${brandConfig.footerBackgroundColor};color:rgba(255,255,255,.9);font-size:13px;line-height:1.55;">
      <strong style="color:#ffffff;">${escapeHtml(brandConfig.storeName)}</strong><br />
      ${escapeHtml(brandConfig.phone)}<br />
      ${escapeHtml(brandConfig.address)}<br />
      <a href="${brandConfig.ctaUrl}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(brandConfig.website)}</a>
      <p style="margin:10px 0 0;color:rgba(255,255,255,.78);">${escapeHtml(brandConfig.footerText)}</p>
      ${
        disclaimer?.trim()
          ? `<p style="margin:12px 0 0;color:#94a3b8;font-size:11px;line-height:1.55;">${escapeHtml(disclaimer).replaceAll("\n", "<br />")}</p>`
          : ""
      }
    </td>
  </tr>`;
}

export function EmailShell({
  title,
  preheader,
  brandConfig,
  shellConfig,
  children
}: {
  title: string;
  preheader?: string;
  brandConfig: BrandConfig;
  shellConfig: EmailShellConfig;
  children: string;
}) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      @media only screen and (max-width: 479px) {
        .hero-split-table,
        .hero-split-table tbody,
        .hero-split-table tr,
        .hero-split-copy,
        .hero-split-image {
          display: block !important;
          width: 100% !important;
        }

        .hero-split-image img {
          height: 220px !important;
        }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${shellConfig.outerBackground};font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;visibility:hidden;font-size:1px;line-height:1px;color:${shellConfig.outerBackground};">
      ${escapeHtml(preheader || title)}
    </div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${shellConfig.outerBackground};padding:${shellConfig.outerPadding}px;">
      <tr>
        <td align="center">
          <table role="presentation" width="${shellConfig.shellWidth}" cellspacing="0" cellpadding="0" style="width:100%;max-width:${shellConfig.shellWidth}px;background:${shellConfig.shellBackground};border:1px solid ${shellConfig.shellBorder};">
            <tr>
              <td align="center" style="padding:${shellConfig.headerPadding};border-bottom:1px solid ${shellConfig.shellBorder};">
                <img src="${brandConfig.logoUrl}" alt="${escapeHtml(brandConfig.storeName)}" width="228" style="display:block;max-width:228px;height:auto;margin:0 auto;" />
              </td>
            </tr>
            ${children}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
