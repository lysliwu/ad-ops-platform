import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Rule: DSA spend > $6 and ROI < 0.5 → exclude the landing page
//       Spend $1.5-$6 → exclude only search terms with zero conversions
//       Already-excluded items are skipped automatically (this demo
//       recomputes each time rather than persisting an exclusion list)
export async function POST(request: NextRequest) {
  const { month } = await request.json();
  const dsaRows = await prisma.productRoi.findMany({ where: { month, adType: "DSA" } });

  const items = dsaRows
    .map((r) => {
      if (r.semSpend > 6 && r.roi < 0.5) {
        return {
          id: r.id,
          product: r.product,
          adGroupName: r.adGroupName,
          spend: r.semSpend,
          roi: r.roi,
          orders: r.orders,
          action: "Exclude landing page" as const,
        };
      }
      if (r.semSpend >= 1.5 && r.semSpend <= 6 && r.orders === 0) {
        return {
          id: r.id,
          product: r.product,
          adGroupName: r.adGroupName,
          spend: r.semSpend,
          roi: r.roi,
          orders: r.orders,
          action: "Exclude non-converting search terms" as const,
        };
      }
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .sort((a, b) => b.spend - a.spend);

  return NextResponse.json({ items, scannedCount: dsaRows.length });
}
