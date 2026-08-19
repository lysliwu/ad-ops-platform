import { NextResponse } from "next/server";
import { syncStoreOrders } from "@/lib/officialSite";

export async function POST() {
  const result = await syncStoreOrders();
  return NextResponse.json(result);
}
