import { NextResponse } from "next/server";
import { parseOffersByType } from "@/lib/offers";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing offer file." }, { status: 400 });
    }

    const offers = await parseOffersByType(await file.arrayBuffer(), file.name, file.type);

    if (offers.length === 0) {
      return NextResponse.json(
        { error: "No real offers were found in that file. Check the Offers column and try again." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      offers,
      sourceLabel: file.name
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Offer parsing failed."
      },
      { status: 500 }
    );
  }
}
