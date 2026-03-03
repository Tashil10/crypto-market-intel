import { NextRequest, NextResponse } from "next/server";
import {
  getLatestRiskScores,
  getLastIngestTime,
  getSnapshotHistory,
  getRiskScoreHistory,
  getIncidentCount,
  getIncidentCountLast7Days,
  getIncidentCountSince,
  getIncidentCountMissingSummary,
  getLatestSnapshotsBySymbol,
  getIncidentsSince,
} from "@/lib/db";

const BUCKET_MS = 4 * 60 * 60 * 1000; // 4h
const MAX_INCIDENTS = 50;

function bucketKey(createdAt: string | Date): number {
  const t = typeof createdAt === "string" ? new Date(createdAt).getTime() : createdAt.getTime();
  return Math.floor(t / BUCKET_MS) * BUCKET_MS;
}

function dedupeBySymbolAnd4h<T extends { symbol: string; created_at: string | Date }>(list: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const inc of list) {
    const key = `${inc.symbol}:${bucketKey(inc.created_at)}`;
    if (!byKey.has(key)) byKey.set(key, inc);
  }
  return Array.from(byKey.values()).sort((a, b) => {
    const ta = typeof a.created_at === "string" ? new Date(a.created_at).getTime() : a.created_at.getTime();
    const tb = typeof b.created_at === "string" ? new Date(b.created_at).getTime() : b.created_at.getTime();
    return tb - ta;
  });
}

export async function GET(request: NextRequest) {
  try {
    const incidentsSinceHoursParam = request.nextUrl.searchParams.get("incidentsSinceHours");
    const incidentsSinceHours = incidentsSinceHoursParam === "24" ? 24 : 168; // default 7 days

    const [riskScores, lastIngest, incidentsRaw, incidentCount, incidentCountLast7Days, incidentCountInTimeframe, incidentsMissingSummaryCount, latestSnapshots] = await Promise.all([
      getLatestRiskScores(),
      getLastIngestTime(),
      getIncidentsSince(incidentsSinceHours),
      getIncidentCount(),
      getIncidentCountLast7Days(),
      getIncidentCountSince(incidentsSinceHours),
      getIncidentCountMissingSummary(),
      getLatestSnapshotsBySymbol(),
    ]);

    const incidents = dedupeBySymbolAnd4h(incidentsRaw).slice(0, MAX_INCIDENTS);

    const requestedSymbol = request.nextUrl.searchParams.get("chartSymbol");
    const symbolInList = requestedSymbol && riskScores.some((r) => r.symbol === requestedSymbol);
    const chartSymbol = symbolInList ? requestedSymbol! : (riskScores[0]?.symbol ?? "BTC");
    const [snapshotHistory, riskHistory] = await Promise.all([
      getSnapshotHistory(chartSymbol, 48),
      getRiskScoreHistory(chartSymbol, 48),
    ]);

    const lastIngestTime =
      lastIngest ?? (riskScores[0]?.timestamp ? new Date(riskScores[0].timestamp) : null);
    const topByVolume = [...latestSnapshots]
      .sort((a, b) => (b.volume_24h ?? 0) - (a.volume_24h ?? 0))
      .slice(0, 10)
      .map((s) => ({
        symbol: s.symbol,
        price: s.price,
        volume_24h: s.volume_24h,
        market_cap: s.market_cap,
        price_change_pct_24h: s.price_change_pct_24h,
        timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : String(s.timestamp),
      }));
    return NextResponse.json({
      riskScores,
      lastIngest: lastIngestTime?.toISOString() ?? null,
      incidents: Array.isArray(incidents) ? incidents : [],
      incidentCount,
      incidentCountLast7Days,
      incidentCountInTimeframe,
      incidentsMissingSummaryCount,
      topByVolume,
      chart: {
        symbol: chartSymbol,
        snapshots: snapshotHistory.reverse().map((s) => ({
          timestamp: s.timestamp instanceof Date ? s.timestamp.toISOString() : String(s.timestamp),
          price: s.price,
          volume_24h: s.volume_24h,
          price_change_pct_24h: s.price_change_pct_24h,
        })),
        riskScores: riskHistory.reverse().map((r) => ({
          timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp),
          composite_risk: r.composite_risk,
        })),
      },
    });
  } catch (e) {
    console.error("dashboard api", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Dashboard failed" },
      { status: 500 }
    );
  }
}
