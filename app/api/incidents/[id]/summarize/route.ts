import { NextResponse } from "next/server";
import { getIncidentById, updateIncidentSummary } from "@/lib/db";
import { generateIncidentSummary } from "@/lib/groq";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: "Invalid incident id" }, { status: 400 });
  }
  try {
    const incident = await getIncidentById(id);
    if (!incident) {
      return NextResponse.json({ error: "Incident not found" }, { status: 404 });
    }
    if (incident.summary && incident.summary.trim().length > 0) {
      return NextResponse.json({ summary: incident.summary });
    }
    const summary = await generateIncidentSummary(
      incident.symbol,
      incident.severity,
      incident.raw_metrics
    );
    if (!summary) {
      return NextResponse.json(
        { error: "Could not generate summary (missing GROQ_API_KEY or API error)" },
        { status: 502 }
      );
    }
    await updateIncidentSummary(id, summary);
    return NextResponse.json({ summary });
  } catch (e) {
    console.error("summarize incident", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Summarize failed" },
      { status: 500 }
    );
  }
}
