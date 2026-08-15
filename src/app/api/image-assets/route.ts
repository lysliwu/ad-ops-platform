import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const assets = await prisma.imageAsset.findMany({ orderBy: { uploadedAt: "desc" } });
  return NextResponse.json({ assets });
}
