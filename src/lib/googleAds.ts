import { prisma } from "@/lib/prisma";

export type GoogleAdsSyncResult = {
  source: "live" | "mock";
  metricsSynced: number;
  keywordsUpdated: number;
  searchTermsFound: number;
  diagnosticsFlagged: number;
};

const DISAPPROVAL_REASONS = [
  "Ad copy contains an unsubstantiated pricing claim",
  "Regional policy restriction (health-related terms)",
  "Destination URL not accessible from crawler",
];
const LIMITED_REASONS = [
  "Serving status: LIMITED — low quality score",
  "Serving status: LIMITED — daily budget capped before end of day",
];

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function jitter(base: number, pct: number) {
  return Math.max(0, base * (1 + rand(-pct, pct)));
}

// Real integration point: once there's a Google Ads MCC account + developer
// token, point these at the real API. Expected calls (Google Ads API v18):
//   customers.googleAds.search with a GAQL query against
//   campaign/ad_group/ad_group_criterion (keywords) and
//   search_term_view for the search term report.
// Without GOOGLE_ADS_DEVELOPER_TOKEN configured, everything below is
// deterministic-shape mock data so the UI works without a live account.
export async function syncGoogleAds(): Promise<GoogleAdsSyncResult> {
  const hasLiveCreds = Boolean(process.env.GOOGLE_ADS_DEVELOPER_TOKEN);
  if (hasLiveCreds) {
    throw new Error(
      "GOOGLE_ADS_DEVELOPER_TOKEN is set but the live Google Ads API client isn't implemented yet — remove the env var to use mock sync, or implement fetchLiveGoogleAdsData() in src/lib/googleAds.ts"
    );
  }

  const [metricsSynced, keywordsUpdated] = await Promise.all([syncDailyMetrics(), syncKeywordMetrics()]);
  const searchTermsFound = await syncSearchTerms();
  const diagnosticsFlagged = await syncAccountDiagnostics();

  return { source: "mock", metricsSynced, keywordsUpdated, searchTermsFound, diagnosticsFlagged };
}

async function syncDailyMetrics(): Promise<number> {
  const adGroups = await prisma.adGroup.findMany({
    where: { campaign: { platform: "google_ads" } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let synced = 0;
  for (const ag of adGroups) {
    const spend = jitter(Math.max(ag.spend / 30, 10), 0.4);
    const impressions = Math.round(jitter(Math.max(ag.impressions / 30, 100), 0.4));
    const clicks = Math.round(Math.max(1, jitter(Math.max(ag.clicks / 30, 5), 0.4)));
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const avgCpc = clicks > 0 ? spend / clicks : 0;

    await prisma.dailyMetric.deleteMany({ where: { adGroupId: ag.id, date: today } });
    await prisma.dailyMetric.create({
      data: { date: today, campaignId: ag.campaignId, adGroupId: ag.id, spend, impressions, clicks, ctr, avgCpc },
    });

    const newImpressions = ag.impressions + impressions;
    const newClicks = ag.clicks + clicks;
    const newSpend = ag.spend + spend;
    await prisma.adGroup.update({
      where: { id: ag.id },
      data: {
        impressions: newImpressions,
        clicks: newClicks,
        spend: newSpend,
        ctr: newImpressions > 0 ? (newClicks / newImpressions) * 100 : 0,
        avgCpc: newClicks > 0 ? newSpend / newClicks : 0,
      },
    });
    synced += 1;
  }
  return synced;
}

async function syncKeywordMetrics(): Promise<number> {
  const keywords = await prisma.keyword.findMany({
    where: { adGroup: { campaign: { platform: "google_ads" } } },
  });

  let updated = 0;
  for (const kw of keywords) {
    const impressions = kw.impressions + Math.round(jitter(50, 0.6));
    const clicks = kw.clicks + Math.round(jitter(3, 0.6));
    const spend = kw.spend + jitter(Math.max(kw.currentBid, 0.3) * 3, 0.5);
    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
    const avgCpc = clicks > 0 ? spend / clicks : kw.avgCpc;

    let qualityScore = kw.qualityScore ?? randInt(4, 9);
    if (Math.random() < 0.25) qualityScore = Math.min(10, Math.max(1, qualityScore + pick([-1, 1])));
    const estCtr = qualityScore >= 7 ? "Above average" : qualityScore >= 5 ? "Average" : "Below average";

    await prisma.keyword.update({
      where: { id: kw.id },
      data: { impressions, clicks, spend, ctr, avgCpc, qualityScore, estCtr },
    });
    updated += 1;
  }
  return updated;
}

// Search terms: variants of existing keyword text plus a few unrelated
// "discovered" queries, mimicking what Google Ads' search term report
// actually surfaces — some already covered by an exact keyword, some not.
const QUALIFIERS = ["best", "cheap", "near me", "discount code", "review", "how to book", "official"];

async function syncSearchTerms(): Promise<number> {
  const adGroups = await prisma.adGroup.findMany({
    where: { campaign: { platform: "google_ads" } },
    include: { keywords: true },
  });

  let created = 0;
  for (const ag of adGroups) {
    if (ag.keywords.length === 0) continue;
    const sample = ag.keywords.slice(0, Math.min(3, ag.keywords.length));
    for (const kw of sample) {
      const termCount = randInt(1, 2);
      for (let i = 0; i < termCount; i++) {
        const term = Math.random() < 0.5 ? `${pick(QUALIFIERS)} ${kw.text}` : `${kw.text} ${pick(QUALIFIERS)}`;
        const exists = await prisma.searchTermReport.findFirst({ where: { adGroupId: ag.id, term } });
        if (exists) continue;

        const impressions = randInt(20, 400);
        const clicks = randInt(0, Math.min(30, Math.round(impressions * 0.15)));
        const cost = clicks * jitter(Math.max(kw.currentBid, 0.4), 0.3);
        const conversions = clicks > 5 ? randInt(0, Math.round(clicks * 0.1)) : 0;

        await prisma.searchTermReport.create({
          data: {
            adGroupId: ag.id,
            term,
            matchedKeyword: kw.text,
            impressions,
            clicks,
            cost,
            conversions,
          },
        });
        created += 1;
      }
    }
  }
  return created;
}

// Account diagnostics: serving_status issues that don't show up anywhere in
// the normal ad group / keyword tables, only in a dedicated review queue.
async function syncAccountDiagnostics(): Promise<number> {
  const keywords = await prisma.keyword.findMany({
    where: { adGroup: { campaign: { platform: "google_ads" } } },
    include: { adGroup: { include: { campaign: true } } },
    take: 40,
  });
  if (keywords.length === 0) return 0;

  const flagCount = randInt(1, 3);
  let flagged = 0;
  for (let i = 0; i < flagCount; i++) {
    const kw = pick(keywords);
    const disapproved = Math.random() < 0.5;
    const status = disapproved ? "Disapproved" : "Limited";
    const reason = disapproved ? pick(DISAPPROVAL_REASONS) : pick(LIMITED_REASONS);

    const existing = await prisma.reviewStatus.findFirst({
      where: { type: "keyword", name: kw.text, adGroup: kw.adGroup.name },
    });
    if (existing) {
      await prisma.reviewStatus.update({ where: { id: existing.id }, data: { status, reason, updatedAt: new Date() } });
    } else {
      await prisma.reviewStatus.create({
        data: {
          type: "keyword",
          name: kw.text,
          campaign: kw.adGroup.campaign.name,
          adGroup: kw.adGroup.name,
          status,
          reason,
        },
      });
    }
    flagged += 1;
  }
  return flagged;
}
