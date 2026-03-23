import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY ?? "";
  return NextResponse.json(
    { siteKey },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
