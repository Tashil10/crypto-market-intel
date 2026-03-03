type Item = {
  symbol: string;
  price: number;
  volume_24h: number | null;
  market_cap: number | null;
  price_change_pct_24h: number | null;
  timestamp?: string;
};

export default function TopCryptoList({
  items,
  title = "Top by 24h volume",
  showPriceChange = true,
}: {
  items: Item[];
  title?: string;
  /** Show 24h % change (only meaningful for "Top by 24h volume"; for week/month/year we show avg vol only) */
  showPriceChange?: boolean;
}) {
  if (!items?.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
        <h3 className="text-sm font-medium uppercase tracking-wider text-theme">{title}</h3>
        <p className="mt-2 text-base text-zinc-500">No data yet.</p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
      <h3 className="text-sm font-medium uppercase tracking-wider text-theme">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {items.map((s) => {
          const vol = s.volume_24h != null ? (s.volume_24h >= 1e9 ? `${(s.volume_24h / 1e9).toFixed(2)}B` : s.volume_24h >= 1e6 ? `${(s.volume_24h / 1e6).toFixed(2)}M` : s.volume_24h >= 1e3 ? `${(s.volume_24h / 1e3).toFixed(1)}K` : String(s.volume_24h)) : "—";
          const pct = s.price_change_pct_24h != null ? Number(s.price_change_pct_24h) : null;
          const chg = showPriceChange && pct != null && !Number.isNaN(pct)
            ? `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`
            : null;
          return (
            <li key={s.symbol} className="flex items-center justify-between gap-3 py-0.5 text-base">
              <span className="font-medium text-zinc-300">{s.symbol}</span>
              <span className="text-zinc-500 shrink-0">Vol {vol}</span>
              {chg != null && (
                <span className={`shrink-0 font-medium ${pct != null && pct >= 0 ? "text-positive" : "text-negative"}`}>
                  {chg}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
