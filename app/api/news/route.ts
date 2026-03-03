import { NextResponse } from "next/server";

export type NewsItem = {
  title: string;
  url: string;
  description?: string;
  source?: string;
  date?: string;
};

function toNewsItem(raw: Record<string, unknown>): NewsItem {
  const title = (raw.title ?? "") as string;
  const url = (raw.original_url ?? raw.url ?? "#") as string;
  const src = raw.source as Record<string, unknown> | undefined;
  const source = (src?.title ?? "") as string;
  const desc = (raw.description ?? "") as string;
  const date = (raw.published_at ?? raw.created_at ?? "") as string;
  return {
    title: typeof title === "string" && title.trim() ? title : "Untitled",
    url: typeof url === "string" && url !== "" ? url : "#",
    description: typeof desc === "string" && desc.trim() ? desc : undefined,
    source: typeof source === "string" && source.trim() ? source : undefined,
    date: typeof date === "string" && date.trim() ? date : undefined,
  };
}

function extractResults(data: unknown): unknown[] {
  if (data == null || typeof data !== "object") return [];
  const o = data as Record<string, unknown>;
  if (Array.isArray(o.results)) return o.results;
  if (Array.isArray(o.data)) return o.data;
  if (Array.isArray(o.posts)) return o.posts;
  if (Array.isArray(o)) return o;
  if (Array.isArray((o.data as Record<string, unknown>)?.results)) return (o.data as Record<string, unknown>).results as unknown[];
  return [];
}

const CRYPTOPANIC_BASE = "https://cryptopanic.com/api/developer/v2";

export async function GET() {
  const apiKey = process.env.CRYPTOPANIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ news: [] as NewsItem[] });
  }
  try {
    const url = `${CRYPTOPANIC_BASE}/posts/?auth_token=${encodeURIComponent(apiKey)}&public=true&kind=news`;
    const res = await fetch(url, { next: { revalidate: 300 }, headers: { Accept: "application/json" } });
    if (!res.ok) {
      return NextResponse.json({ news: [] as NewsItem[] });
    }
    const data = (await res.json()) as { results?: unknown[] };
    const results = extractResults(data);
    const news: NewsItem[] = results.slice(0, 15).map((r) => toNewsItem((r as Record<string, unknown>) ?? {}));
    return NextResponse.json({ news });
  } catch {
    return NextResponse.json({ news: [] as NewsItem[] });
  }
}
