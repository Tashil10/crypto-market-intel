import { NextRequest, NextResponse } from "next/server";
import { fetchMarkets } from "@/lib/coingecko";
import {
  insertSnapshot,
  insertRiskScore,
  insertIncident,
  getSnapshotsForSymbol,
  hasRecentIncident,
} from "@/lib/db";
import { computeRisk, isAnomaly, severityFromComposite } from "@/lib/risk-engine";
import { generateIncidentSummary } from "@/lib/groq";

function assertCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const querySecret = request.nextUrl.searchParams.get("secret");
  return bearer === secret || querySecret === secret;
}

export async function GET(request: NextRequest) {
  if (!assertCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const markets = await fetchMarkets();
    for (const m of markets) {
      await insertSnapshot({
        symbol: m.symbol,
        price: m.current_price,
        volume_24h: m.total_volume,
        market_cap: m.market_cap,
        price_change_24h: m.price_change_24h,
        price_change_pct_24h: m.price_change_percentage_24h,
      });
    }

    const symbols = Array.from(new Set(markets.map((m) => m.symbol)));
    for (const symbol of symbols) {
      const snapshots = await getSnapshotsForSymbol(symbol, 50);
      const current = markets.find((m) => m.symbol === symbol);
      if (!current || snapshots.length < 2) continue;

      const { volatility_z, volume_z, composite_risk, metadata } = computeRisk(
        symbol,
        current.price_change_percentage_24h ?? null,
        current.total_volume,
        snapshots
      );
      await insertRiskScore({
        symbol,
        volatility_z,
        volume_z,
        composite_risk,
        metadata,
      });

      if (isAnomaly(volatility_z, volume_z)) {
        const recent = await hasRecentIncident(symbol, 45);
        if (recent) continue;
        const severity = severityFromComposite(composite_risk);
        const raw_metrics = {
          volatility_z: volatility_z ?? undefined,
          volume_z: volume_z ?? undefined,
          composite_risk: composite_risk ?? undefined,
          ...metadata,
        };
        let summary: string | null = null;
        try {
          summary = await generateIncidentSummary(symbol, severity, raw_metrics);
        } catch {
          // keep summary null if LLM fails
        }
        await insertIncident({
          symbol,
          severity,
          title: `${symbol} anomaly (${severity})`,
          summary,
          raw_metrics,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      symbols: markets.length,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    console.error("ingest error", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ingest failed" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
