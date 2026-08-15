"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Badge, Button, Card, KpiCard, PageTitle } from "@/components/ui";
import { fmtInt, fmtDateTime, fmtPct } from "@/lib/format";

type Row = {
  id: string;
  product: string;
  groupCount: number;
  feature: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  createdAt: string;
};

export default function TokenUsagePage() {
  const [data, setData] = useState<{
    totalGenerations: number;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
    rows: Row[];
  } | null>(null);

  async function load() {
    const res = await fetch("/api/token-usage?limit=50");
    setData(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  const promptPct = data && data.totalTokens ? (data.promptTokens / data.totalTokens) * 100 : 0;
  const completionPct = 100 - promptPct;

  return (
    <div>
      <PageTitle
        title="Token Usage"
        actions={
          <Button variant="ghost" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
        }
      />

      {data && (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Total generations" value={fmtInt(data.totalGenerations)} hint="generate calls" />
            <KpiCard label="Total token usage" value={fmtInt(data.totalTokens)} hint="prompt + completion" valueClassName="text-blue-600" />
            <KpiCard label="Prompt tokens" value={fmtInt(data.promptTokens)} hint={`${fmtPct(promptPct, 0)} of total`} />
            <KpiCard label="Completion tokens" value={fmtInt(data.completionTokens)} hint={`${fmtPct(completionPct, 0)} of total`} />
          </div>

          <Card className="mb-4">
            <div className="mb-2 flex items-center gap-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-blue-500" /> Prompt {fmtPct(promptPct, 0)}
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Completion {fmtPct(completionPct, 0)}
              </span>
            </div>
            <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
              <div className="bg-blue-500" style={{ width: `${promptPct}%` }} />
              <div className="bg-emerald-500" style={{ width: `${completionPct}%` }} />
            </div>
          </Card>

          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="px-4 py-2">Product</th>
                    <th className="px-2 py-2 text-right">Groups</th>
                    <th className="px-2 py-2 text-right">Prompt</th>
                    <th className="px-2 py-2 text-right">Completion</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r) => (
                    <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">{r.product}</div>
                        <Badge tone={r.feature === "keyword" ? "blue" : "green"}>
                          {r.feature === "keyword" ? "Keyword generation" : "Sitelink generation"}
                        </Badge>
                      </td>
                      <td className="px-2 py-2.5 text-right">{r.groupCount}</td>
                      <td className="px-2 py-2.5 text-right">{fmtInt(r.promptTokens)}</td>
                      <td className="px-2 py-2.5 text-right">{fmtInt(r.completionTokens)}</td>
                      <td className="px-2 py-2.5 text-right font-medium text-blue-600">
                        {fmtInt(r.totalTokens)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400">
                        {fmtDateTime(r.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
