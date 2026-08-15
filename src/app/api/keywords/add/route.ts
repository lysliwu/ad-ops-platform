import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { KeywordCandidate } from "@/lib/keywordResearch";

// The actual "keyword update" step — takes reviewed/selected candidates and
// writes them onto the ad group as real Keyword rows.
export async function POST(request: NextRequest) {
  const { adGroupId, keywords }: { adGroupId: string; keywords: KeywordCandidate[] } =
    await request.json();

  const adGroup = await prisma.adGroup.findUnique({ where: { id: adGroupId } });
  if (!adGroup) {
    return NextResponse.json({ error: "adGroup not found" }, { status: 404 });
  }

  const existing = new Set(
    (await prisma.keyword.findMany({ where: { adGroupId }, select: { text: true } })).map((k) =>
      k.text.toLowerCase()
    )
  );

  const fresh = (keywords ?? []).filter(
    (k) => k.keyword && !existing.has(k.keyword.toLowerCase())
  );

  const created = await Promise.all(
    fresh.map((k) =>
      prisma.keyword.create({
        data: {
          adGroupId,
          text: k.keyword,
          matchType: "PHRASE",
          status: "Active",
          impressions: 0,
          clicks: 0,
          ctr: 0,
          spend: 0,
          avgCpc: 0,
          currentBid: adGroup.avgCpc || 0.8,
          intent: k.intent,
          source: k.source,
          notes: k.notes,
        },
      })
    )
  );

  return NextResponse.json({ keywords: created });
}
