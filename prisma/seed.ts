import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.tokenUsageLog.deleteMany();
  await prisma.keywordIdea.deleteMany();
  await prisma.reviewStatus.deleteMany();
  await prisma.healthCheckItem.deleteMany();
  await prisma.imageAsset.deleteMany();
  await prisma.productRoi.deleteMany();
  await prisma.affiliateOrder.deleteMany();
  await prisma.sitelink.deleteMany();
  await prisma.keyword.deleteMany();
  await prisma.dailyMetric.deleteMany();
  await prisma.adGroup.deleteMany();
  await prisma.campaign.deleteMany();

  // ---------------------------------------------------------------------
  // Campaigns — demo client "Voyara" (travel activities & tickets OTA)
  // ---------------------------------------------------------------------
  const campaignDefs = [
    { name: "Voyara_DSA_All", type: "DSA", platform: "google_ads", region: "Global" },
    { name: "Voyara_DSA_Japan", type: "DSA", platform: "google_ads", region: "Japan" },
    { name: "Voyara_DSA_Korea", type: "DSA", platform: "google_ads", region: "Korea" },
    { name: "Voyara_DSA_Thailand", type: "DSA", platform: "google_ads", region: "Thailand" },
    { name: "Voyara_DSA_Taiwan", type: "DSA", platform: "google_ads", region: "Taiwan" },
    { name: "Voyara_DSA_HongKong", type: "DSA", platform: "google_ads", region: "Hong Kong" },
    { name: "Voyara_DSA_Macau", type: "DSA", platform: "google_ads", region: "Macau" },
    { name: "Voyara_DSA_Malaysia", type: "DSA", platform: "google_ads", region: "Malaysia" },
    { name: "Voyara_DSA_Singapore", type: "DSA", platform: "google_ads", region: "Singapore" },
    { name: "Voyara_DSA_Vietnam", type: "DSA", platform: "google_ads", region: "Vietnam" },
    { name: "Voyara_SEM_Draft", type: "SEM", platform: "google_ads", region: "Draft" },
    { name: "Voyara_SEM_Japan", type: "SEM", platform: "google_ads", region: "Japan" },
    { name: "Voyara_SEM_Osaka_Hero", type: "SEM", platform: "google_ads", region: "Osaka" },
    { name: "Voyara_SEM_Tokyo_Hero", type: "SEM", platform: "google_ads", region: "Tokyo" },
    { name: "Voyara_SEM_All", type: "SEM", platform: "google_ads", region: "Global" },
    { name: "Voyara_SEM_Korea_Busan", type: "SEM", platform: "google_ads", region: "Busan" },
    { name: "Voyara_SEM_Osaka", type: "SEM", platform: "google_ads", region: "Osaka" },
    { name: "Voyara_Meta_Prospecting_US", type: "Conversion", platform: "meta", region: "US" },
    { name: "Voyara_Meta_Retargeting_Japan", type: "Conversion", platform: "meta", region: "Japan" },
    { name: "Voyara_TikTok_SparkAds_Osaka", type: "Conversion", platform: "tiktok", region: "Osaka" },
    { name: "Voyara_Snapchat_Discover_Global", type: "Awareness", platform: "snapchat", region: "Global" },
  ];

  const campaigns: Record<string, { id: string; type: string; platform: string }> = {};
  for (const c of campaignDefs) {
    const created = await prisma.campaign.create({ data: c });
    campaigns[c.name] = { id: created.id, type: c.type, platform: c.platform };
  }

  // ---------------------------------------------------------------------
  // Ad groups
  // ---------------------------------------------------------------------
  type AdGroupSeed = {
    campaign: string;
    name: string;
    adScore?: string;
    impressions: number;
    clicks: number;
    ctr: number;
    spend: number;
    avgCpc: number;
  };

  const capturedAdGroups: AdGroupSeed[] = [
    { campaign: "Voyara_DSA_Japan", name: "Japan - Tokyo DSA", impressions: 48810, clicks: 1718, ctr: 3.52, spend: 796, avgCpc: 0.46 },
    { campaign: "Voyara_DSA_All", name: "All Products DSA", impressions: 46954, clicks: 3740, ctr: 7.97, spend: 783, avgCpc: 0.21 },
    { campaign: "Voyara_DSA_Japan", name: "Japan - Ishigaki DSA", impressions: 26435, clicks: 3933, ctr: 14.88, spend: 1975, avgCpc: 0.5 },
    { campaign: "Voyara_SEM_Osaka_Hero", name: "Osaka - USJ Tickets", adScore: "Excellent", impressions: 25383, clicks: 972, ctr: 3.83, spend: 840, avgCpc: 0.86 },
    { campaign: "Voyara_DSA_Korea", name: "Korea - Busan DSA", impressions: 23846, clicks: 1912, ctr: 8.02, spend: 1118, avgCpc: 0.58 },
    { campaign: "Voyara_DSA_Japan", name: "Japan - Osaka DSA", impressions: 22642, clicks: 793, ctr: 3.5, spend: 378, avgCpc: 0.48 },
    { campaign: "Voyara_DSA_Korea", name: "Korea - Seoul DSA", impressions: 21026, clicks: 1064, ctr: 5.06, spend: 620, avgCpc: 0.58 },
  ];

  const filler: Record<string, string[]> = {
    Voyara_SEM_Osaka: [
      "Osaka - JR Kansai Airport Express HARUKA",
      "Osaka - Osaka Amazing Pass",
      "Osaka - Universal Studios Japan (USJ) Tickets",
      "Osaka - JR Kansai Wide Area Rail Pass",
    ],
    Voyara_SEM_Japan: [
      "Tokyo - JR Pass East Japan",
      "Tokyo - Tokyo Skytree Tickets",
      "Tokyo - Tokyo Disney Resort Tickets",
      "Tokyo - Shibuya Sky Observation Deck",
      "Tokyo - Skyliner Keisei Railway Tickets",
      "Tokyo - Harry Potter Studio Tour Tickets",
      "Tokyo - Japan eSIM",
      "Tokyo - Mt. Fuji Day Tour",
    ],
    Voyara_SEM_Korea_Busan: ["Busan - Busan City Pass", "Busan - CLUBD OASIS Water Park Tickets"],
    Voyara_SEM_All: ["Taiwan - Taiwan eSIM Data Plan", "Okinawa - Okinawa FunPASS"],
    Voyara_SEM_Tokyo_Hero: ["Tokyo - Tokyo Disneyland Tickets", "Tokyo - Odaiba Free & Easy Package"],
    Voyara_DSA_Taiwan: ["Taiwan - Site-wide DSA", "Taiwan - Kyushu Region DSA"],
  };

  const adGroups: Record<string, string> = {};

  for (const ag of capturedAdGroups) {
    const created = await prisma.adGroup.create({
      data: {
        campaignId: campaigns[ag.campaign].id,
        name: ag.name,
        adScore: ag.adScore,
        impressions: ag.impressions,
        clicks: ag.clicks,
        ctr: ag.ctr,
        spend: ag.spend,
        avgCpc: ag.avgCpc,
      },
    });
    adGroups[`${ag.campaign}::${ag.name}`] = created.id;
  }

  for (const [campaignName, names] of Object.entries(filler)) {
    for (const name of names) {
      const impressions = randInt(300, 9000);
      const clicks = randInt(10, Math.floor(impressions * 0.15));
      const ctr = (clicks / impressions) * 100;
      const spend = rand(60, 2000);
      const avgCpc = spend / Math.max(clicks, 1);
      const created = await prisma.adGroup.create({
        data: {
          campaignId: campaigns[campaignName].id,
          name,
          impressions,
          clicks,
          ctr,
          spend,
          avgCpc,
        },
      });
      adGroups[`${campaignName}::${name}`] = created.id;
    }
  }

  // Meta / TikTok / Snapchat ad sets — impressions/clicks/spend only; these
  // platforms don't use keyword-level Quality Score, so no Keyword rows.
  const socialAdSets: Record<string, string[]> = {
    Voyara_Meta_Prospecting_US: ["Broad - Interest: Travel & Tourism", "Lookalike 1% - Purchasers"],
    Voyara_Meta_Retargeting_Japan: ["Site Visitors 30d", "Add to Cart - No Purchase 14d"],
    Voyara_TikTok_SparkAds_Osaka: ["Spark Ads - Creator UGC", "In-Feed - Osaka Amazing Pass"],
    Voyara_Snapchat_Discover_Global: ["Discover - Story Ads", "Collection Ad - Top Destinations"],
  };
  for (const [campaignName, names] of Object.entries(socialAdSets)) {
    for (const name of names) {
      const impressions = randInt(20000, 260000);
      const clicks = randInt(200, Math.floor(impressions * 0.03));
      const ctr = (clicks / impressions) * 100;
      const spend = rand(300, 4200);
      const avgCpc = spend / Math.max(clicks, 1);
      await prisma.adGroup.create({
        data: {
          campaignId: campaigns[campaignName].id,
          name,
          impressions,
          clicks,
          ctr,
          spend,
          avgCpc,
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Keywords — captured sets + generated filler for every Google ad group
  // ---------------------------------------------------------------------
  const jrPassGroupId = adGroups["Voyara_SEM_Japan::Tokyo - JR Pass East Japan"];
  const jrPassKeywords: Array<{
    text: string;
    qs: number | null;
    estCtr: string | null;
    rel: string | null;
    lp: string | null;
    status: string;
  }> = [
    { text: "jr east rail pass tohoku region", qs: 6, estCtr: "Above average", rel: "Below average", lp: "Average", status: "Active" },
    { text: "tohoku region jr pass", qs: 6, estCtr: "Above average", rel: "Below average", lp: "Average", status: "Active" },
    { text: "tohoku shinkansen", qs: 7, estCtr: "Below average", rel: "Above average", lp: "Above average", status: "Active" },
    { text: "jr tohoku shinkansen", qs: 7, estCtr: "Average", rel: "Above average", lp: "Average", status: "Active" },
    { text: "jr east rail pass", qs: null, estCtr: null, rel: null, lp: null, status: "Active" },
    { text: "east japan jr pass", qs: null, estCtr: null, rel: null, lp: null, status: "Active" },
    { text: "tohoku jr", qs: null, estCtr: null, rel: null, lp: null, status: "Active" },
    { text: "tohoku jr pass", qs: null, estCtr: null, rel: null, lp: null, status: "Active" },
    { text: "east japan shinkansen", qs: null, estCtr: null, rel: null, lp: null, status: "Active" },
    { text: "jr east japan pass", qs: null, estCtr: null, rel: null, lp: null, status: "Active" },
    { text: "voyara jr east pass", qs: null, estCtr: null, rel: null, lp: null, status: "Paused" },
    { text: "jr east pass 5 day", qs: null, estCtr: null, rel: null, lp: null, status: "Paused" },
  ];
  if (jrPassGroupId) {
    for (const k of jrPassKeywords) {
      const impressions = randInt(50, 2000);
      const clicks = randInt(1, Math.floor(impressions * 0.1) + 1);
      await prisma.keyword.create({
        data: {
          adGroupId: jrPassGroupId,
          text: k.text,
          matchType: "PHRASE",
          qualityScore: k.qs ?? undefined,
          estCtr: k.estCtr ?? undefined,
          adRelevance: k.rel ?? undefined,
          landingPageExp: k.lp ?? undefined,
          status: k.status,
          impressions,
          clicks,
          ctr: (clicks / impressions) * 100,
          spend: rand(6, 130),
          avgCpc: rand(0.5, 1),
          currentBid: 0.8,
        },
      });
    }
  }

  const harukaGroupId = adGroups["Voyara_SEM_Osaka::Osaka - JR Kansai Airport Express HARUKA"];
  const harukaKeywords = [
    { text: "haruka express ticket", imp: 5940, clk: 737, ctr: 12.4, spend: 460, cpc: 0.62, convRate: 69, qs: 8 },
    { text: "haruka train ticket", imp: 736, clk: 111, ctr: 15.1, spend: 82, cpc: 0.74, convRate: 84, qs: 10 },
    { text: "kansai airport to kyoto", imp: 1287, clk: 97, ctr: 7.5, spend: 67, cpc: 0.69, convRate: 67, qs: 6 },
    { text: "haruka kansai", imp: 562, clk: 65, ctr: 11.6, spend: 47, cpc: 0.72, convRate: 69, qs: null },
    { text: "kansai airport to osaka", imp: 869, clk: 42, ctr: 4.8, spend: 28, cpc: 0.66, convRate: 56, qs: 8 },
    { text: "osaka to kansai airport", imp: 325, clk: 22, ctr: 6.8, spend: 13, cpc: 0.6, convRate: 55, qs: 8 },
    { text: "haruka e-ticket", imp: 244, clk: 15, ctr: 6.2, spend: 12, cpc: 0.78, convRate: 78, qs: 7 },
    { text: "haruka kyoto", imp: 120, clk: 13, ctr: 10.8, spend: 9, cpc: 0.71, convRate: 66, qs: 10 },
    { text: "kansai airport to shin-osaka", imp: 206, clk: 12, ctr: 5.8, spend: 9, cpc: 0.73, convRate: 60, qs: 6 },
    { text: "haruka jr", imp: 149, clk: 11, ctr: 7.4, spend: 8, cpc: 0.74, convRate: 62, qs: 8 },
  ];
  if (harukaGroupId) {
    for (const k of harukaKeywords) {
      await prisma.keyword.create({
        data: {
          adGroupId: harukaGroupId,
          text: k.text,
          matchType: "PHRASE",
          qualityScore: k.qs ?? undefined,
          status: "Active",
          impressions: k.imp,
          clicks: k.clk,
          ctr: k.ctr,
          spend: k.spend,
          avgCpc: k.cpc,
          convRate: k.convRate,
          currentBid: 0.8,
        },
      });
    }
  }

  // Generic filler keywords for every other Google Ads ad group.
  const suffixes = ["discount", "tickets", "promo code", "reviews", "price", "how to buy", "recommended", "itinerary"];
  const googleAdsCampaignNames = new Set(
    campaignDefs.filter((c) => c.platform === "google_ads").map((c) => c.name)
  );
  for (const [key, id] of Object.entries(adGroups)) {
    if (id === jrPassGroupId || id === harukaGroupId) continue;
    const [campaignName, name] = key.split("::");
    if (!googleAdsCampaignNames.has(campaignName)) continue;
    const base = name.replace(/^[^-]+-\s*/, "");
    const n = randInt(3, 6);
    for (let i = 0; i < n; i++) {
      const impressions = randInt(20, 1500);
      const clicks = randInt(0, Math.floor(impressions * 0.1));
      await prisma.keyword.create({
        data: {
          adGroupId: id,
          text: `${base} ${pick(suffixes)}`.toLowerCase(),
          matchType: pick(["PHRASE", "EXACT", "BROAD"]),
          qualityScore: Math.random() > 0.3 ? randInt(3, 10) : undefined,
          estCtr: pick(["Above average", "Average", "Below average"]),
          adRelevance: pick(["Above average", "Average", "Below average"]),
          landingPageExp: pick(["Above average", "Average", "Below average"]),
          status: Math.random() > 0.15 ? "Active" : "Paused",
          impressions,
          clicks,
          ctr: impressions ? (clicks / impressions) * 100 : 0,
          spend: rand(2, 90),
          avgCpc: rand(0.3, 1),
          convRate: rand(0, 90),
          currentBid: rand(0.5, 1.2),
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Sitelinks — Voyara_DSA_Malaysia-style promo campaign
  // ---------------------------------------------------------------------
  const sitelinkDefs = [
    { title: "Buy eSIM, Win $500", description: "Order select brands, get instant cashback on your credit card", url: "https://www.voyara.com/promo/mobile-travel-esim" },
    { title: "Unlimited Data SIM Deals", description: "Multiple day plans, flexible data — pick what fits your trip", url: "https://www.voyara.com/promo/mobile-travel-sim" },
    { title: "Flash Sale: Buy 1 Get 1", description: "$1 eSIM, limited quantity, first come first served", url: "https://www.voyara.com/promo/travelfair-01" },
    { title: "Summer Sitewide 4% Off", description: "Code SUMMER2026 — 4% off everything, no minimum", url: "https://www.voyara.com/promo/summer-vaca-96" },
    { title: "$60 Off Orders $600+", description: "Code SUMMER600 — valid on tickets & tours", url: "https://www.voyara.com/promo/summer600" },
    { title: "Japan Summer Special", description: "6% off, no cap, valid on tickets & itineraries", url: "https://www.voyara.com/promo/summer-jp-94" },
    { title: "Korea Travel Deals", description: "Up to 4% off Seoul & Seoraksan tickets and packages", url: "https://www.voyara.com/promo/summer-kr-40" },
    { title: "$100K Travel Fund Giveaway", description: "Spend $50+ to enter — more spend, better odds", url: "https://www.voyara.com/promo/summer-vaca" },
    { title: "Summer Water Activities", description: "Snorkeling, kayaking, and more — book select activities", url: "https://www.voyara.com/promo/summer-vaca-water" },
    { title: "Petronas Towers Tickets", description: "Malaysia's iconic landmark — feel the height", url: "https://www.voyara.com/product/petronas-tower" },
    { title: "Kek Lok Si Temple Tickets", description: "Southeast Asia's largest temple — art & tradition", url: "https://www.voyara.com/product/kek-lok-si" },
    { title: "Kota Kinabalu City Bus Pass", description: "Hop-on hop-off, explore the city at your own pace", url: "https://www.voyara.com/product/kk-city-tour" },
    { title: "Kuala Lumpur City Bus Tour", description: "24-hour hop-on hop-off around top KL sights", url: "https://www.voyara.com/product/kl-hop-on" },
    { title: "Penang Clan Jetties Tour", description: "Colorful street art — a memorable photo stop", url: "https://www.voyara.com/product/clan-jetty" },
    { title: "Sandakan Eco Day Tour", description: "Get close to proboscis monkeys and rich wildlife", url: "https://www.voyara.com/product/sandakan-eco" },
  ];
  const malaysiaCampaignId = campaigns["Voyara_DSA_Malaysia"].id;
  for (let i = 0; i < sitelinkDefs.length; i++) {
    await prisma.sitelink.create({
      data: { campaignId: malaysiaCampaignId, sortOrder: i, active: true, ...sitelinkDefs[i] },
    });
  }

  // ---------------------------------------------------------------------
  // Daily metrics (30-day trend, "All Campaigns" aggregate)
  // ---------------------------------------------------------------------
  const days = 22;
  const end = new Date("2026-08-13");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    const progress = (days - 1 - i) / (days - 1);
    const peak = Math.exp(-Math.pow((progress - 0.18) / 0.15, 2)) * 900;
    const tail = 300 + (1 - progress) * 130;
    const spend = Math.max(220, peak + tail + rand(-50, 50));
    const impressions = Math.round(spend * rand(18, 24));
    const clicks = Math.round(impressions * rand(0.045, 0.09));
    const ctr = (clicks / impressions) * 100;
    const avgCpc = spend / Math.max(clicks, 1);
    await prisma.dailyMetric.create({
      data: { date: d, spend, impressions, clicks, ctr, avgCpc },
    });
  }

  // ---------------------------------------------------------------------
  // Affiliate orders (raw, for the report / dedup demo)
  // ---------------------------------------------------------------------
  const products = [
    { ticket: "82312", name: "Osaka Amazing Pass", group: "Osaka - Osaka Amazing Pass" },
    { ticket: "46604", name: "Universal Studios Japan (USJ) Tickets", group: "Osaka - Universal Studios Japan (USJ) Tickets" },
    { ticket: "154339", name: "Tokyo-Fuji Highway Bus", group: "Osaka - JR Kansai Wide Area Rail Pass" },
    { ticket: "40981", name: "Taiwan eSIM Data Plan", group: "Taiwan - Taiwan eSIM Data Plan" },
    { ticket: "81576", name: "Busan City Pass", group: "Busan - Busan City Pass" },
    { ticket: "41352", name: "Tokyo Skytree Tickets", group: "Tokyo - Tokyo Skytree Tickets" },
    { ticket: "109393", name: "Japan eSIM (Unlimited | Softbank/Docomo)", group: "Tokyo - Japan eSIM" },
    { ticket: "1410", name: "Skyliner Keisei Railway Tickets", group: "Tokyo - Skyliner Keisei Railway Tickets" },
    { ticket: "78651", name: "Okinawa FunPASS (Value Series)", group: "Okinawa - Okinawa FunPASS" },
    { ticket: "18400", name: "JR Kansai Airport Express HARUKA Tickets", group: "Osaka - JR Kansai Airport Express HARUKA" },
    { ticket: "695", name: "Tokyo Disney Resort - Disneyland & DisneySea Tickets", group: "Tokyo - Tokyo Disney Resort Tickets" },
    { ticket: "70072", name: "Shibuya Sky Observation Deck Tickets", group: "Tokyo - Shibuya Sky Observation Deck" },
    { ticket: "84374", name: "Harry Potter Studio Tour Tokyo Tickets", group: "Tokyo - Harry Potter Studio Tour Tickets" },
    { ticket: "3276", name: "JR Kansai Wide Area Rail Pass", group: "Osaka - JR Kansai Wide Area Rail Pass" },
  ];

  const orderStart = new Date("2026-06-18");
  const orderEnd = new Date("2026-08-14");
  const totalOrders = 1748;
  const orderRows = [];
  for (let i = 0; i < totalOrders; i++) {
    const p = pick(products);
    const dayRange = (orderEnd.getTime() - orderStart.getTime()) / 86400000;
    const d = new Date(orderStart.getTime() + randInt(0, dayRange) * 86400000);
    const gross = rand(3, 28);
    const refunded = Math.random() < 0.05;
    orderRows.push({
      ticketId: `${p.ticket}-${String(i).padStart(5, "0")}`,
      product: p.name,
      adGroupName: p.group,
      orderDate: d,
      grossCommission: gross,
      netCommission: refunded ? 0 : gross,
      refunded,
      importBatch: "seed-2026-08-14",
    });
  }
  const chunkSize = 200;
  for (let i = 0; i < orderRows.length; i += chunkSize) {
    await prisma.affiliateOrder.createMany({ data: orderRows.slice(i, i + chunkSize) });
  }

  // ---------------------------------------------------------------------
  // ProductRoi — precomputed monthly rollups (USD)
  // ---------------------------------------------------------------------
  type RoiRow = {
    ticketId: string;
    product: string;
    adGroupName: string;
    semClicks: number;
    semSpend: number;
    orders: number;
    refunds: number;
    grossCommission: number;
    netCommission: number;
    roi: number;
    netRoi: number;
    adType: "SEM" | "DSA";
  };

  const roi0808: RoiRow[] = [
    { ticketId: "82312", product: "Osaka Amazing Pass", adGroupName: "Osaka - Osaka Amazing Pass", semClicks: 2, semSpend: 0.16, orders: 7, refunds: 0, grossCommission: 9.2, netCommission: 9.2, roi: 57.5, netRoi: 57.5, adType: "SEM" },
    { ticketId: "46604", product: "Universal Studios Japan (USJ) Tickets", adGroupName: "Osaka - Universal Studios Japan (USJ) Tickets", semClicks: 11, semSpend: 0.68, orders: 12, refunds: 0, grossCommission: 102, netCommission: 102, roi: 150, netRoi: 150, adType: "SEM" },
    { ticketId: "154339", product: "Tokyo-Fuji Highway Bus", adGroupName: "Osaka - JR Kansai Wide Area Rail Pass", semClicks: 4, semSpend: 0.12, orders: 2, refunds: 0, grossCommission: 3.1, netCommission: 3.1, roi: 25.8, netRoi: 25.8, adType: "SEM" },
    { ticketId: "40981", product: "Taiwan eSIM Data Plan", adGroupName: "Taiwan - Taiwan eSIM Data Plan", semClicks: 8, semSpend: 0.09, orders: 1, refunds: 0, grossCommission: 4.3, netCommission: 4.3, roi: 47.8, netRoi: 47.8, adType: "SEM" },
    { ticketId: "81576", product: "Busan City Pass", adGroupName: "Busan - Busan City Pass", semClicks: 45, semSpend: 1.88, orders: 17, refunds: 1, grossCommission: 77, netCommission: 71, roi: 41, netRoi: 37.8, adType: "SEM" },
    { ticketId: "41352", product: "Tokyo Skytree Tickets", adGroupName: "Tokyo - Tokyo Skytree Tickets", semClicks: 32, semSpend: 1.75, orders: 2, refunds: 0, grossCommission: 10.2, netCommission: 10.2, roi: 5.83, netRoi: 5.83, adType: "SEM" },
    { ticketId: "109393", product: "Japan eSIM (Unlimited | Softbank/Docomo)", adGroupName: "Tokyo - Japan eSIM", semClicks: 52, semSpend: 3.0, orders: 21, refunds: 0, grossCommission: 17.7, netCommission: 17.7, roi: 5.9, netRoi: 5.9, adType: "SEM" },
    { ticketId: "1410", product: "Skyliner Keisei Railway Tickets", adGroupName: "Tokyo - Skyliner Keisei Railway Tickets", semClicks: 208, semSpend: 9.78, orders: 44, refunds: 0, grossCommission: 64.3, netCommission: 64.3, roi: 6.58, netRoi: 6.58, adType: "SEM" },
    { ticketId: "78651", product: "Okinawa FunPASS (Value Series)", adGroupName: "Okinawa - Okinawa FunPASS", semClicks: 35, semSpend: 2.16, orders: 1, refunds: 0, grossCommission: 16.1, netCommission: 16.1, roi: 7.45, netRoi: 7.45, adType: "SEM" },
    { ticketId: "18400", product: "JR Kansai Airport Express HARUKA Tickets", adGroupName: "Osaka - JR Kansai Airport Express HARUKA", semClicks: 407, semSpend: 25.5, orders: 44, refunds: 4, grossCommission: 77.7, netCommission: 63.3, roi: 3.05, netRoi: 2.48, adType: "SEM" },
  ];

  const roi0807: RoiRow[] = [
    { ticketId: "18400", product: "JR Kansai Airport Express HARUKA Tickets", adGroupName: "Osaka - JR Kansai Airport Express HARUKA", semClicks: 1156, semSpend: 73.6, orders: 109, refunds: 7, grossCommission: 117.7, netCommission: 105.3, roi: 1.6, netRoi: 1.43, adType: "SEM" },
    { ticketId: "695", product: "Tokyo Disney Resort - Disneyland & DisneySea Tickets", adGroupName: "Tokyo - Tokyo Disney Resort Tickets", semClicks: 626, semSpend: 33.1, orders: 28, refunds: 3, grossCommission: 93.2, netCommission: 74.8, roi: 2.82, netRoi: 2.26, adType: "SEM" },
    { ticketId: "1410", product: "Skyliner Keisei Railway Tickets", adGroupName: "Tokyo - Skyliner Keisei Railway Tickets", semClicks: 547, semSpend: 28.75, orders: 86, refunds: 0, grossCommission: 36.3, netCommission: 36.3, roi: 1.26, netRoi: 1.26, adType: "SEM" },
    { ticketId: "70072", product: "Shibuya Sky Observation Deck Tickets", adGroupName: "Tokyo - Shibuya Sky Observation Deck", semClicks: 466, semSpend: 25.2, orders: 19, refunds: 4, grossCommission: 19.6, netCommission: 16.7, roi: 0.78, netRoi: 0.66, adType: "SEM" },
    { ticketId: "109393", product: "Japan eSIM (Unlimited | Softbank/Docomo)", adGroupName: "Tokyo - Japan eSIM", semClicks: 360, semSpend: 16.2, orders: 87, refunds: 10, grossCommission: 49.7, netCommission: 44.3, roi: 3.07, netRoi: 2.73, adType: "SEM" },
    { ticketId: "84374", product: "Harry Potter Studio Tour Tokyo Tickets", adGroupName: "Tokyo - Harry Potter Studio Tour Tickets", semClicks: 260, semSpend: 25.2, orders: 17, refunds: 1, grossCommission: 28.3, netCommission: 26.3, roi: 1.12, netRoi: 1.04, adType: "SEM" },
    { ticketId: "3276", product: "JR Kansai Wide Area Rail Pass", adGroupName: "Osaka - JR Kansai Wide Area Rail Pass", semClicks: 250, semSpend: 18.1, orders: 1, refunds: 0, grossCommission: 4.1, netCommission: 4.1, roi: 0.23, netRoi: 0.23, adType: "SEM" },
    { ticketId: "78651", product: "Okinawa FunPASS (Value Series)", adGroupName: "Okinawa - Okinawa FunPASS", semClicks: 229, semSpend: 12.2, orders: 1, refunds: 0, grossCommission: 5.4, netCommission: 5.4, roi: 0.44, netRoi: 0.44, adType: "SEM" },
  ];

  const roi0806: RoiRow[] = products.slice(0, 9).map((p) => {
    const semSpend = rand(3, 28);
    const orders = randInt(1, 25);
    const refunds = randInt(0, 2);
    const gross = orders * rand(1.2, 2.8);
    const net = gross * (1 - refunds / Math.max(orders, 1));
    return {
      ticketId: p.ticket,
      product: p.name,
      adGroupName: p.group,
      semClicks: randInt(5, 300),
      semSpend,
      orders,
      refunds,
      grossCommission: gross,
      netCommission: net,
      roi: gross / semSpend,
      netRoi: net / semSpend,
      adType: "SEM",
    };
  });

  const dsaExtras = (month: string, n: number): RoiRow[] =>
    Array.from({ length: n }).map((_, i) => {
      const p = pick(products);
      const semSpend = rand(0.6, 12);
      const orders = randInt(0, 8);
      const gross = orders * rand(1.2, 2.8);
      return {
        ticketId: `${p.ticket}-dsa-${month}-${i}`,
        product: p.name,
        adGroupName: p.group,
        semClicks: randInt(0, 120),
        semSpend,
        orders,
        refunds: 0,
        grossCommission: gross,
        netCommission: gross,
        roi: semSpend ? gross / semSpend : 0,
        netRoi: semSpend ? gross / semSpend : 0,
        adType: "DSA",
      };
    });

  const roiSets: Array<[string, RoiRow[]]> = [
    ["2026-08", [...roi0808, ...dsaExtras("2026-08", 227)]],
    ["2026-07", [...roi0807, ...dsaExtras("2026-07", 514)]],
    ["2026-06", [...roi0806, ...dsaExtras("2026-06", 180)]],
  ];

  for (const [month, rows] of roiSets) {
    const data = rows.map((r) => ({ month, ...r }));
    for (let i = 0; i < data.length; i += chunkSize) {
      await prisma.productRoi.createMany({ data: data.slice(i, i + chunkSize) });
    }
  }

  // ---------------------------------------------------------------------
  // Token usage log — captured rows + generated history
  // ---------------------------------------------------------------------
  const capturedTokenRows = [
    { product: "Paris - Louvre Museum Audio Guide (EN)", prompt: 2623, completion: 440, time: "2026-06-25T01:03:00" },
    { product: "Seoul - WOWPASS", prompt: 2657, completion: 476, time: "2026-06-25T01:03:30" },
    { product: "Seoul - N Seoul Tower Observatory", prompt: 3094, completion: 551, time: "2026-06-25T01:02:40" },
    { product: "Tokyo - Skyliner Tickets", prompt: 2684, completion: 477, time: "2026-06-25T01:02:10" },
    { product: "Osaka - Osaka Amazing Pass (E-Ticket)", prompt: 2643, completion: 400, time: "2026-06-25T01:02:00" },
    { product: "Tokyo - Wide Area Pass", prompt: 2702, completion: 493, time: "2026-06-25T01:01:30" },
    { product: "Tokyo - Harry Potter Studio Tour", prompt: 2698, completion: 476, time: "2026-06-25T01:01:00" },
    { product: "Top - Jeju Private Car Charter", prompt: 3152, completion: 530, time: "2026-06-24T02:09:00" },
    { product: "Top - Fukuoka Day Tour", prompt: 2653, completion: 347, time: "2026-06-24T02:09:20" },
    { product: "Tokyo - Kamakura Day Tour", prompt: 2664, completion: 408, time: "2026-06-24T02:09:40" },
    { product: "Tokyo - Hakone Day Tour", prompt: 2658, completion: 452, time: "2026-06-24T02:08:10" },
    { product: "Tokyo - Yokohama Day Tour", prompt: 3122, completion: 566, time: "2026-06-24T02:08:40" },
  ];
  for (const r of capturedTokenRows) {
    await prisma.tokenUsageLog.create({
      data: {
        product: r.product,
        groupCount: 1,
        feature: "keyword",
        promptTokens: r.prompt,
        completionTokens: r.completion,
        totalTokens: r.prompt + r.completion,
        createdAt: new Date(r.time),
      },
    });
  }
  const historyStart = new Date("2026-06-01");
  const historyEnd = new Date("2026-08-13");
  const historyRows = [];
  for (let i = 0; i < 704; i++) {
    const dayRange = (historyEnd.getTime() - historyStart.getTime()) / 86400000;
    const d = new Date(historyStart.getTime() + randInt(0, dayRange) * 86400000 + randInt(0, 86400000));
    const prompt = randInt(1800, 3400);
    const completion = randInt(300, 650);
    historyRows.push({
      product: `${pick(["Tokyo", "Osaka", "Seoul", "Busan", "Fukuoka", "Okinawa", "Kyoto"])} - ${pick(["Tickets", "Day Tour", "Rail Pass", "Private Charter", "Experience", "Transport Pass"])} #${randInt(1000, 99999)}`,
      groupCount: 1,
      feature: pick(["keyword", "sitelink"]),
      promptTokens: prompt,
      completionTokens: completion,
      totalTokens: prompt + completion,
      createdAt: d,
    });
  }
  for (let i = 0; i < historyRows.length; i += chunkSize) {
    await prisma.tokenUsageLog.createMany({ data: historyRows.slice(i, i + chunkSize) });
  }

  // ---------------------------------------------------------------------
  // Health check
  // ---------------------------------------------------------------------
  const healthChecks = [
    { category: "Account Structure", name: "Ad group count health", status: "good", score: 92, description: "Ad group counts per campaign are within the recommended range" },
    { category: "Account Structure", name: "Unused campaigns", status: "warning", score: 68, description: "Voyara_SEM_Draft has had no spend for 45 days", suggestion: "Confirm whether it can be paused or removed" },
    { category: "Keywords", name: "Low quality score ratio", status: "warning", score: 61, description: "38 keywords have QS ≤ 4, 6.2% of the account", suggestion: "Review landing page and ad relevance" },
    { category: "Keywords", name: "Negative keyword coverage", status: "good", score: 88, description: "DSA campaigns' negative keyword lists are kept up to date" },
    { category: "Bidding", name: "Automated bidding adoption", status: "good", score: 95, description: "95% of spend runs on Smart Bidding strategies" },
    { category: "Landing Pages", name: "Landing page load speed", status: "critical", score: 42, description: "12 landing pages load in over 4 seconds on mobile", suggestion: "Prioritize fixing high-spend product pages" },
    { category: "Ad Creative", name: "RSA strength", status: "warning", score: 70, description: "23% of ad groups have an RSA strength below \"Good\"", suggestion: "Use AI copy generation to fill gaps in one click" },
    { category: "Budget", name: "Budget-limited campaigns", status: "critical", score: 55, description: "Voyara_SEM_Osaka was budget-limited for 9 days this month", suggestion: "Consider raising budget or reallocating by ROI" },
    { category: "Tracking", name: "Conversion tracking health", status: "good", score: 97, description: "All campaigns are receiving conversion events correctly" },
    { category: "Sitelinks", name: "Sitelink coverage", status: "warning", score: 73, description: "6 campaigns have no sitelinks configured", suggestion: "Use AI-generated sitelinks to fill the gap quickly" },
  ];
  for (const h of healthChecks) {
    await prisma.healthCheckItem.create({ data: h });
  }

  // ---------------------------------------------------------------------
  // Review status
  // ---------------------------------------------------------------------
  const reviewCampaignsPool = campaignDefs.map((c) => c.name);
  const reviewSamples = [
    { type: "ad", status: "Approved" },
    { type: "ad", status: "In Review" },
    { type: "ad", status: "Disapproved", reason: "Ad copy contains an unsubstantiated pricing claim" },
    { type: "keyword", status: "Approved" },
    { type: "keyword", status: "Limited", reason: "Regional policy restriction (health-related terms)" },
    { type: "extension", status: "Approved" },
    { type: "extension", status: "In Review" },
  ];
  for (let i = 0; i < 24; i++) {
    const s = pick(reviewSamples);
    const campaign = pick(reviewCampaignsPool);
    await prisma.reviewStatus.create({
      data: {
        type: s.type,
        name:
          s.type === "ad"
            ? `RSA | ${pick(products).name}`
            : s.type === "keyword"
              ? pick(products).group + " " + pick(suffixes)
              : `Sitelink | ${pick(sitelinkDefs).title}`,
        campaign,
        adGroup: Math.random() > 0.4 ? pick(products).group : undefined,
        status: s.status,
        reason: s.reason,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Keyword planning ideas
  // ---------------------------------------------------------------------
  const seedTerms = ["Osaka Amazing Pass", "JR Pass", "USJ Tickets", "Busan City Pass", "Japan eSIM", "Okinawa FunPASS"];
  for (const seed of seedTerms) {
    const n = randInt(3, 5);
    for (let i = 0; i < n; i++) {
      await prisma.keywordIdea.create({
        data: {
          seedTerm: seed,
          suggestion: `${seed} ${pick(["promo code", "discount", "how to buy", "reviews", "official site", "price comparison"])}`,
          avgMonthlySearch: randInt(90, 12000),
          competition: pick(["Low", "Medium", "High"]),
          suggestedBid: rand(0.4, 1.4),
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Image assets — placeholder swatches, no source screenshot
  // ---------------------------------------------------------------------
  const imageAssetDefs = products.flatMap((p) => [
    { fileName: `${p.group.replace(/[^a-zA-Z0-9]+/g, "_")}_banner.jpg`, tags: "banner,hero", campaign: p.group, width: 1200, height: 628, sizeKb: randInt(180, 640) },
    { fileName: `${p.group.replace(/[^a-zA-Z0-9]+/g, "_")}_square.jpg`, tags: "square,social", campaign: p.group, width: 1080, height: 1080, sizeKb: randInt(150, 500) },
  ]);
  for (const img of imageAssetDefs) {
    await prisma.imageAsset.create({
      data: { ...img, url: `local://${img.fileName}` },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
