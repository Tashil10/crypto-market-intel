type RiskScore = {
  symbol: string;
  volatility_z: number | null;
  volume_z: number | null;
  composite_risk: number | null;
  timestamp?: string | Date;
};

function formatRiskValue(value: number | null | undefined): string {
  if (value == null) return "—";
  const n = Number(value);
  return Number.isNaN(n) ? "—" : n.toFixed(2);
}

function compositeColor(composite: number | null | undefined): string {
  if (composite == null || Number.isNaN(Number(composite))) return "text-zinc-400";
  const n = Number(composite);
  if (n >= 50) return "text-negative";
  if (n <= 20) return "text-positive";
  return "text-zinc-400";
}

export default function RiskGauge({ riskScores }: { riskScores: RiskScore[] }) {
  if (!riskScores.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
        <h2 className="text-lg font-medium text-theme">Risk scores</h2>
        <p className="mt-5 text-base text-zinc-500">
          No data yet. Click Refresh to fetch market data.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
      <h2 className="text-lg font-medium text-theme">Risk scores</h2>
      <p className="mt-2 text-base text-zinc-500 leading-relaxed">
        Higher composite = more unusual recent volatility/volume. Z-scores show how many standard deviations above normal. High scores = unusual activity (watch for news); low = calmer market. Use with your own research—not buy/sell advice.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="pb-3 pt-1 font-medium">Symbol</th>
              <th className="pb-3 pt-1 font-medium" title="Combined risk score (0–100 scale). Higher = more unusual.">Composite</th>
              <th className="pb-3 pt-1 font-medium" title="Volume z-score: how unusual 24h volume is vs recent average.">Vol (z)</th>
              <th className="pb-3 pt-1 font-medium" title="Volatility z-score: how unusual 24h price change is vs recent average.">Volatility (z)</th>
            </tr>
          </thead>
          <tbody>
            {riskScores.map((r) => (
              <tr key={r.symbol} className="border-b border-zinc-800/50 transition hover:bg-zinc-800/20">
                <td className="py-3.5 font-medium text-white">{r.symbol}</td>
                <td className={`py-3.5 font-medium ${compositeColor(r.composite_risk)}`}>
                  {formatRiskValue(r.composite_risk)}
                </td>
                <td className="py-3.5 text-zinc-400">
                  {formatRiskValue(r.volume_z)}
                </td>
                <td className="py-3.5 text-zinc-400">
                  {formatRiskValue(r.volatility_z)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
