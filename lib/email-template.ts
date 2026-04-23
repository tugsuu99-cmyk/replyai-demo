import { defaultBrandConfig, type BrandConfig } from "@/lib/brand-config";
import {
  bodyParagraphs,
  CTAButton,
  EmailShell,
  escapeHtml,
  FooterBlock,
  HeroSection,
  SignatureBlock
} from "@/lib/email-components";
import type { NormalizedCustomer } from "@/lib/normalize";
import { emailShellConfig, emailTypeTemplateConfig } from "@/lib/template-config";

function fallbackHeadline(customer: NormalizedCustomer) {
  const vehicle = [customer.year, customer.make, customer.model].filter(Boolean).join(" ");
  const firstName = customer.firstName ? `${customer.firstName}, ` : "";

  if (customer.emailType === "trade") {
    return vehicle ? `${firstName}quick value check on your ${vehicle}` : `${firstName}quick value check`;
  }

  if (customer.emailType === "lease") {
    return vehicle ? `${firstName}quick lease options for your ${vehicle}` : `${firstName}quick lease options`;
  }

  if (customer.emailType === "service") {
    return vehicle ? `${firstName}quick service check for your ${vehicle}` : `${firstName}quick service check`;
  }

  if (vehicle) {
    return `${firstName}quick note about your ${vehicle}`;
  }

  return `${firstName}quick note from our team`;
}

export function renderBrandedEmailHtml(
  customer: NormalizedCustomer,
  brandConfig: BrandConfig = defaultBrandConfig
) {
  const shellConfig = emailShellConfig;
  const templateConfig = emailTypeTemplateConfig[customer.emailType];
  const headline = customer.headline || fallbackHeadline(customer);
  const content = [
    HeroSection({ templateConfig, brandConfig }),
    `<tr>
      <td style="padding:${shellConfig.contentPadding};">
        <h1 style="margin:0;color:${templateConfig.headlineStyle.color};font-size:${templateConfig.headlineStyle.fontSize}px;line-height:${templateConfig.headlineStyle.lineHeight};font-weight:${templateConfig.headlineStyle.fontWeight};">${escapeHtml(headline)}</h1>
      </td>
    </tr>`,
    `<tr>
      <td style="padding:4px 24px 4px;">
        ${bodyParagraphs(customer.emailBody || "", shellConfig)}
      </td>
    </tr>`,
    CTAButton({ brandConfig, templateConfig }),
    templateConfig.showSignatureBlock ? SignatureBlock({ brandConfig }) : "",
    FooterBlock({ brandConfig })
  ].join("");

  return EmailShell({
    title: customer.subject || headline,
    brandConfig,
    shellConfig,
    children: content
  });
}
