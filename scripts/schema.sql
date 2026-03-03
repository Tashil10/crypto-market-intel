-- Crypto Market Intelligence Engine - Phase 1 schema
-- Run this against your Vercel Postgres or Neon database.

CREATE TABLE IF NOT EXISTS market_snapshots (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  symbol VARCHAR(20) NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  volume_24h DECIMAL(30, 2),
  market_cap DECIMAL(30, 2),
  price_change_24h DECIMAL(20, 8),
  price_change_pct_24h DECIMAL(10, 4)
);

CREATE TABLE IF NOT EXISTS risk_scores (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  symbol VARCHAR(20) NOT NULL,
  volatility_z DECIMAL(10, 4),
  volume_z DECIMAL(10, 4),
  composite_risk DECIMAL(10, 4),
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  symbol VARCHAR(20) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(255),
  summary TEXT,
  raw_metrics JSONB
);

CREATE INDEX IF NOT EXISTS idx_snapshots_symbol_ts ON market_snapshots(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_symbol_ts ON risk_scores(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
