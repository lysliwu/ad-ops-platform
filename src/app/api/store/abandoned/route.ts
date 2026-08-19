import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cart-abandonment recovery window: unpaid orders placed 3-6 days ago.
// Older than that they're stale leads; more recent and the buyer may still
// come back on their own, so nudging too early wastes the recovery email.
export async function GET() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - 6);
  const to = new Date(now);
  to.setDate(to.getDate() - 3);

  const orders = await prisma.storeOrder.findMany({
    where: { status: "Unpaid", orderDate: { gte: from, lte: to } },
    orderBy: { orderDate: "asc" },
    include: { items: true },
  });

  return NextResponse.json({ orders });
}

export async function PATCH(request: NextRequest) {
  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  const order = await prisma.storeOrder.update({ where: { id }, data: { recoverySent: true } });
  return NextResponse.json({ order });
}
