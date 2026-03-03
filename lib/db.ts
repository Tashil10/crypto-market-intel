import { neon } from "@neondatabase/serverless";

function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "Missing DATABASE_URL. Set it in .env.local (e.g. from Neon or any Postgres provider)."
    );
  }
  return neon(connectionString);
}

export type MarketSnapshot = {
  id: number;
  timestamp: Date;
  symbol: string;
  price: number;
  volume_24h: number | null;
  market_cap: number | null;
  price_change_24h: number | null;
  price_change_pct_24h: number | null;
};

export type RiskScore = {
  id: number;
  timestamp: Date;
  symbol: string;
  volatility_z: number | null;
  volume_z: number | null;
  composite_risk: number | null;
  metadata: Record<string, unknown> | null;
};

export type Incident = {
  id: number;
  created_at: Date;
  symbol: string;
  severity: string;
  title: string | null;
  summary: string | null;
  raw_metrics: Record<string, unknown> | null;
};

const SNAPSHOTS_CAP_PER_SYMBOL = 500;

export async function insertSnapshot(row: {
  symbol: string;
  price: number;
  volume_24h: number | null;
  market_cap: number | null;
  price_change_24h: number | null;
  price_change_pct_24h: number | null;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO market_snapshots (symbol, price, volume_24h, market_cap, price_change_24h, price_change_pct_24h)
    VALUES (${row.symbol}, ${row.price}, ${row.volume_24h}, ${row.market_cap}, ${row.price_change_24h}, ${row.price_change_pct_24h})
  `;
  await sql`
    DELETE FROM market_snapshots a
    WHERE a.symbol = ${row.symbol}
    AND a.timestamp < (
      SELECT timestamp FROM market_snapshots
      WHERE symbol = ${row.symbol}
      ORDER BY timestamp DESC
      OFFSET ${SNAPSHOTS_CAP_PER_SYMBOL} LIMIT 1
    )
  `;
}

export async function getSnapshotsForSymbol(symbol: string, limit: number): Promise<MarketSnapshot[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, timestamp, symbol, price, volume_24h, market_cap, price_change_24h, price_change_pct_24h
    FROM market_snapshots
    WHERE symbol = ${symbol}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  return rows as MarketSnapshot[];
}

export async function getLatestSnapshotsBySymbol(): Promise<MarketSnapshot[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT DISTINCT ON (symbol) id, timestamp, symbol, price, volume_24h, market_cap, price_change_24h, price_change_pct_24h
    FROM market_snapshots
    ORDER BY symbol, timestamp DESC
  `;
  return rows as MarketSnapshot[];
}

export type TopByVolumeItem = {
  symbol: string;
  price: number;
  volume_24h: number | null;
  market_cap: number | null;
  price_change_pct_24h: number | null;
  timestamp?: string;
};

export async function getTopByVolumeSince(days: number, limit: number): Promise<TopByVolumeItem[]> {
  const sql = getSql();
  const safeDays = Math.max(1, Math.min(365, days));
  const rows = await sql`
    WITH windowed AS (
      SELECT
        symbol,
        AVG(volume_24h)::double precision AS avg_vol,
        (array_agg(price ORDER BY timestamp ASC))[1] AS first_price,
        (array_agg(price ORDER BY timestamp DESC))[1] AS last_price
      FROM market_snapshots
      WHERE timestamp > NOW() - (INTERVAL '1 day' * ${safeDays})
      GROUP BY symbol
    ),
    top AS (
      SELECT
        symbol,
        avg_vol,
        first_price,
        last_price,
        CASE WHEN first_price IS NOT NULL AND first_price <> 0
          THEN ((last_price - first_price) / first_price * 100)::double precision
          ELSE NULL END AS period_pct
      FROM windowed
      ORDER BY avg_vol DESC NULLS LAST
      LIMIT ${limit}
    )
    SELECT t.symbol, t.avg_vol AS volume_24h, t.last_price AS price, t.period_pct AS price_change_pct_24h, l.market_cap, l.timestamp
    FROM top t
    CROSS JOIN LATERAL (
      SELECT market_cap, timestamp
      FROM market_snapshots
      WHERE symbol = t.symbol
      ORDER BY timestamp DESC
      LIMIT 1
    ) l
  `;
  return (rows as Array<Record<string, unknown>>).map((r) => ({
    symbol: r.symbol as string,
    price: Number(r.price),
    volume_24h: r.volume_24h != null ? Number(r.volume_24h) : null,
    market_cap: r.market_cap != null ? Number(r.market_cap) : null,
    price_change_pct_24h: r.price_change_pct_24h != null ? Number(r.price_change_pct_24h) : null,
    timestamp: r.timestamp instanceof Date ? r.timestamp.toISOString() : String(r.timestamp ?? ""),
  }));
}

export async function getAllSymbols(): Promise<string[]> {
  const sql = getSql();
  const rows = await sql`SELECT DISTINCT symbol FROM market_snapshots ORDER BY symbol`;
  return (rows as { symbol: string }[]).map((r) => r.symbol);
}

function numOrNull(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  return n;
}

export async function insertRiskScore(row: {
  symbol: string;
  volatility_z: number | null;
  volume_z: number | null;
  composite_risk: number | null;
  metadata: Record<string, unknown> | null;
}) {
  const sql = getSql();
  const volZ = numOrNull(row.volatility_z);
  const volZVol = numOrNull(row.volume_z);
  const composite = numOrNull(row.composite_risk);
  const meta = row.metadata ?? {};
  const sanitizedMeta =
    typeof meta === "object" && meta !== null
      ? Object.fromEntries(
          Object.entries(meta).map(([k, v]) => [k, typeof v === "number" && Number.isNaN(v) ? null : v])
        )
      : {};
  await sql`
    INSERT INTO risk_scores (symbol, volatility_z, volume_z, composite_risk, metadata)
    VALUES (${row.symbol}, ${volZ}, ${volZVol}, ${composite}, ${JSON.stringify(sanitizedMeta)}::jsonb)
  `;
}

export async function getLatestRiskScores(): Promise<RiskScore[]> {
  const sql = getSql();
  // Get all rows from the latest batch. Use a 30s window so we include every symbol
  // even when INSERT timestamps differ by milliseconds.
  const rows = await sql`
    SELECT r.id, r.timestamp, r.symbol, r.volatility_z, r.volume_z, r.composite_risk, r.metadata
    FROM risk_scores r
    WHERE r.timestamp >= (SELECT MAX(timestamp) FROM risk_scores) - INTERVAL '30 seconds'
    ORDER BY r.timestamp DESC, r.composite_risk DESC NULLS LAST
  `;
  // Dedupe by symbol: keep only the latest row per symbol (in case of overlap).
  const bySymbol = new Map<string, RiskScore>();
  for (const r of rows as RiskScore[]) {
    if (!bySymbol.has(r.symbol)) bySymbol.set(r.symbol, r);
  }
  return Array.from(bySymbol.values()).sort(
    (a, b) => (numOrNull(b.composite_risk) ?? -1) - (numOrNull(a.composite_risk) ?? -1)
  );
}

export async function getRiskScoreHistory(symbol: string, limit: number): Promise<RiskScore[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, timestamp, symbol, volatility_z, volume_z, composite_risk, metadata
    FROM risk_scores
    WHERE symbol = ${symbol}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  return rows as RiskScore[];
}

export async function getSnapshotHistory(symbol: string, limit: number): Promise<MarketSnapshot[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, timestamp, symbol, price, volume_24h, market_cap, price_change_24h, price_change_pct_24h
    FROM market_snapshots
    WHERE symbol = ${symbol}
    ORDER BY timestamp DESC
    LIMIT ${limit}
  `;
  return rows as MarketSnapshot[];
}

export async function getLastIngestTime(): Promise<Date | null> {
  const sql = getSql();
  // Prefer risk_scores (when we have computed risk); fallback to market_snapshots
  // so "Last updated" moves when we at least ingest new prices.
  const riskRows = await sql`SELECT MAX(timestamp) as ts FROM risk_scores`;
  const riskTs = riskRows[0]?.ts;
  if (riskTs) return new Date(riskTs as string);
  const snapRows = await sql`SELECT MAX(timestamp) as ts FROM market_snapshots`;
  const snapTs = snapRows[0]?.ts;
  return snapTs ? new Date(snapTs as string) : null;
}

export async function insertIncident(row: {
  symbol: string;
  severity: string;
  title: string | null;
  summary: string | null;
  raw_metrics: Record<string, unknown> | null;
}) {
  const sql = getSql();
  await sql`
    INSERT INTO incidents (symbol, severity, title, summary, raw_metrics)
    VALUES (${row.symbol}, ${row.severity}, ${row.title ?? null}, ${row.summary ?? null}, ${row.raw_metrics ? JSON.stringify(row.raw_metrics) : null}::jsonb)
  `;
}

export async function getIncidentCount(): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT COUNT(*) as count FROM incidents`;
  const count = rows[0]?.count;
  return typeof count === "number" ? count : Number(count) || 0;
}

export async function getIncidentCountLast7Days(): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*) as count FROM incidents
    WHERE created_at > NOW() - INTERVAL '7 days'
  `;
  const count = rows[0]?.count;
  return typeof count === "number" ? count : Number(count) || 0;
}

export async function getIncidentCountSince(hours: number): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*) as count FROM incidents
    WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}
  `;
  const count = rows[0]?.count;
  return typeof count === "number" ? count : Number(count) || 0;
}

