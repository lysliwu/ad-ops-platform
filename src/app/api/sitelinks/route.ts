import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ sitelinks: [] });
  const sitelinks = await prisma.sitelink.findMany({
    where: { campaignId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ sitelinks });
}

export async function PATCH(request: NextRequest) {
  const { id, ...data } = await request.json();
  const updated = await prisma.sitelink.update({ where: { id }, data });
  return NextResponse.json({ sitelink: updated });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.sitelink.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
