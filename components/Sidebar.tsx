import TopCryptoList from "@/components/TopCryptoList";
import AIBuyRecommendation from "@/components/AIBuyRecommendation";

type TopByVolumeItem = {
  symbol: string;
  price: number;
  volume_24h: number | null;
  market_cap: number | null;
  price_change_pct_24h: number | null;
  timestamp?: string;
};

type RiskScore = {
  symbol: string;
  composite_risk: number | null;
  volume_z: number | null;
  volatility_z?: number | null;
};

export default function Sidebar({
  topByVolume,
  riskScores,
}: {
  topByVolume: TopByVolumeItem[];
  riskScores: RiskScore[];
}) {
  return (
    <div className="space-y-6">
      <AIBuyRecommendation riskScores={riskScores} topByVolume={topByVolume} />
      <TopCryptoList items={topByVolume} title="Top by 24h volume" showPriceChange />
    </div>
  );
}
