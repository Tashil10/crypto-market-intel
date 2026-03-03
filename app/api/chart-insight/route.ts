import { NextResponse } from "next/server";
import { generateChartInsight } from "@/lib/groq";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
    const snapshots = Array.isArray(body.snapshots) ? body.snapshots : [];
    const riskScores = Array.isArray(body.riskScores) ? body.riskScores : [];
    const dashboardContext = typeof body.dashboardContext === "string" ? body.dashboardContext : undefined;
    if (!symbol) {
      return NextResponse.json({ error: "Missing symbol" }, { status: 400 });
    }
    const insight = await generateChartInsight(symbol, snapshots, riskScores, dashboardContext);
    return NextResponse.json({ insight: insight ?? null });
  } catch (e) {
    console.error("chart-insight", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chart insight failed" },
      { status: 500 }
    );
  }
}
