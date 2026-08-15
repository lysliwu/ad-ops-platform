import Link from "next/link";
import {
  BarChart3,
  Image as ImageIcon,
  KeyRound,
  Layers,
  ListChecks,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge, Card, KpiCard, PageTitle } from "@/components/ui";
import { fmtDecimal, fmtInt, fmtUSD } from "@/lib/format";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<string, string> = {
  google_ads: "Google Ads",
  meta: "Meta",
  tiktok: "TikTok",
  snapchat: "Snapchat",
};

export default async function DashboardPage() {
  const [
    campaignCount,
    adGroupCount,
    keywordCount,
    daily,
    tokenAgg,
    tokenCount,
    latestRoi,
    healthItems,
    pendingReview,
    campaignsByPlatform,
  ] = await Promise.all([
    prisma.campaign.count(),
    prisma.adGroup.count(),
    prisma.keyword.count(),
    prisma.dailyMetric.findMany({ orderBy: { date: "desc" }, take: 7 }),
    prisma.tokenUsageLog.aggregate({ _sum: { totalTokens: true } }),
    prisma.tokenUsageLog.count(),
    prisma.productRoi.findMany({ where: { month: "2026-08" } }),
    prisma.healthCheckItem.findMany(),
    prisma.reviewStatus.count({ where: { status: "In Review" } }),
    prisma.campaign.groupBy({ by: ["platform"], _count: { _all: true } }),
  ]);

  const weekSpend = daily.reduce((s, d) => s + d.spend, 0);
  const weekClicks = daily.reduce((s, d) => s + d.clicks, 0);
  const roiSpend = latestRoi.reduce((s, r) => s + r.semSpend, 0);
  const roiCommission = latestRoi.reduce((s, r) => s + r.netCommission, 0);
  const roi = roiSpend ? roiCommission / roiSpend : 0;
  const avgHealth = healthItems.length
    ? Math.round(healthItems.reduce((s, h) => s + h.score, 0) / healthItems.length)
    : 0;

  const modules = [
    { href: "/performance", icon: BarChart3, title: "Performance", desc: "Impressions, clicks, spend trends, and ad group rankings" },
    { href: "/keyword-quality", icon: Search, title: "Keyword Quality", desc: "Quality Score and AI-generated keywords" },
    { href: "/sitelinks", icon: Layers, title: "Sitelinks", desc: "One-click AI generation, drag to reorder" },
    { href: "/image-assets", icon: ImageIcon, title: "Image Assets", desc: "Ad creative image library" },
    { href: "/token-usage", icon: Sparkles, title: "Token Usage", desc: "LLM call counts and token consumption" },
    { href: "/health-check", icon: ShieldCheck, title: "Health Check", desc: "Account structure, keyword, and landing page audits" },
    { href: "/keyword-planning", icon: KeyRound, title: "Keyword Planning", desc: "Seed term expansion and bid suggestions" },
    { href: "/review-status", icon: ListChecks, title: "Review Status", desc: "Ad / keyword / asset review tracking" },
    { href: "/klook-roi", icon: TrendingUp, title: "ROI", desc: "Affiliate performance comparison and automated DSA optimization" },
  ];

  return (
    <div>
      <PageTitle
        title="Dashboard"
        subtitle="An LLM-powered ad ops platform — one-click optimization, copy fill, keyword fill, image sourcing, and ROI optimization all in one place"
      />

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Spend (7 days)" value={fmtUSD(weekSpend)} />
        <KpiCard label="Clicks (7 days)" value={fmtInt(weekClicks)} />
        <KpiCard
          label="ROI this month"
          value={fmtDecimal(roi)}
          valueClassName={roi >= 1 ? "text-emerald-600" : "text-amber-600"}
        />
        <KpiCard
          label="Account health score"
          value={String(avgHealth)}
          valueClassName={avgHealth >= 80 ? "text-emerald-600" : "text-amber-600"}
        />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Campaigns" value={fmtInt(campaignCount)} />
        <KpiCard label="Ad groups" value={fmtInt(adGroupCount)} />
        <KpiCard label="Keywords" value={fmtInt(keywordCount)} />
        <KpiCard label="Pending review" value={fmtInt(pendingReview)} valueClassName="text-amber-600" />
      </div>

      <Card className="mb-4">
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>Connected ad platforms</span>
          <span className="text-gray-400">More platforms coming soon</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {campaignsByPlatform.map((p) => (
            <Badge key={p.platform} tone="blue">
              {PLATFORM_LABEL[p.platform] ?? p.platform} · {p._count._all}
            </Badge>
          ))}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Total LLM generations</span>
          <span className="font-medium text-gray-800">
            {fmtInt(tokenCount)} calls · {fmtInt(tokenAgg._sum.totalTokens ?? 0)} tokens
          </span>
        </div>
      </Card>

      <h2 className="mb-3 text-sm font-semibold text-gray-700">Modules</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link key={m.href} href={m.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <m.icon size={20} className="mb-2 text-blue-600" />
              <div className="text-sm font-semibold text-gray-900">{m.title}</div>
              <div className="mt-0.5 text-xs text-gray-500">{m.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
