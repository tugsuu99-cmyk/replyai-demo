import type { BrandConfig } from "@/lib/brand-config";
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

export function HeroSection({
  templateConfig,
  brandConfig
}: {
  templateConfig: EmailTypeTemplateConfig;
  brandConfig: BrandConfig;
}) {
  const heroTitle = templateConfig.heroTitle.toUpperCase();
  const heroCtaLabel = templateConfig.ctaLabel.toUpperCase();
  const heroGradient = "linear-gradient(180deg, #000000 0%, #090000 26%, #210000 52%, #5c0000 78%, #b30000 100%)";

  return `<tr>
    <td style="padding:20px 24px 8px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${brandConfig.primaryColor};background-image:${heroGradient};border-radius:16px;overflow:hidden;">
        <tr>
          <td align="center" style="padding:24px 24px 22px;color:#ffffff;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.82);font-weight:700;">${escapeHtml(
              templateConfig.heroEyebrow
            )}</p>
            <p style="margin:0 auto 18px;max-width:500px;font-size:40px;line-height:1.06;font-weight:800;text-align:center;letter-spacing:.02em;">${escapeHtml(
              heroTitle
            )}</p>
            <a href="${brandConfig.ctaUrl}" style="display:inline-block;background:#ffffff;color:${brandConfig.primaryColor};text-decoration:none;font-weight:700;font-size:15px;padding:12px 18px;border-radius:12px;">
              ${escapeHtml(heroCtaLabel)}
            </a>
            <p style="margin:10px 0 0;font-size:13px;line-height:1.4;color:rgba(255,255,255,.82);">${escapeHtml(
              templateConfig.supportText
            )}</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export function CTAButton({
  brandConfig,
  templateConfig
}: {
  brandConfig: BrandConfig;
  templateConfig: EmailTypeTemplateConfig;
}) {
  const ctaLabel = templateConfig.ctaLabel.toUpperCase();

  return `<tr>
    <td style="padding:6px 24px 18px;">
      <a href="${brandConfig.ctaUrl}" style="display:inline-block;background:${brandConfig.primaryColor};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 17px;border-radius:12px;">
        ${escapeHtml(ctaLabel)}
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
  brandConfig
}: {
  brandConfig: BrandConfig;
}) {
  return `<tr>
    <td style="padding:18px 24px;background:${brandConfig.primaryColor};color:rgba(255,255,255,.9);font-size:13px;line-height:1.55;">
      <strong style="color:#ffffff;">${escapeHtml(brandConfig.storeName)}</strong><br />
      ${escapeHtml(brandConfig.phone)}<br />
      ${escapeHtml(brandConfig.address)}<br />
      <a href="${brandConfig.ctaUrl}" style="color:#ffffff;text-decoration:underline;">${escapeHtml(brandConfig.website)}</a>
      <p style="margin:10px 0 0;color:rgba(255,255,255,.78);">${escapeHtml(brandConfig.footerText)}</p>
    </td>
  </tr>`;
}

export function EmailShell({
  title,
  brandConfig,
  shellConfig,
  children
}: {
  title: string;
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
  </head>
  <body style="margin:0;padding:0;background:${shellConfig.outerBackground};font-family:Arial,Helvetica,sans-serif;">
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
