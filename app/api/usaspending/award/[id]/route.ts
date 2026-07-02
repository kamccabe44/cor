import { NextRequest, NextResponse } from "next/server";
import { getAwardDetail } from "@/lib/usaspending";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const detail = await getAwardDetail(id);
    return NextResponse.json({ detail });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error contacting USASpending.gov" },
      { status: 502 }
    );
  }
}
