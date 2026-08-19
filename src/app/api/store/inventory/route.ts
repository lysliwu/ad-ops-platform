import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const inventory = await prisma.storeInventory.findMany({ orderBy: { product: "asc" } });
  return NextResponse.json({ inventory });
}
