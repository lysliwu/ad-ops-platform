import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, type: true, platform: true, region: true },
  });
  return NextResponse.json({ campaigns });
}
