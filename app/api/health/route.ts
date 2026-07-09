import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    db.prepare("SELECT 1").get();
    return NextResponse.json({ status: "ok" });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown" },
      { status: 503 }
    );
  }
}
