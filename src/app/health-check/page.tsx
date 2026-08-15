import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Card, KpiCard, PageTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS_META = {
  good: { icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-50", label: "Good" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-50", label: "Needs attention" },
  critical: { icon: XCircle, color: "text-red-500", bg: "bg-red-50", label: "Needs immediate action" },
} as const;

export default async function HealthCheckPage() {
  const items = await prisma.healthCheckItem.findMany({ orderBy: { score: "asc" } });
  const avgScore = items.length ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length) : 0;
  const critical = items.filter((i) => i.status === "critical").length;
  const warning = items.filter((i) => i.status === "warning").length;

  const grouped = items.reduce<Record<string, typeof items>>((acc, i) => {
    (acc[i.category] ??= []).push(i);
    return acc;
  }, {});

  return (
    <div>
      <PageTitle title="Health Check" subtitle="Automated audits of account structure, keywords, bidding, and landing pages" />

      <div className="mb-4 grid grid-cols-3 gap-3">
        <KpiCard
          label="Account health score"
          value={String(avgScore)}
          valueClassName={avgScore >= 80 ? "text-emerald-600" : avgScore >= 60 ? "text-amber-600" : "text-red-600"}
        />
        <KpiCard label="Needs immediate action" value={String(critical)} valueClassName="text-red-600" />
        <KpiCard label="Needs attention" value={String(warning)} valueClassName="text-amber-600" />
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([category, list]) => (
          <Card key={category}>
            <h2 className="mb-3 text-sm font-semibold text-gray-800">{category}</h2>
            <div className="space-y-2">
              {list.map((item) => {
                const meta = STATUS_META[item.status as keyof typeof STATUS_META];
                const Icon = meta.icon;
                return (
                  <div key={item.id} className={`flex items-start gap-3 rounded-lg ${meta.bg} p-3`}>
                    <Icon size={18} className={`mt-0.5 shrink-0 ${meta.color}`} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-800">{item.name}</span>
                        <span className={`text-xs font-semibold ${meta.color}`}>
                          {item.score} pts · {meta.label}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">{item.description}</p>
                      {item.suggestion && (
                        <p className="mt-1 text-xs font-medium text-blue-600">Suggestion: {item.suggestion}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
