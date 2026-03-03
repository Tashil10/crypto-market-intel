import { NextResponse } from "next/server";
import { getIncidentById, getSnapshotHistory, getRiskScoreHistory } from "@/lib/db";

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
    const [snapshots, riskScores] = await Promise.all([
      getSnapshotHistory(incident.symbol, 24),
      getRiskScoreHistory(incident.symbol, 24),
    ]);
    const snapshotsReversed = snapshots.reverse().map((s) => ({
      timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : String(s.timestamp),
      price: s.price,
    }));
    const riskScoresReversed = riskScores.reverse().map((r) => ({
      timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
      composite_risk: r.composite_risk,
    }));
    return NextResponse.json({
      symbol: incident.symbol,
      snapshots: snapshotsReversed,
      riskScores: riskScoresReversed,
    });
  } catch (e) {
    console.error("incident chart", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Chart failed" },
      { status: 500 }
    );
  }
}
