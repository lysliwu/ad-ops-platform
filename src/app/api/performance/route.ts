import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId") ?? "all";
  const days = Number(searchParams.get("days") ?? "30");

  const allDaily = await prisma.dailyMetric.findMany({ orderBy: { date: "asc" } });
  const daily = allDaily.slice(-days);

  const allAdGroups = await prisma.adGroup.findMany({
    include: { campaign: { select: { id: true, name: true, type: true, platform: true } } },
  });

  const totalSpend = allAdGroups.reduce((s, a) => s + a.spend, 0);
  const scopedAdGroups =
    campaignId === "all"
      ? allAdGroups
      : allAdGroups.filter((a) => a.campaignId === campaignId);
  const scopedSpend = scopedAdGroups.reduce((s, a) => s + a.spend, 0);
  const share = campaignId === "all" ? 1 : totalSpend > 0 ? scopedSpend / totalSpend : 0;

  const scaledDaily = daily.map((d) => {
    const spend = d.spend * share;
    const impressions = Math.round(d.impressions * share);
    const clicks = Math.round(d.clicks * share);
    return {
      date: d.date.toISOString().slice(5, 10),
      spend: Math.round(spend * 100) / 100,
      impressions,
      clicks,
      ctr: impressions ? (clicks / impressions) * 100 : 0,
      avgCpc: clicks ? spend / clicks : 0,
    };
  });

  const kpi = scaledDaily.reduce(
    (acc, d) => {
      acc.spend += d.spend;
      acc.impressions += d.impressions;
      acc.clicks += d.clicks;
      return acc;
    },
    { spend: 0, impressions: 0, clicks: 0 }
  );

  const adGroups = scopedAdGroups
    .sort((a, b) => b.impressions - a.impressions)
    .map((a) => ({
      id: a.id,
      name: a.name,
      campaignName: a.campaign.name,
      platform: a.campaign.platform,
      adScore: a.adScore,
      impressions: a.impressions,
      clicks: a.clicks,
      ctr: a.ctr,
      spend: a.spend,
      avgCpc: a.avgCpc,
    }));

  return NextResponse.json({
    kpi: {
      impressions: kpi.impressions,
      clicks: kpi.clicks,
      ctr: kpi.impressions ? (kpi.clicks / kpi.impressions) * 100 : 0,
      spend: kpi.spend,
    },
    daily: scaledDaily,
    adGroups,
  });
}
