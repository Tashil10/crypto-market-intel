import type { MarketSnapshot } from "./db";

const ROLLING_WINDOW = 24;
const VOLATILITY_Z_THRESHOLD = 2.5;
const VOLUME_Z_THRESHOLD = 2;
const COMPOSITE_WEIGHT_VOLATILITY = 0.6;
const COMPOSITE_WEIGHT_VOLUME = 0.4;

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[], avg?: number): number {
  if (arr.length < 2) return 0;
  const m = avg ?? mean(arr);
  const variance = arr.reduce((sum, x) => sum + (x - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function toNumberOrNull(n: number | null | undefined): number | null {
  if (n == null || Number.isNaN(n)) return null;
  return n;
}

export function computeZScore(value: number, historical: number[]): number | null {
  if (historical.length < 2) return null;
  const avg = mean(historical);
  const s = std(historical, avg);
  if (s === 0) return null;
  const z = (value - avg) / s;
  return toNumberOrNull(z);
}

export type RiskResult = {
  symbol: string;
  volatility_z: number | null;
  volume_z: number | null;
  composite_risk: number | null;
  metadata: { rollingMeanPct?: number; rollingStdPct?: number; rollingMeanVol?: number; rollingStdVol?: number };
};

export function computeRisk(
  symbol: string,
  currentPct24h: number | null,
  currentVolume24h: number,
  snapshots: MarketSnapshot[]
): RiskResult {
  const sorted = [...snapshots].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const window = sorted.slice(0, ROLLING_WINDOW);

  const pctValues = window
    .map((s) => s.price_change_pct_24h)
    .filter((v): v is number => v != null);
  const volValues = window.map((s) => Number(s.volume_24h ?? 0)).filter((v) => v > 0);

  const volatility_z =
    currentPct24h != null && pctValues.length >= 2
      ? computeZScore(currentPct24h, pctValues)
      : null;
  const volume_z =
    volValues.length >= 2 ? computeZScore(currentVolume24h, volValues) : null;

  const absVolZ = volatility_z != null ? Math.abs(volatility_z) : 0;
  const volZ = volume_z != null ? Math.max(0, volume_z) : 0;
  const composite_risk =
    absVolZ > 0 || volZ > 0
      ? Math.min(100, (COMPOSITE_WEIGHT_VOLATILITY * absVolZ + COMPOSITE_WEIGHT_VOLUME * volZ) * 10)
      : null;

  const metadata: RiskResult["metadata"] = {};
  const mPct = pctValues.length ? mean(pctValues) : null;
  const sPct = pctValues.length >= 2 ? std(pctValues) : null;
  const mVol = volValues.length ? mean(volValues) : null;
  const sVol = volValues.length >= 2 ? std(volValues) : null;
  const _mPct = toNumberOrNull(mPct); if (_mPct != null) metadata.rollingMeanPct = _mPct;
  const _sPct = toNumberOrNull(sPct); if (_sPct != null) metadata.rollingStdPct = _sPct;
  const _mVol = toNumberOrNull(mVol); if (_mVol != null) metadata.rollingMeanVol = _mVol;
  const _sVol = toNumberOrNull(sVol); if (_sVol != null) metadata.rollingStdVol = _sVol;

  return {
    symbol,
    volatility_z: toNumberOrNull(volatility_z),
    volume_z: toNumberOrNull(volume_z),
    composite_risk: toNumberOrNull(composite_risk),
    metadata,
  };
}

export function isAnomaly(volatility_z: number | null, volume_z: number | null): boolean {
  if (volatility_z != null && Math.abs(volatility_z) >= VOLATILITY_Z_THRESHOLD) return true;
  if (volume_z != null && volume_z >= VOLUME_Z_THRESHOLD) return true;
  return false;
}

export function severityFromComposite(composite_risk: number | null): "low" | "medium" | "high" | "critical" {
  if (composite_risk == null) return "low";
  if (composite_risk >= 70) return "critical";
  if (composite_risk >= 50) return "high";
  if (composite_risk >= 30) return "medium";
  return "low";
}
