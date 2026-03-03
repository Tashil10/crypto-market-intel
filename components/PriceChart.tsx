"use client";

import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Snapshot = {
  timestamp: string | Date;
  price: number;
  volume_24h?: number | null;
  price_change_pct_24h?: number | null;
};

type RiskPoint = {
  timestamp: string | Date;
  composite_risk: number | null;
};

type Props = {
  snapshots: Snapshot[];
  riskScores: RiskPoint[];
  symbol: string;
};

function formatTime(ts: string | Date): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toNum(value: number | string | null | undefined): number {
  if (value == null) return 0;
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
}

export default function PriceChart({ snapshots, riskScores, symbol }: Props) {
  const priceData = snapshots.map((s) => ({
    time: formatTime(s.timestamp),
    price: toNum(s.price),
    priceChangePct: s.price_change_pct_24h != null && !Number.isNaN(Number(s.price_change_pct_24h)) ? Number(s.price_change_pct_24h) : null,
    full: new Date(s.timestamp).toISOString(),
  }));
  const volumeData = snapshots.map((s) => ({
    time: formatTime(s.timestamp),
    volume: s.volume_24h != null && !Number.isNaN(Number(s.volume_24h)) ? Number(s.volume_24h) : null,
    full: new Date(s.timestamp).toISOString(),
  })).filter((d) => d.volume != null);
  const changeData = snapshots.map((s) => ({
    time: formatTime(s.timestamp),
    changePct: s.price_change_pct_24h != null && !Number.isNaN(Number(s.price_change_pct_24h)) ? Number(s.price_change_pct_24h) : null,
    full: new Date(s.timestamp).toISOString(),
  })).filter((d) => d.changePct != null);
  const riskData = riskScores.map((r) => ({
    time: formatTime(r.timestamp),
    risk: toNum(r.composite_risk),
    full: new Date(r.timestamp).toISOString(),
  }));

  const THEME = "#5ac8fa";
  const POSITIVE = "#34c759";
  const NEGATIVE = "#ff3b30";

  const changeDataWithSign = changeData.map((d) => ({
    ...d,
    positivePct: d.changePct != null && d.changePct >= 0 ? d.changePct : null,
    negativePct: d.changePct != null && d.changePct < 0 ? d.changePct : null,
  }));

  if (!priceData.length && !riskData.length && !volumeData.length && !changeData.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7">
        <h2 className="text-lg font-medium text-zinc-400">
          {symbol} — Price & risk
        </h2>
        <p className="mt-5 text-base text-zinc-500">No history yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {priceData.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7">
          <h2 className="text-lg font-medium text-theme">{symbol} — Price</h2>
          <p className="mt-1 text-sm text-zinc-500">Price over time (from periodic snapshots).</p>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={THEME} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} domain={["dataMin", "dataMax"]} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "10px" }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(value: number, _name: string, props: { payload?: Array<{ payload?: { priceChangePct?: number | null } }> }) => {
                    const row = props?.payload?.[0]?.payload;
                    const pct = row?.priceChangePct;
                    const pctStr = pct != null ? ` · 24h ${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%` : "";
                    return [`$${Number(value).toLocaleString()}${pctStr}`, "Price"];
                  }}
                />
                <Area type="monotone" dataKey="price" stroke={THEME} strokeWidth={2} fill="url(#priceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {riskData.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7">
          <h2 className="text-lg font-medium text-theme">{symbol} — Composite risk</h2>
          <p className="mt-1 text-sm text-zinc-500">Composite risk over time (higher = more unusual).</p>
          <div className="mt-5 h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} domain={["dataMin", "dataMax"]} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "10px" }} formatter={(value: number) => [Number(value).toFixed(2), "Risk"]} />
                <Line type="monotone" dataKey="risk" stroke={THEME} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {volumeData.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7">
          <h2 className="text-lg font-medium text-theme">{symbol} — 24h volume</h2>
          <p className="mt-1 text-sm text-zinc-500">Trading volume over time (from snapshots).</p>
          <div className="mt-5 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volumeData} margin={{ left: 0, right: 8 }}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={THEME} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={THEME} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} domain={["dataMin", "dataMax"]} tickFormatter={(v) => (Number(v) >= 1e9 ? `${(Number(v) / 1e9).toFixed(1)}B` : Number(v) >= 1e6 ? `${(Number(v) / 1e6).toFixed(1)}M` : Number(v) >= 1e3 ? `${(Number(v) / 1e3).toFixed(0)}K` : String(v))} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "10px" }} formatter={(value: number) => [typeof value === "number" && value >= 1e9 ? `${(value / 1e9).toFixed(2)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(2)}M` : value >= 1e3 ? `${(value / 1e3).toFixed(1)}K` : value, "Volume"]} />
                <Area type="monotone" dataKey="volume" stroke={THEME} strokeWidth={2} fill="url(#volGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      {changeData.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7">
          <h2 className="text-lg font-medium text-zinc-400">{symbol} — 24h % change</h2>
          <p className="mt-1 text-sm text-zinc-500">Price change vs 24h ago — <span className="text-positive">positive</span> / <span className="text-negative">negative</span>.</p>
          <div className="mt-5 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={changeDataWithSign} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="time" stroke="#71717a" fontSize={12} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={12} tickLine={false} domain={["dataMin", "dataMax"]} tickFormatter={(v) => `${Number(v).toFixed(1)}%`} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "10px" }}
                  formatter={(value: number, name: string) => {
                    const label = name === "positivePct" ? "24h change" : "24h change";
                    return [`${Number(value).toFixed(2)}%`, label];
                  }}
                />
                <Line type="monotone" dataKey="positivePct" stroke={POSITIVE} strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="negativePct" stroke={NEGATIVE} strokeWidth={2} dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
