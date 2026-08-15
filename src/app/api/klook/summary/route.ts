import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") ?? "2026-08";

  const rows = await prisma.productRoi.findMany({ where: { month } });
  const orderCount = await prisma.affiliateOrder.count();
  const range = await prisma.affiliateOrder.aggregate({
    _min: { orderDate: true },
    _max: { orderDate: true },
  });

  const sem = rows.filter((r) => r.adType === "SEM");
  const dsa = rows.filter((r) => r.adType === "DSA");

  const totals = (list: typeof rows) =>
    list.reduce(
      (acc, r) => {
        acc.spend += r.semSpend;
        acc.commission += r.netCommission;
        return acc;
      },
      { spend: 0, commission: 0 }
    );

  const t = totals(rows);

  return NextResponse.json({
    orderCount,
    dateRange:
      range._min.orderDate && range._max.orderDate
        ? [range._min.orderDate, range._max.orderDate]
        : null,
    spend: t.spend,
    commission: t.commission,
    roi: t.spend ? t.commission / t.spend : 0,
    semCount: sem.length,
    dsaCount: dsa.length,
    sem: sem.sort((a, b) => b.semClicks - a.semClicks),
    dsa: dsa.sort((a, b) => b.semClicks - a.semClicks),
  });
}
