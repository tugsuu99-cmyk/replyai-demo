import type { CampaignConfig } from "@/lib/campaign";
import type { NormalizedOffer, OfferMatchReason } from "@/lib/offer-matching";
import type { NormalizedCustomer } from "@/lib/normalize";
import { buildEmailPrompt, type GeneratedEmail } from "@/lib/prompts";

type OpenAITextResponse = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
};

const MAX_OPENAI_ATTEMPTS = 3;
const RETRYABLE_STATUS_CODES = new Set([408, 409, 429, 500, 502, 503, 504]);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number) {
  return RETRYABLE_STATUS_CODES.has(status);
}

async function readErrorDetail(response: Response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as {
      error?: {
        message?: string;
      };
    };

    return parsed.error?.message?.trim() || text.trim();
  } catch {
    return text.trim();
  }
}

function extractOutputText(payload: OpenAITextResponse) {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
}

function parseGeneratedEmail(text: string): GeneratedEmail {
  const parsed = JSON.parse(text) as Partial<GeneratedEmail>;

  if (!parsed.subject || !parsed.headline || !parsed.emailBody) {
    throw new Error("OpenAI response did not include subject, headline, and emailBody.");
  }

  return {
    subject: String(parsed.subject),
    headline: String(parsed.headline),
    emailBody: String(parsed.emailBody),
    ctaLine: parsed.ctaLine ? String(parsed.ctaLine) : ""
  };
}

export async function generateEmailForCustomer(
  customer: NormalizedCustomer,
  campaign: CampaignConfig,
  matchedOffer?: NormalizedOffer | null,
  matchReason?: OfferMatchReason
): Promise<GeneratedEmail> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  let lastRetryableError = "";

  for (let attempt = 1; attempt <= MAX_OPENAI_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
          input: buildEmailPrompt(customer, campaign, matchedOffer, matchReason),
          temperature: 0.5,
          text: {
            format: {
              type: "json_object"
            }
          }
        })
      });

      if (!response.ok) {
        const detail = await readErrorDetail(response);

        if (isRetryableStatus(response.status) && attempt < MAX_OPENAI_ATTEMPTS) {
          lastRetryableError = detail;
          await wait(350 * attempt);
          continue;
        }

        if (isRetryableStatus(response.status)) {
          throw new Error(
            "Temporary AI service issue while generating this email. Please try again."
          );
        }

        throw new Error(detail || "Email generation failed.");
      }

      const payload = (await response.json()) as OpenAITextResponse;
      return parseGeneratedEmail(extractOutputText(payload));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Email generation failed.";

      if (attempt < MAX_OPENAI_ATTEMPTS) {
        lastRetryableError = message;
        await wait(350 * attempt);
        continue;
      }

      if (
        message === "Temporary AI service issue while generating this email. Please try again."
      ) {
        throw error;
      }

      if (lastRetryableError) {
        throw new Error(
          "Temporary AI service issue while generating this email. Please try again."
        );
      }

      throw error instanceof Error ? error : new Error("Email generation failed.");
    }
  }

  throw new Error("Temporary AI service issue while generating this email. Please try again.");
}
