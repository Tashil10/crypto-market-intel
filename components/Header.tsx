export default function Header() {
  return (
    <header className="w-full border-b border-white/10 px-6 py-8">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          <span className="text-theme">Crypto</span> Market Intelligence Engine
        </h1>
        <p className="mt-3 text-base leading-relaxed text-theme-muted">
          Real-time crypto volatility and liquidity. Z-score anomaly detection,
          composite risk scores, AI incident summaries, chart insights, and
          news—all in one dashboard.
        </p>
      </div>
    </header>
  );
}
