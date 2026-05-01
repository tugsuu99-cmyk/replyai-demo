import type { CampaignConfig } from "@/lib/campaign";
import type { NormalizedOffer, OfferMatchReason } from "@/lib/offer-matching";
import { NextResponse } from "next/server";
import { generateEmailForCustomer } from "@/lib/openai";
import type { NormalizedCustomer } from "@/lib/normalize";

export const runtime = "nodejs";

type GenerateEmailRequest = {
  customer?: NormalizedCustomer;
  campaign?: CampaignConfig;
  matchedOffer?: NormalizedOffer | null;
  matchReason?: OfferMatchReason;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateEmailRequest;

    if (!body.customer || !body.campaign) {
      return NextResponse.json({ error: "Missing customer or campaign." }, { status: 400 });
    }

    const email = await generateEmailForCustomer(
      body.customer,
      body.campaign,
      body.matchedOffer,
      body.matchReason
    );
    return NextResponse.json({ email });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Email generation failed."
      },
      { status: 500 }
    );
  }
}
