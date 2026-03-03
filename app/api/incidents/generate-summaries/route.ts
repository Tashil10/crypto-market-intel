import { NextResponse } from "next/server";
import { getIncidentsMissingSummary, updateIncidentSummary } from "@/lib/db";
import { generateIncidentSummary } from "@/lib/groq";

const DELAY_MS = 600;
const MAX_BATCH = 50;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST() {
  try {
    const incidents = await getIncidentsMissingSummary(MAX_BATCH);
    let generated = 0;
    let failed = 0;
    for (const inc of incidents) {
      const summary = await generateIncidentSummary(
        inc.symbol,
        inc.severity,
        inc.raw_metrics
      );
      if (summary) {
        await updateIncidentSummary(inc.id, summary);
        generated++;
      } else {
        failed++;
      }
      await sleep(DELAY_MS);
    }
    return NextResponse.json({ generated, failed });
  } catch (e) {
    console.error("generate-summaries", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Generate summaries failed" },
      { status: 500 }
    );
  }
}
