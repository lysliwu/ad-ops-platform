import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const adGroupId = searchParams.get("adGroupId");
  if (!adGroupId) return NextResponse.json({ keywords: [] });

  const keywords = await prisma.keyword.findMany({
    where: { adGroupId },
    orderBy: [{ qualityScore: "desc" }, { text: "asc" }],
  });
  return NextResponse.json({ keywords });
}