export async function getIncidentCountMissingSummary(): Promise<number> {
  const sql = getSql();
  const rows = await sql`
    SELECT COUNT(*) as count FROM incidents
    WHERE (summary IS NULL OR TRIM(summary) = '')
  `;
  const count = rows[0]?.count;
  return typeof count === "number" ? count : Number(count) || 0;
}

function toArray<T>(rows: unknown): T[] {
  if (Array.isArray(rows)) return rows as T[];
  if (rows != null && typeof rows === "object" && typeof (rows as { length?: number }).length === "number") {
    return Array.prototype.slice.call(rows) as T[];
  }
  if (rows != null && typeof rows === "object") return Object.values(rows) as T[];
  return [];
}

export async function getIncidents(limit: number): Promise<Incident[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, created_at, symbol, severity, title, summary, raw_metrics
    FROM incidents
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return toArray<Incident>(rows);
}

export async function hasRecentIncident(symbol: string, withinMinutes: number): Promise<boolean> {
  const sql = getSql();
  const intervalMinutes = Math.max(1, Math.min(1440, withinMinutes));
  const rows = await sql`
    SELECT 1 FROM incidents
    WHERE symbol = ${symbol}
    AND created_at > NOW() - (INTERVAL '1 minute' * ${intervalMinutes})
    LIMIT 1
  `;
  return Array.isArray(rows) && rows.length > 0;
}

export async function getIncidentsSince(hours: number): Promise<Incident[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, created_at, symbol, severity, title, summary, raw_metrics
    FROM incidents
    WHERE created_at > NOW() - INTERVAL '1 hour' * ${hours}
    ORDER BY created_at DESC
    LIMIT 500
  `;
  return toArray<Incident>(rows);
}

export async function getIncidentsMissingSummary(limit: number): Promise<Incident[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, created_at, symbol, severity, title, summary, raw_metrics
    FROM incidents
    WHERE (summary IS NULL OR TRIM(summary) = '')
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;
  return toArray<Incident>(rows);
}

export async function getIncidentById(id: number): Promise<Incident | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT id, created_at, symbol, severity, title, summary, raw_metrics
    FROM incidents
    WHERE id = ${id}
  `;
  return (rows[0] as Incident) ?? null;
}

export async function updateIncidentSummary(id: number, summary: string): Promise<void> {
  const sql = getSql();
  await sql`
    UPDATE incidents SET summary = ${summary} WHERE id = ${id}
  `;
}
