import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ adGroups: [] });

  const adGroups = await prisma.adGroup.findMany({
    where: { campaignId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return NextResponse.json({ adGroups });
}
