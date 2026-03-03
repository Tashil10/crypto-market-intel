"use client";

import { useEffect, useState } from "react";

type RiskScore = {
  symbol: string;
  composite_risk: number | null;
  volume_z: number | null;
  volatility_z?: number | null;
};

type Snapshot = {
  symbol: string;
  price: number;
  volume_24h: number | null;
  market_cap: number | null;
  price_change_pct_24h: number | null;
  timestamp?: string;
};

export default function AIBuyRecommendation({
  riskScores,
  topByVolume,
}: {
  riskScores: RiskScore[];
  topByVolume: Snapshot[];
}) {
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!riskScores?.length && !topByVolume?.length) {
      setRecommendation(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setRecommendation(null);
    (async () => {
      try {
        const res = await fetch("/api/buy-recommendation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ riskScores: riskScores ?? [], topByVolume: topByVolume ?? [] }),
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) setRecommendation(json?.recommendation ?? null);
      } catch {
        if (!cancelled) setRecommendation(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [riskScores?.length, topByVolume?.length]);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <h3 className="text-sm font-medium uppercase tracking-wider text-theme">AI snapshot</h3>
      <p className="mt-1 text-base text-zinc-500">For education only. Not financial advice.</p>
      {loading && <p className="mt-3 text-base text-zinc-500">Generating…</p>}
      {!loading && recommendation && (
        <p className="mt-3 text-base leading-relaxed text-zinc-400">{recommendation}</p>
      )}
      {!loading && !recommendation && riskScores?.length > 0 && (
        <p className="mt-3 text-base text-zinc-500">No recommendation available.</p>
      )}
    </div>
  );
}
