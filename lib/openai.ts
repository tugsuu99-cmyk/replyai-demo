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

export async function generateEmailForCustomer(customer: NormalizedCustomer): Promise<GeneratedEmail> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: buildEmailPrompt(customer),
      temperature: 0.5,
      text: {
        format: {
          type: "json_object"
        }
      }
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed: ${detail}`);
  }

  const payload = (await response.json()) as OpenAITextResponse;
  return parseGeneratedEmail(extractOutputText(payload));
}
