import { NextRequest, NextResponse } from "next/server";
import { searchAwards } from "@/lib/usaspending";

export async function GET(req: NextRequest) {
  const keyword = req.nextUrl.searchParams.get("q")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "Missing query parameter 'q'." }, { status: 400 });
  }
  try {
    const results = await searchAwards(keyword);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error contacting USASpending.gov" },
      { status: 502 }
    );
  }
}
