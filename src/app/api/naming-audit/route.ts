import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const adGroups = await prisma.adGroup.findMany({
    orderBy: [{ campaign: { name: "asc" } }, { name: "asc" }],
    include: { campaign: { select: { id: true, name: true, platform: true } } },
  });
  return NextResponse.json({ adGroups });
}

const EDITABLE_FIELDS = [
  "timeWindow",
  "audienceTemp",
  "audienceDef",
  "exclusion",
  "productTag",
  "name",
] as const;

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...rest } = body as { id: string; [key: string]: unknown };
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const data: Record<string, string | null> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in rest) {
      const value = rest[field];
      data[field] = typeof value === "string" && value.trim() === "" ? null : (value as string | null);
    }
  }

  const adGroup = await prisma.adGroup.update({ where: { id }, data });
  return NextResponse.json({ adGroup });
}
