import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const ideas = await prisma.keywordIdea.findMany({ orderBy: { avgMonthlySearch: "desc" } });
  return NextResponse.json({ ideas });
}
