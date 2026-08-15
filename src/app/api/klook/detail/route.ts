import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adGroupName = searchParams.get("adGroupName") ?? "";
  const primaryName = adGroupName.split("·")[0].trim();

  const adGroup = await prisma.adGroup.findFirst({
    where: { name: primaryName },
    include: { campaign: true, keywords: { orderBy: { clicks: "desc" } } },
  });

  if (!adGroup) {
    return NextResponse.json({ found: false });
  }

  return NextResponse.json({
    found: true,
    campaignName: adGroup.campaign.name,
    groupSpend: adGroup.spend,
    avgCpc: adGroup.avgCpc,
    selfBidPrice: adGroup.selfBidPrice || adGroup.avgCpc,
    keywords: adGroup.keywords.map((k) => ({
      id: k.id,
      text: k.text,
      matchType: k.matchType,
      impressions: k.impressions,
      clicks: k.clicks,
      ctr: k.ctr,
      spend: k.spend,
      avgCpc: k.avgCpc,
      convRate: k.convRate,
      qualityScore: k.qualityScore,
      currentBid: k.currentBid,
    })),
  });
}
