"use client";

import { useEffect, useState } from "react";
import Header from "@/components/Header";
import RiskGauge from "@/components/RiskGauge";
import PriceChart from "@/components/PriceChart";
import Messages from "@/components/Messages";
import Sidebar from "@/components/Sidebar";
import CryptoNews from "@/components/CryptoNews";
import HowItWorks from "@/components/HowItWorks";
import DashboardSkeletons from "@/components/DashboardSkeletons";

type DashboardData = {
  riskScores: Array<{
    symbol: string;
    volatility_z: number | null;
    volume_z: number | null;
    composite_risk: number | null;
    timestamp?: string;
  }>;
  lastIngest: string | null;
  incidentCount: number;
  incidentCountLast7Days: number;
  incidentCountInTimeframe?: number;
  incidentsMissingSummaryCount?: number;
  topByVolume?: Array<{
    symbol: string;
    price: number;
    volume_24h: number | null;
    market_cap: number | null;
    price_change_pct_24h: number | null;
    timestamp?: string;
  }>;
  incidents: Array<{
    id: number;
    created_at: string;
    symbol: string;
    severity: string;
    title: string | null;
    summary: string | null;
    raw_metrics: Record<string, unknown> | null;
  }>;
  chart: {
    symbol: string;
    snapshots: Array<{
      timestamp: string;
      price: number;
      volume_24h?: number | null;
      price_change_pct_24h?: number | null;
    }>;
    riskScores: Array<{ timestamp: string; composite_risk: number | null }>;
  };
};

