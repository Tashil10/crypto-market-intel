"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Snapshot = { timestamp: string; price: number };
type RiskPoint = { timestamp: string; composite_risk: number | null };

function formatTime(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function IncidentChart({ incidentId }: { incidentId: number }) {
  const [data, setData] = useState<{ symbol: string; snapshots: Snapshot[]; riskScores: RiskPoint[] } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/incidents/${incidentId}/chart`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  if (!data || (!data.snapshots?.length && !data.riskScores?.length)) return null;

  const priceData = (data.snapshots ?? []).map((s) => ({
    time: formatTime(s.timestamp),
    price: Number(s.price),
  }));
  const riskData = (data.riskScores ?? []).map((r) => ({
    time: formatTime(r.timestamp),
    risk: r.composite_risk != null ? Number(r.composite_risk) : 0,
  }));

  return (
    <div className="mt-4 space-y-3">
      <p className="text-xs font-medium tracking-wider text-zinc-500">Context around this time</p>
      <div className="rounded-lg border border-zinc-700 bg-zinc-900/30 p-3">
        {priceData.length > 0 && (
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ left: 0, right: 4 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={["dataMin", "dataMax"]} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} width={40} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", fontSize: 11 }} formatter={(value: number) => [`$${Number(value).toLocaleString()}`, "Price"]} />
                <Line type="monotone" dataKey="price" stroke="#fafafa" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        {riskData.length > 0 && (
          <div className="mt-2 h-24">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={riskData} margin={{ left: 0, right: 4 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" fontSize={10} tickLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} domain={["dataMin", "dataMax"]} width={32} />
                <Tooltip contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", fontSize: 11 }} formatter={(value: number) => [Number(value).toFixed(2), "Risk"]} />
                <Line type="monotone" dataKey="risk" stroke="#a1a1aa" strokeWidth={1} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
