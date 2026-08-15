import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWithLLM } from "@/lib/ai";

type Idea = { title: string; description: string };

function mockSitelinks(campaignName: string): Idea[] {
  const region = campaignName.replace(/^Voyara_(DSA|SEM|Meta|TikTok|Snapchat)_/, "").replace(/_/g, " ");
  const templates: Idea[] = [
    { title: `${region} Top Attraction Tickets`, description: "Popular local attractions — skip the line, book online" },
    { title: `${region} Transport Pass Deals`, description: "Multi-day options to get around the city for less" },
    { title: `${region} Flash Discount Code`, description: "Enter the promo code for extra savings — limited quantity" },
    { title: `${region} Recommended Itineraries`, description: "Curated local itineraries covering sights and transit" },
    { title: `${region} Hotel Deals`, description: "Handpicked hotels and stays with booking cashback" },
    { title: `${region} Food & Dining Vouchers`, description: "Local specialties and restaurant combo deals" },
  ];
  return templates;
}

export async function POST(request: NextRequest) {
  const { campaignId } = await request.json();
  const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return NextResponse.json({ error: "campaign not found" }, { status: 404 });

  const fallback = JSON.stringify(mockSitelinks(campaign.name));
  const prompt = `You are a Google Ads Sitelink asset optimization expert. The campaign is named "${campaign.name}", promoting travel activities & tickets affiliate marketing. Produce 6 sitelinks, each with a title (under 25 characters) and a description (under 35 characters). Return ONLY a JSON array [{"title":"","description":""}], no other text.`;

  const result = await generateWithLLM({
    prompt,
    product: campaign.name,
    feature: "sitelink",
    fallback,
  });

  let ideas: Idea[];
  try {
    const match = result.text.match(/\[[\s\S]*\]/);
    ideas = JSON.parse(match ? match[0] : result.text);
    if (!Array.isArray(ideas)) throw new Error("not array");
  } catch {
    ideas = mockSitelinks(campaign.name);
  }

  const count = await prisma.sitelink.count({ where: { campaignId } });
  const slug = campaign.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const created = await Promise.all(
    ideas.slice(0, 8).map((idea, i) =>
      prisma.sitelink.create({
        data: {
          campaignId,
          title: idea.title,
          description: idea.description,
          url: `https://www.voyara.com/promo/${slug}-${i + 1}`,
          active: true,
          sortOrder: count + i,
        },
      })
    )
  );

  return NextResponse.json({ sitelinks: created, usedRealApi: result.usedRealApi });
}
