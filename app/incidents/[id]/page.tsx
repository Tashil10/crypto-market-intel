import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import IncidentDetailedReport from "@/components/IncidentDetailedReport";
import IncidentChart from "@/components/IncidentChart";
import { getIncidentById } from "@/lib/db";

const severityStyles: Record<string, string> = {
  critical: "border-red-500/50 bg-red-950/20 text-red-200",
  high: "border-amber-500/40 bg-amber-950/20 text-amber-200",
  medium: "border-yellow-500/30 bg-yellow-950/10 text-yellow-100",
  low: "border-zinc-600/50 bg-zinc-900/50 text-zinc-300",
};

export default async function IncidentPage({
  params,
}: {
  params: { id: string };
}) {
  const incident = await getIncidentById(Number(params.id));
  if (!incident) notFound();

  const style = severityStyles[incident.severity] ?? severityStyles.low;
  const metrics = incident.raw_metrics as Record<string, number> | null;

  return (
    <div className="min-h-screen bg-black">
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-8">
        <Link
          href="/"
          className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-300"
        >
          ← Dashboard
        </Link>
        <div className={`rounded-xl border px-6 py-6 ${style}`}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium">{incident.symbol}</span>
            <span className="text-zinc-500">·</span>
            <span className="capitalize text-zinc-400">{incident.severity}</span>
            <span className="text-zinc-500">·</span>
            <span className="text-zinc-500">
              {new Date(incident.created_at).toLocaleString()}
            </span>
          </div>
          {incident.title && (
            <h2 className="mt-3 text-lg font-semibold text-white">
              {incident.title}
            </h2>
          )}
          {incident.summary && (
            <div className="mt-2">
              <p className="text-xs font-medium tracking-wider text-zinc-500">
                AI-generated summary
              </p>
              <p className="mt-1 leading-relaxed text-zinc-300">{incident.summary}</p>
            </div>
          )}
          <IncidentDetailedReport incidentId={incident.id} />
          <IncidentChart incidentId={incident.id} />
          {metrics && Object.keys(metrics).length > 0 && (
            <>
              <p className="mt-4 text-xs text-zinc-500">
                Raw metrics: volatility_z and volume_z are in standard deviations; composite_risk is the combined score. These drove the anomaly flag.
              </p>
              <dl className="mt-2 grid gap-2 text-sm">
              {Object.entries(metrics).map(([key, value]) =>
                value != null && typeof value === "number" && !Number.isNaN(value) ? (
                  <div key={key} className="flex justify-between gap-4">
                    <dt className="text-zinc-500">{key}</dt>
                    <dd className="text-zinc-300">
                      {typeof value === "number"
                        ? value.toFixed(4)
                        : String(value)}
                    </dd>
                  </div>
                ) : null
              )}
            </dl>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
