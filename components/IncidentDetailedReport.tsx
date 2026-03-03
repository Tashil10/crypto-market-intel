"use client";

import { useEffect, useState } from "react";

export default function IncidentDetailedReport({ incidentId }: { incidentId: number }) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/incidents/${incidentId}/detailed-report`);
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!cancelled) setReport(json?.detailedReport ?? null);
      } catch {
        if (!cancelled) setReport(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [incidentId]);

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/30 px-4 py-3">
        <p className="text-xs font-medium tracking-wider text-zinc-500">Detailed insight</p>
        <p className="mt-1 text-sm text-zinc-500">Generating…</p>
      </div>
    );
  }
  if (!report) return null;

  return (
    <div className="mt-4 rounded-lg border border-zinc-700 bg-zinc-900/30 px-4 py-3">
      <p className="text-xs font-medium tracking-wider text-zinc-500">Detailed insight</p>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-300">
        {report.split(/\n+/).map((line, i) => {
          const t = line.trim();
          if (!t) return null;
          if (/^What happened:/.test(t)) return <p key={i}><strong className="text-zinc-200">What happened:</strong> {t.replace(/^What happened:\s*/i, "")}</p>;
          if (/^What the numbers mean:/.test(t)) return <p key={i}><strong className="text-zinc-200">What the numbers mean:</strong> {t.replace(/^What the numbers mean:\s*/i, "")}</p>;
          if (/^What to do:/.test(t)) return <p key={i}><strong className="text-emerald-400/90">What to do:</strong> {t.replace(/^What to do:\s*/i, "")}</p>;
          if (/^What not to do:/.test(t)) return <p key={i}><strong className="text-amber-400/90">What not to do:</strong> {t.replace(/^What not to do:\s*/i, "")}</p>;
          return <p key={i}>{t}</p>;
        })}
      </div>
    </div>
  );
}
