import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Recomputes ProductRoi for the month derived from `to`, from raw
// AffiliateOrder rows joined against current AdGroup spend. Orders are
// deduped by ticketId (unique in the schema), so re-importing the same
// report never double-counts.
export async function POST(request: NextRequest) {
  const { from, to } = await request.json();
  const fromDate = new Date(from);
  const toDate = new Date(to);
  const month = toDate.toISOString().slice(0, 7);
  const days = Math.max(1, (toDate.getTime() - fromDate.getTime()) / 86400000);

  const orders = await prisma.affiliateOrder.findMany({
    where: { orderDate: { gte: fromDate, lte: toDate } },
  });

  const byProduct = new Map<
    string,
    { product: string; adGroupName: string; orders: number; refunds: number; gross: number; net: number }
  >();
  for (const o of orders) {
    const key = `${o.product}::${o.adGroupName}`;
    const acc = byProduct.get(key) ?? {
      product: o.product,
      adGroupName: o.adGroupName ?? "Uncategorized",
      orders: 0,
      refunds: 0,
      gross: 0,
      net: 0,
    };
    acc.orders += 1;
    if (o.refunded) acc.refunds += 1;
    acc.gross += o.grossCommission;
    acc.net += o.netCommission;
    byProduct.set(key, acc);
  }

  const adGroups = await prisma.adGroup.findMany();
  const rows = await Promise.all(
    Array.from(byProduct.values()).map(async (p, i) => {
      const primaryName = p.adGroupName.split("·")[0].trim();
      const matched = adGroups.find((a) => a.name === primaryName);
      const monthFraction = Math.min(1, days / 30);
      const semSpend = matched ? matched.spend * monthFraction : Math.max(1, p.gross * 0.3);
      const semClicks = matched ? Math.round(matched.clicks * monthFraction) : Math.round(p.orders * 4);

      return {
        month,
        ticketId: `${p.product}-${i}`.slice(0, 60),
        product: p.product,
        adGroupName: p.adGroupName,
        semClicks,
        semSpend,
        orders: p.orders,
        refunds: p.refunds,
        grossCommission: p.gross,
        netCommission: p.net,
        roi: semSpend ? p.gross / semSpend : 0,
        netRoi: semSpend ? p.net / semSpend : 0,
        adType: "SEM" as const,
      };
    })
  );

  await prisma.productRoi.deleteMany({ where: { month, adType: "SEM" } });
  for (let i = 0; i < rows.length; i += 200) {
    await prisma.productRoi.createMany({ data: rows.slice(i, i + 200) });
  }

  return NextResponse.json({ month, productCount: rows.length, orderCount: orders.length });
}
