import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? "50");

  const [agg, rows] = await Promise.all([
    prisma.tokenUsageLog.aggregate({
      _count: { id: true },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
    }),
    prisma.tokenUsageLog.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
  ]);

  return NextResponse.json({
    totalGenerations: agg._count.id,
    totalTokens: agg._sum.totalTokens ?? 0,
    promptTokens: agg._sum.promptTokens ?? 0,
    completionTokens: agg._sum.completionTokens ?? 0,
    rows,
  });
}
