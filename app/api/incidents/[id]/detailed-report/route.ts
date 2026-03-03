import { NextResponse } from "next/server";
import { getIncidentById } from "@/lib/db";
import { generateIncidentDetailedReport } from "@/lib/groq";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const incident = await getIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }
    const detailedReport = await generateIncidentDetailedReport({
      symbol: incident.symbol,
      severity: incident.severity,
      summary: incident.summary,
      raw_metrics: incident.raw_metrics,
    });
    return NextResponse.json({ detailedReport: detailedReport ?? null });
  } catch (e) {
    console.error("detailed-report", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Detailed report failed" },
      { status: 500 }
    );
  }
}
