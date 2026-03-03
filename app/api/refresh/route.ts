import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const base = request.nextUrl.origin;
  const secret = process.env.CRON_SECRET;
  const url = secret ? `${base}/api/cron/ingest?secret=${secret}` : `${base}/api/cron/ingest`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refresh failed" },
      { status: 500 }
    );
  }
}