export default function Home() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);
  const [chartSymbol, setChartSymbol] = useState<string | null>(null);
  const [chartInsight, setChartInsight] = useState<string | null>(null);
  const [chartInsightLoading, setChartInsightLoading] = useState(false);
  const [news, setNews] = useState<Array<{ title: string; url: string; description?: string; source?: string; date?: string }>>([]);

  const fetchDashboard = async (chartSymbolOverride?: string) => {
    try {
      const sym = chartSymbolOverride ?? chartSymbol;
      const params = new URLSearchParams();
      if (sym) params.set("chartSymbol", sym);
      params.set("incidentsSinceHours", "24");
      const url = `/api/dashboard?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setData(json);
      setError(null);
      if (chartSymbolOverride === undefined && json.chart?.symbol) setChartSymbol(json.chart.symbol);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Fallback: dashboard sometimes returns incidentCount but empty incidents (driver/encoding). Fetch list from /api/incidents.
  useEffect(() => {
    if (!data || data.incidentCount <= 0) return;
    const list = Array.isArray(data.incidents) ? data.incidents : [];
    if (list.length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/incidents");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        const incidents = Array.isArray(json?.incidents) ? json.incidents : [];
        if (cancelled || incidents.length === 0) return;
        setData((prev) => (prev ? { ...prev, incidents } : prev));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.incidentCount, data?.incidents]);

  // When the latest incident has no AI summary, request one and refetch so it always shows
  useEffect(() => {
    const latest = data?.incidents?.[0];
    if (!latest || (latest.summary != null && latest.summary.trim() !== "")) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/incidents/${latest.id}/summarize`, {
          method: "POST",
        });
        if (!res.ok || cancelled) return;
        await fetchDashboard();
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.incidents?.[0]?.id, data?.incidents?.[0]?.summary]);

  // Fetch AI chart insight when chart data is available; pass dashboard context (top risk symbols)
  useEffect(() => {
    const chart = data?.chart;
    if (!chart?.symbol || (!chart.snapshots?.length && !chart.riskScores?.length)) {
      setChartInsight(null);
      return;
    }
    const dashboardContext = Array.isArray(data?.riskScores) && data.riskScores.length > 0
      ? `Top composite risk: ${data.riskScores.slice(0, 5).map((r) => {
          const cr = r.composite_risk != null ? Number(r.composite_risk) : null;
          return `${r.symbol} ${cr != null && !Number.isNaN(cr) ? cr.toFixed(1) : "n/a"}`;
        }).join(", ")}.`
      : undefined;
    let cancelled = false;
    setChartInsightLoading(true);
    setChartInsight(null);
    (async () => {
      try {
        const res = await fetch("/api/chart-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: chart.symbol,
            snapshots: chart.snapshots ?? [],
            riskScores: chart.riskScores ?? [],
            dashboardContext,
          }),
        });
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        setChartInsight(json?.insight ?? null);
      } catch {
        if (!cancelled) setChartInsight(null);
      } finally {
        if (!cancelled) setChartInsightLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.chart?.symbol, data?.chart?.snapshots?.length, data?.chart?.riskScores?.length, data?.riskScores]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch("/api/refresh");
      await fetchDashboard();
      setLastRefreshAt(new Date());
    } finally {
      setRefreshing(false);
    }
  };

  // Backfill missing AI summaries in the background (no button)
  useEffect(() => {
    const missing = data?.incidentsMissingSummaryCount ?? 0;
    if (missing <= 0) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/incidents/generate-summaries", { method: "POST" });
        if (!res.ok || cancelled) return;
        await res.json();
        if (!cancelled) fetchDashboard();
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [data?.incidentsMissingSummaryCount]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/news");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (cancelled) return;
        setNews(Array.isArray(json?.news) ? json.news : []);
      } catch {
        if (!cancelled) setNews([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="w-full">
        <div className="flex flex-col lg:flex-row">
          <aside className="hidden lg:block w-80 shrink-0 border-r border-white/10 px-5 py-6 sticky top-0 self-start max-h-screen overflow-y-auto">
            <div className="space-y-6">
              <HowItWorks />
              <CryptoNews items={news} />
            </div>
          </aside>
          <div className="min-w-0 flex-1 px-6 py-8 lg:px-10">
        <div className="mb-6 flex items-center justify-between gap-4">
          <p className="text-base text-zinc-500">
            Last updated (risk data):{" "}
            {data?.lastIngest
              ? new Date(data.lastIngest).toLocaleString()
              : "—"}
            {lastRefreshAt != null && (
              <>
                {" · "}
                Last refresh: {lastRefreshAt.toLocaleString()}
              </>
            )}
          </p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-card border border-theme/30 bg-theme-subtle px-4 py-2.5 text-base font-medium text-theme transition hover:bg-theme/20 hover:border-theme/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:opacity-50 disabled:border-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-400"
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-card border border-negative/40 bg-negative-subtle p-4 text-base text-negative">
            {error}
          </div>
        )}

        {loading ? (
          <DashboardSkeletons />
        ) : (
          <div className="space-y-8">
            <Messages
              incidents={Array.isArray(data?.incidents) ? data.incidents : []}
              incidentCount={data?.incidentCount ?? 0}
              incidentCountInTimeframe={data?.incidentCountInTimeframe ?? 0}
              riskScores={Array.isArray(data?.riskScores) ? data.riskScores : []}
              timeframeLabel="last 24 hours"
            />
            <RiskGauge riskScores={data?.riskScores ?? []} />
            {data?.chart && (
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <label htmlFor="chart-symbol" className="text-base text-theme-muted">
                    Chart symbol:
                  </label>
                  <select
                    id="chart-symbol"
                    value={data.chart.symbol}
                    onChange={(e) => {
                      const s = e.target.value;
                      setChartSymbol(s);
                      fetchDashboard(s);
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-xl px-3 py-2 text-base text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-theme focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  >
                    {(Array.isArray(data?.riskScores) ? data.riskScores : []).map((r) => (
                      <option key={r.symbol} value={r.symbol}>
                        {r.symbol}
                      </option>
                    ))}
                  </select>
                </div>
                <PriceChart
                  symbol={data.chart.symbol}
                  snapshots={data.chart.snapshots}
                  riskScores={data.chart.riskScores}
                />
                {(chartInsightLoading || chartInsight) && (
                  <div className="rounded-2xl border border-white/10 border-l-4 border-l-theme bg-white/5 backdrop-blur-xl px-5 py-4 text-base">
                    <p className="text-sm font-medium uppercase tracking-wider text-theme-muted">
                      AI-generated chart insight
                    </p>
                    {chartInsightLoading ? (
                      <p className="mt-2 text-base text-zinc-500">Generating…</p>
                    ) : chartInsight ? (
                      <div className="mt-3 space-y-2 text-base leading-relaxed text-zinc-400">
                        {chartInsight.split(/\n+/).map((line, i) => {
                          const t = line.trim();
                          if (!t) return null;
                          if (/^Context:/.test(t)) return <p key={i}><strong className="text-zinc-300">Context:</strong> {t.replace(/^Context:\s*/i, "")}</p>;
                          if (/^This chart:/.test(t)) return <p key={i}><strong className="text-zinc-300">This chart:</strong> {t.replace(/^This chart:\s*/i, "")}</p>;
                          if (/^Do:/.test(t)) return <p key={i}><strong className="text-positive">Do:</strong> {t.replace(/^Do:\s*/i, "")}</p>;
                          if (/^Don't:/.test(t)) return <p key={i}><strong className="text-negative">Don&apos;t:</strong> {t.replace(/^Don't:\s*/i, "")}</p>;
                          return <p key={i}>{t}</p>;
                        })}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </div>
        <aside className="hidden lg:block w-80 shrink-0 border-l border-white/10 px-5 py-6 sticky top-0 self-start max-h-screen overflow-y-auto">
          {!loading && data && (
            <Sidebar
              topByVolume={data.topByVolume ?? []}
              riskScores={data.riskScores ?? []}
            />
          )}
        </aside>
        </div>
        <footer className="w-full border-t border-white/10 py-6 text-center text-sm text-zinc-500">
          Data: CoinGecko · One-link demo, no signup required
        </footer>
      </main>
    </div>
  );
}
