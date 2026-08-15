import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const items = await prisma.reviewStatus.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({ items });
}
