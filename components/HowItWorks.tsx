export default function HowItWorks() {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl">
      <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium uppercase tracking-wider text-theme-muted transition hover:text-theme [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          How it works
          <span className="inline-block text-zinc-600 transition-transform group-open:rotate-180" aria-hidden>
            ▼
          </span>
        </span>
      </summary>
      <div className="border-t border-white/10 px-4 pb-4 pt-3 text-base text-zinc-400 space-y-3">
        <p>
          <strong className="text-zinc-300">What you&apos;re seeing:</strong> This dashboard shows live risk scores for top crypto assets. &quot;Risk&quot; here means how unusual recent price swings and trading volume are compared to each asset&apos;s own recent history—not a prediction, just a measure of how far current behavior is from normal.
        </p>
        <p>
          <strong className="text-zinc-300">The numbers:</strong>
        </p>
        <p className="text-zinc-500 text-base">
          Metrics are based on 24h trading volume and 24h price change—the timeframe many swing traders use.
        </p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li><strong className="text-zinc-300">Composite</strong> — A single score (roughly 0–100) that combines how extreme recent volatility and volume are. Higher = more unusual activity.</li>
          <li><strong className="text-zinc-300">Vol (z)</strong> — Volume z-score: how many &quot;standard deviations&quot; above normal today&apos;s 24h trading volume is (e.g. 2 = unusually high volume).</li>
          <li><strong className="text-zinc-300">Volatility (z)</strong> — The same idea for 24h price change, when we have enough history to compute it.</li>
        </ul>
        <p>
          <strong className="text-zinc-300">What this means for you (buy / sell / hold):</strong> This dashboard does <em>not</em> tell you to buy or sell. It highlights when the market is behaving unusually so you can make more informed decisions. <strong className="text-zinc-300">High composite or high Vol (z)</strong> means unusual volume or volatility—could be news, a breakout, or a spike. Use it as a signal to look into the cause (e.g. news, liquidations) rather than to FOMO buy or panic sell. <strong className="text-zinc-300">Low or moderate scores</strong> mean calmer conditions; often a neutral time to hold or wait for clearer catalysts. Always combine this with your own research; this is not financial advice.
        </p>
        <p>
          <strong className="text-zinc-300">Messages / anomalies:</strong> When either z-score crosses a threshold (volume ≥ 2, volatility ≥ 2.5), we record an &quot;incident&quot; and show it here. That helps you spot moments when the market is doing something statistically unusual—useful for monitoring risk or finding potential catalysts (news, liquidations, or sentiment shifts).
        </p>
        <p>
          <strong className="text-zinc-300">Charts:</strong> Price and composite risk over time for the selected asset so you can see how risk evolved and whether it led to or followed big moves.
        </p>
      </div>
    </details>
  );
}
