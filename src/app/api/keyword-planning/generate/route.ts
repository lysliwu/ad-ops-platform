import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithLLM } from "@/lib/ai";

const MODIFIERS = ["promo code", "discount", "how to buy", "reviews", "official site", "price comparison", "recommended", "price"];

function mockIdeas(seed: string) {
  return MODIFIERS.slice(0, 5).map((m) => ({
    suggestion: `${seed} ${m}`,
    avgMonthlySearch: Math.round(90 + Math.random() * 12000),
    competition: ["Low", "Medium", "High"][Math.floor(Math.random() * 3)],
    suggestedBid: Number((0.4 + Math.random() * 1.0).toFixed(2)),
  }));
}

export async function POST(request: NextRequest) {
  const { seedTerm } = await request.json();
  if (!seedTerm) return NextResponse.json({ error: "seedTerm required" }, { status: 400 });

  const fallback = JSON.stringify(mockIdeas(seedTerm));
  const prompt = `You are a Google Ads keyword planning tool. For the seed term "${seedTerm}" (travel activities & tickets affiliate marketing), produce 5 related keyword suggestions, each with an estimated average monthly search volume (number), competition level (Low/Medium/High), and a suggested bid (a number between 0.4 and 1.4 USD). Return ONLY a JSON array [{"suggestion":"","avgMonthlySearch":0,"competition":"","suggestedBid":0}], no other text.`;

  const result = await generateWithLLM({ prompt, product: seedTerm, feature: "keyword", fallback });

  type Idea = { suggestion: string; avgMonthlySearch: number; competition: string; suggestedBid: number };
  let ideas: Idea[];
  try {
    const match = result.text.match(/\[[\s\S]*\]/);
    ideas = JSON.parse(match ? match[0] : result.text);
    if (!Array.isArray(ideas)) throw new Error("not array");
  } catch {
    ideas = mockIdeas(seedTerm);
  }

  const created = await Promise.all(
    ideas.slice(0, 8).map((idea) =>
      prisma.keywordIdea.create({
        data: {
          seedTerm,
          suggestion: idea.suggestion,
          avgMonthlySearch: Math.round(idea.avgMonthlySearch) || 0,
          competition: idea.competition || "Medium",
          suggestedBid: idea.suggestedBid || 0.6,
        },
      })
    )
  );

  return NextResponse.json({ ideas: created });
}
