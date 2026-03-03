import { NextResponse } from "next/server";
import {
  generateBuyRecommendation,
  type RiskScoreForRecommendation,
  type SnapshotForRecommendation,
} from "@/lib/groq";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const riskScores = Array.isArray(body.riskScores) ? body.riskScores : [];
    const topByVolume = Array.isArray(body.topByVolume) ? body.topByVolume : [];
    const recommendation = await generateBuyRecommendation(
      riskScores as RiskScoreForRecommendation[],
      topByVolume as SnapshotForRecommendation[]
    );
    return NextResponse.json({ recommendation: recommendation ?? null });
  } catch (e) {
    console.error("buy-recommendation", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Recommendation failed" },
      { status: 500 }
    );
  }
}
