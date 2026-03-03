import Link from "next/link";

type Incident = {
  id: number;
  created_at: string | Date;
  symbol: string;
  severity: string;
  title: string | null;
  summary: string | null;
  raw_metrics: Record<string, unknown> | null;
};

type RiskScore = {
  symbol: string;
  volatility_z: number | null;
  volume_z: number | null;
};

const severityStyles: Record<string, string> = {
  critical: "border-negative/50 bg-negative-subtle text-negative",
  high: "border-amber-500/40 bg-amber-950/20 text-amber-200",
  medium: "border-yellow-500/30 bg-yellow-950/10 text-yellow-100",
  low: "border-zinc-600/50 bg-zinc-900/50 text-zinc-300",
};

export default function Messages({
  incidents,
  incidentCount,
  incidentCountInTimeframe = 0,
  riskScores = [],
  timeframeLabel = "last 7 days",
}: {
  incidents: Incident[];
  incidentCount: number;
  incidentCountInTimeframe?: number;
  riskScores?: RiskScore[];
  timeframeLabel?: string;
}) {
  const statsLine = (
    <p className="mb-4 text-base text-zinc-500">
      {incidentCountInTimeframe} anomal{incidentCountInTimeframe !== 1 ? "ies" : "y"} in the {timeframeLabel}
      {incidents.length > 0 && (
        <>
          {" · "}
          Latest:{" "}
          <Link
            href={`/incidents/${incidents[0].id}`}
            className="text-theme-muted underline hover:text-theme transition"
          >
            {new Date(incidents[0].created_at).toLocaleString()}
          </Link>
        </>
      )}
    </p>
  );

  const hasIncidents = Array.isArray(incidents) && incidents.length > 0;
  if (!hasIncidents) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h2 className="text-lg font-medium text-theme">Messages</h2>
        <p className="mt-1 text-sm text-zinc-500">Anomalies from the {timeframeLabel}.</p>
        {statsLine}
        {incidentCount > 0 && (
          <p className="mt-2 text-sm text-amber-200/90">
            List didn’t load. Try refreshing.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <h2 className="text-lg font-medium text-theme">Messages</h2>
      {statsLine}
      <div className="mt-4 space-y-4 max-h-80 overflow-y-auto">
        {incidents.map((inc, index) => {
          const style = severityStyles[inc.severity] ?? severityStyles.low;
          const time = new Date(inc.created_at).toLocaleString();
          const metrics = inc.raw_metrics as Record<string, number> | null;
          const volZ = metrics?.volatility_z;
          const volumeZ = metrics?.volume_z;
          const composite = metrics?.composite_risk;
          const isLatest = index === 0;
          return (
            <div
              key={inc.id}
              className={`rounded-card border px-4 py-3.5 text-lg ${style}`}
            >
              {isLatest && (
                <span className="mb-2 inline-block rounded-lg bg-theme-subtle px-2.5 py-1 text-sm font-medium text-theme">
                  Latest
                </span>
              )}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="font-medium">{inc.symbol}</span>
                <span className="text-zinc-500">·</span>
                <span className="capitalize text-zinc-400">{inc.severity}</span>
                <span className="text-zinc-500">·</span>
                <span className="text-zinc-500">{time}</span>
              </div>
              {inc.title && (
                <p className="mt-1 font-medium text-zinc-200">{inc.title}</p>
              )}
              {inc.summary && (
                <div className="mt-1">
                  <p className="text-base font-medium tracking-wider text-zinc-500">
                    AI-generated summary
                  </p>
                  <p className="mt-0.5 leading-relaxed text-zinc-400">{inc.summary}</p>
                </div>
              )}
              {(volZ != null || volumeZ != null || composite != null) && (
                <p className="mt-2 text-base text-zinc-500">
                  {volZ != null && `Volatility z: ${Number(volZ).toFixed(2)}`}
                  {volZ != null && (volumeZ != null || composite != null) && " · "}
                  {volumeZ != null && `Volume z: ${Number(volumeZ).toFixed(2)}`}
                  {volumeZ != null && composite != null && " · "}
                  {composite != null && `Composite: ${Number(composite).toFixed(2)}`}
                </p>
              )}
              <Link
                href={`/incidents/${inc.id}`}
                className="mt-2 inline-block text-base text-theme-muted underline hover:text-theme transition"
              >
                View report
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
