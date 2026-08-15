import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dedupeCandidates, fetchSerpKeywords, generateKeywordIdeas } from "@/lib/keywordResearch";

// Generates keyword candidates for review — mirrors the keyword-search-optimizer
// flow (Claude brainstorm + optional SerpAPI enrichment, intent-classified) but
// does NOT write to the ad group yet. Accepted candidates go through
// /api/keywords/add so a human reviews before anything is added.
export async function POST(request: NextRequest) {
  const { adGroupId } = await request.json();
  const adGroup = await prisma.adGroup.findUnique({
    where: { id: adGroupId },
    include: { campaign: true, keywords: { select: { text: true } } },
  });
  if (!adGroup) {
    return NextResponse.json({ error: "adGroup not found" }, { status: 404 });
  }

  const seed = adGroup.name.replace(/^[^-]+-\s*/, "").trim();
  const context = `${adGroup.campaign.name}, a travel activities & tickets affiliate marketing campaign for Voyara`;

  const [claudeResult, serpCandidates] = await Promise.all([
    generateKeywordIdeas({ seed, context, product: adGroup.name }),
    fetchSerpKeywords(seed),
  ]);

  const existing = new Set(adGroup.keywords.map((k) => k.text.toLowerCase()));
  const merged = dedupeCandidates([claudeResult.candidates, serpCandidates]).filter(
    (c) => !existing.has(c.keyword.toLowerCase())
  );

  return NextResponse.json({
    candidates: merged,
    usedRealApi: claudeResult.usedRealApi,
    usedSerp: serpCandidates.length > 0,
  });
}
