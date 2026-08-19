import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");

  const terms = await prisma.searchTermReport.findMany({
    where: campaignId && campaignId !== "all" ? { adGroup: { campaignId } } : undefined,
    orderBy: { clicks: "desc" },
    include: { adGroup: { select: { id: true, name: true, campaign: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({ terms });
}

export async function PATCH(request: NextRequest) {
  const { id, action } = (await request.json()) as { id: string; action: "addAsKeyword" | "exclude" };
  if (!id || !action) return NextResponse.json({ error: "id and action are required" }, { status: 400 });

  const term = await prisma.searchTermReport.findUnique({ where: { id } });
  if (!term) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (action === "addAsKeyword") {
    const avgCpc = term.clicks > 0 ? term.cost / term.clicks : 0.5;
    await prisma.keyword.create({
      data: {
        adGroupId: term.adGroupId,
        text: term.term,
        matchType: "PHRASE",
        source: "search_term_report",
        impressions: term.impressions,
        clicks: term.clicks,
        ctr: term.impressions > 0 ? (term.clicks / term.impressions) * 100 : 0,
        spend: term.cost,
        avgCpc,
        currentBid: Math.max(0.1, avgCpc),
        convRate: term.clicks > 0 ? (term.conversions / term.clicks) * 100 : 0,
      },
    });
    await prisma.searchTermReport.update({ where: { id }, data: { addedAsKeyword: true } });
  } else {
    await prisma.searchTermReport.update({ where: { id }, data: { excluded: true } });
  }

  return NextResponse.json({ ok: true });
}
