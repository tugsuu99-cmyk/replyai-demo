import { NextResponse } from "next/server";
import { generateEmailForCustomer } from "@/lib/openai";
import type { NormalizedCustomer } from "@/lib/normalize";

export const runtime = "nodejs";

type GenerateEmailRequest = {
  customer?: NormalizedCustomer;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateEmailRequest;

    if (!body.customer) {
      return NextResponse.json({ error: "Missing customer." }, { status: 400 });
    }

    const email = await generateEmailForCustomer(body.customer);
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
