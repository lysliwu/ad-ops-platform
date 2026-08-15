import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const { ids }: { ids: string[] } = await request.json();
  await Promise.all(
    ids.map((id, i) => prisma.sitelink.update({ where: { id }, data: { sortOrder: i } }))
  );
  return NextResponse.json({ ok: true });
}
