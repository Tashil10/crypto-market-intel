const COINGECKO_MARKETS_URL =
  "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h";

export type CoinGeckoMarket = {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  total_volume: number;
  price_change_24h: number | null;
  price_change_percentage_24h: number | null;
};

export async function fetchMarkets(): Promise<CoinGeckoMarket[]> {
  const res = await fetch(COINGECKO_MARKETS_URL, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`CoinGecko error: ${res.status}`);
  const data = await res.json();
  return data.map((c: Record<string, unknown>) => ({
    id: c.id,
    symbol: (c.symbol as string).toUpperCase(),
    name: c.name,
    current_price: Number(c.current_price),
    market_cap: Number(c.market_cap ?? 0),
    total_volume: Number(c.total_volume ?? 0),
    price_change_24h: c.price_change_24h != null ? Number(c.price_change_24h) : null,
    price_change_percentage_24h:
      c.price_change_percentage_24h != null ? Number(c.price_change_percentage_24h) : null,
  }));
}
