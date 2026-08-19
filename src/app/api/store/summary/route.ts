import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function dayRange(day: "today" | "yesterday") {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (day === "yesterday") start.setDate(start.getDate() - 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const day = searchParams.get("day") === "today" ? "today" : "yesterday";
  const { start, end } = dayRange(day);

  const orders = await prisma.storeOrder.findMany({
    where: { orderDate: { gte: start, lt: end } },
    orderBy: { orderDate: "asc" },
    include: { items: true },
  });

  const totals = {
    revenue: orders.filter((o) => o.status === "Paid").reduce((s, o) => s + o.amount, 0),
    paidCount: orders.filter((o) => o.status === "Paid").length,
    unpaidCount: orders.filter((o) => o.status === "Unpaid").length,
    refundedCount: orders.filter((o) => o.status === "Refunded").length,
    cancelledCount: orders.filter((o) => o.status === "Cancelled").length,
  };

  const hourly = Array.from({ length: 24 }, (_, hour) => ({
    hour: `${String(hour).padStart(2, "0")}:00`,
    orders: 0,
  }));
  for (const o of orders) hourly[o.orderDate.getHours()].orders += 1;

  const productMap = new Map<string, { product: string; quantity: number; revenue: number; orders: number }>();
  for (const o of orders) {
    for (const item of o.items) {
      const row = productMap.get(item.product) ?? { product: item.product, quantity: 0, revenue: 0, orders: 0 };
      row.quantity += item.quantity;
      row.revenue += item.quantity * item.unitPrice;
      row.orders += 1;
      productMap.set(item.product, row);
    }
  }
  const productSales = Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue);

  return NextResponse.json({
    day,
    range: { start, end },
    totals,
    hourly,
    productSales,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      orderDate: o.orderDate,
      amount: o.amount,
      status: o.status,
      paymentMethod: o.paymentMethod,
    })),
  });
}
