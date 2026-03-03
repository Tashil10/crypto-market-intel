const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.1-8b-instant";

export async function generateIncidentSummary(
  symbol: string,
  severity: string,
  rawMetrics: Record<string, unknown> | null
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const metrics = rawMetrics ?? {};
  const volZ = metrics.volatility_z;
  const volumeZ = metrics.volume_z;
  const composite = metrics.composite_risk;

  const userContent = `Crypto market anomaly: ${symbol}, severity ${severity}.
Metrics: volatility_z=${volZ ?? "n/a"}, volume_z=${volumeZ ?? "n/a"}, composite_risk=${composite ?? "n/a"}.

Write 2–4 sentences in plain language that:
1) Describe what happened (e.g. "${symbol} had unusually high 24h trading volume compared to recent days").
2) Briefly explain what the numbers mean (e.g. "A volume z-score of 2.3 means volume was about 2.3 standard deviations above its recent average").
3) Say why it matters (e.g. "This can signal increased interest, a news event, or liquidity shifts; worth watching for follow-through or mean reversion.").
No preamble, no labels. Write only the paragraph.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a quantitative analyst explaining to a non-expert. Be clear and concise. Reply with exactly 2–4 sentences. No quotes or section headers.",
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export type ChartSnapshot = {
  timestamp: string;
  price: number;
  volume_24h?: number | null;
  price_change_pct_24h?: number | null;
};
export type ChartRiskPoint = { timestamp: string; composite_risk: number | null };

export async function generateChartInsight(
  symbol: string,
  snapshots: ChartSnapshot[],
  riskScores: ChartRiskPoint[],
  dashboardContext?: string
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const toNum = (v: number | null | undefined) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
  const prices = snapshots.map((s) => toNum(s.price)).filter((p): p is number => p !== null);
  const risks = riskScores.map((r) => toNum(r.composite_risk)).filter((r): r is number => r !== null);
  const volumes = snapshots.map((s) => toNum(s.volume_24h)).filter((v): v is number => v !== null);
  const changes = snapshots.map((s) => toNum(s.price_change_pct_24h)).filter((c): c is number => c !== null);
  const priceMin = prices.length ? Math.min(...prices) : null;
  const priceMax = prices.length ? Math.max(...prices) : null;
  const riskMin = risks.length ? Math.min(...risks) : null;
  const riskMax = risks.length ? Math.max(...risks) : null;
  const priceTrend = prices.length >= 2 ? (prices[prices.length - 1] >= prices[0] ? "up" : "down") : "unknown";
  const riskTrend = risks.length >= 2 ? (risks[risks.length - 1] >= risks[0] ? "up" : "down") : "unknown";
  const volumeTrend = volumes.length >= 2 ? (volumes[volumes.length - 1] >= volumes[0] ? "up" : "down") : "unknown";
  const changeTrend = changes.length >= 2 ? (changes[changes.length - 1] >= changes[0] ? "up" : "down") : "unknown";

  const userContent = `${dashboardContext ? `Dashboard context: ${dashboardContext}\n\n` : ""}Chart data for ${symbol}:
Price: min ${priceMin ?? "n/a"}, max ${priceMax ?? "n/a"}, trend: ${priceTrend}.
Composite risk: min ${riskMin ?? "n/a"}, max ${riskMax ?? "n/a"}, trend: ${riskTrend}.
Volume (24h): trend ${volumeTrend}.
24h % change: trend ${changeTrend}.

Write a short reply in this exact format (use these labels on their own line):
Context: [One blanket sentence about the current market environment—e.g. "Right now the market is showing moderate unusual activity in several assets."]
This chart: [1–2 sentences about what this symbol's price, risk, and volume are showing.]
Do: [One short sentence—e.g. "Consider holding or waiting for a clearer catalyst."]
Don't: [One short sentence—e.g. "Avoid FOMO buying on spikes without checking news."]
End with: This is not financial advice.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a friendly quantitative analyst. Write in a human, conversational tone. Use the exact labels Context:, This chart:, Do:, Don't: each on their own line. Be clear about what to do and what not to do. Always end with: This is not financial advice.",
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 280,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export type RiskScoreForRecommendation = {
  symbol: string;
  composite_risk: number | null;
  volume_z: number | null;
  volatility_z: number | null;
};

export type SnapshotForRecommendation = {
  symbol: string;
  price: number;
  volume_24h: number | null;
  market_cap: number | null;
  price_change_pct_24h: number | null;
};

export async function generateBuyRecommendation(
  riskScores: RiskScoreForRecommendation[],
  topByVolume: SnapshotForRecommendation[]
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const riskSummary = riskScores
    .slice(0, 10)
    .map((r) => `${r.symbol}: composite=${r.composite_risk ?? "n/a"}, vol_z=${r.volume_z ?? "n/a"}`)
    .join("; ");
  const volumeSummary = topByVolume
    .slice(0, 10)
    .map((s) => `${s.symbol}: vol_24h=${s.volume_24h ?? "n/a"}, mcap=${s.market_cap ?? "n/a"}, chg_24h%=${s.price_change_pct_24h ?? "n/a"}`)
    .join("; ");

  const userContent = `Current risk scores (top symbols): ${riskSummary}.
Top by 24h volume: ${volumeSummary}.

Write one short sentence (max 25 words) that suggests which asset is most notable right now based on this data—e.g. "Based on risk and volume, BTC is the most stable; DOGE is showing unusual interest." Or "Risk is elevated across several assets; no single standout for buying." Be neutral and educational. End with: "This is not financial advice."`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a quantitative analyst. Give one short, neutral sentence based only on the data. Always end with: This is not financial advice. No quotes or labels.",
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 80,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

export type IncidentForDetailedReport = {
  symbol: string;
  severity: string;
  summary: string | null;
  raw_metrics: Record<string, unknown> | null;
};

export async function generateIncidentDetailedReport(
  incident: IncidentForDetailedReport
): Promise<string | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  const metrics = incident.raw_metrics ?? {};
  const volZ = metrics.volatility_z;
  const volumeZ = metrics.volume_z;
  const composite = metrics.composite_risk;

  const userContent = `Crypto anomaly: ${incident.symbol}, severity ${incident.severity}.
Metrics: volatility_z=${volZ ?? "n/a"}, volume_z=${volumeZ ?? "n/a"}, composite_risk=${composite ?? "n/a"}.
${incident.summary ? `Short summary we already have: ${incident.summary}` : ""}

Write a detailed report in this exact format (use these labels on their own line):
What happened: [1–2 sentences in plain language describing the anomaly.]
What the numbers mean: [1–2 sentences interpreting volatility_z, volume_z, and composite_risk for a beginner—e.g. what a z-score of 2 means.]
What to do: [One short sentence—e.g. "Worth watching for follow-through; consider waiting for confirmation before acting."]
What not to do: [One short sentence—e.g. "Avoid panic selling or FOMO buying on the spike alone."]
End with: This is not financial advice.`;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: "system",
            content:
              "You are a friendly quantitative analyst. Use the exact labels What happened:, What the numbers mean:, What to do:, What not to do: each on their own line. Be human and clear. Always end with: This is not financial advice.",
          },
          { role: "user", content: userContent },
        ],
        max_tokens: 320,
        temperature: 0.3,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}
