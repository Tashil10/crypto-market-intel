import { NextResponse } from "next/server";
import { getIncidents } from "@/lib/db";

export async function GET() {
  try {
    const incidents = await getIncidents(50);
    return NextResponse.json({ incidents });
  } catch (e) {
    console.error("incidents api", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Incidents failed" },
      { status: 500 }
    );
  }
}
