import { NextResponse } from "next/server";
import { syncGoogleAds } from "@/lib/googleAds";

export async function POST() {
  const result = await syncGoogleAds();
  return NextResponse.json(result);
}
