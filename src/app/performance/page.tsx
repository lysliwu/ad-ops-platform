"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import { Badge, Button, Card, KpiCard, PageTitle, Select } from "@/components/ui";
import { fmtInt, fmtUSD, fmtPct, fmtDecimal } from "@/lib/format";

type Campaign = { id: string; name: string; type: string; platform: string };
type AdGroupRow = {
  id: string;
  name: string;
  campaignName: string;
  platform: string;
  adScore: string | null;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  avgCpc: number;
};
type DailyRow = {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  avgCpc: number;
};

const PLATFORM_LABEL: Record<string, string> = {
  google_ads: "Google Ads",
  meta: "Meta",
  tiktok: "TikTok",
  snapchat: "Snapchat",
};

const BAR_METRICS = [
  { key: "spend", label: "Spend ($)" },
  { key: "impressions", label: "Impressions" },
  { key: "clicks", label: "Clicks" },
  { key: "ctr", label: "CTR (%)" },
] as const;

const DAY_OPTIONS = [7, 14, 30];

export default function PerformancePage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("all");
  const [days, setDays] = useState(30);
  const [barMetric, setBarMetric] = useState<(typeof BAR_METRICS)[number]["key"]>("spend");
  const [showCpcLine, setShowCpcLine] = useState(true);
  const [kpi, setKpi] = useState({ impressions: 0, clicks: 0, ctr: 0, spend: 0 });
  const [daily, setDaily] = useState<DailyRow[]>([]);
  const [adGroups, setAdGroups] = useState<AdGroupRow[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns(d.campaigns));
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/performance?campaignId=${campaignId}&days=${days}`);
    const data = await res.json();
    setKpi(data.kpi);
    setDaily(data.daily);
    setAdGroups(data.adGroups);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId, days]);

  async function syncGoogleAds() {
    setSyncing(true);
    await fetch("/api/google-ads/sync", { method: "POST" });
    await load();
    setSyncing(false);
  }

  const allChecked = adGroups.length > 0 && selected.size === adGroups.length;

  function toggleAll() {
    setSelected(allChecked ? new Set() : new Set(adGroups.map((a) => a.id)));
  }
  function toggleOne(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function exportCsv() {
    const header = ["Ad Group", "Ad Score", "Impressions", "Clicks", "CTR", "Spend", "Avg. CPC"];
    const rows = adGroups.map((a) => [
      a.name,
      a.adScore ?? "",
      a.impressions,
      a.clicks,
      fmtPct(a.ctr),
      a.spend.toFixed(2),
      a.avgCpc.toFixed(2),
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "performance.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const barLabel = useMemo(
    () => BAR_METRICS.find((m) => m.key === barMetric)?.label ?? "",
    [barMetric]
  );

  return (
    <div>
      <PageTitle title="Performance" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="all">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              [{PLATFORM_LABEL[c.platform] ?? c.platform}] {c.name}
            </option>
          ))}
        </Select>
        <div className="flex items-center gap-2">
          <Select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {DAY_OPTIONS.map((d) => (
              <option key={d} value={d}>
                Last {d} days
              </option>
            ))}
          </Select>
          <Button variant="ghost" onClick={load}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button onClick={syncGoogleAds} disabled={syncing}>
            <RefreshCw size={14} /> {syncing ? "Syncing…" : "Sync from Google Ads"}
          </Button>
          <Button variant="ghost" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Total impressions" value={fmtInt(kpi.impressions)} />
        <KpiCard label="Total clicks" value={fmtInt(kpi.clicks)} />
        <KpiCard label="Average CTR" value={fmtPct(kpi.ctr)} valueClassName="text-blue-600" />
        <KpiCard label="Total spend" value={fmtUSD(kpi.spend, 0)} />
      </div>

      <Card className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-800">Daily performance trend</h2>
          <div className="flex gap-1.5">
            {BAR_METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setBarMetric(m.key)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  barMetric === m.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {m.label}
              </button>
            ))}
            <button
              onClick={() => setShowCpcLine((v) => !v)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                showCpcLine
                  ? "bg-emerald-500 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Avg. CPC ($)
            </button>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ComposedChart data={daily} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#888" }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#888" }} />
              <Tooltip
                formatter={(value, name) => [
                  fmtDecimal(Number(value ?? 0), name === barLabel ? 1 : 2),
                  String(name),
                ]}
              />
              <Bar yAxisId="left" dataKey={barMetric} name={barLabel} fill="#6366f1" radius={[3, 3, 0, 0]} />
              {showCpcLine && (
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgCpc"
                  name="Avg. CPC ($)"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="w-8 px-4 py-2">
                  <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                </th>
                <th className="px-2 py-2">Ad Group</th>
                <th className="px-2 py-2 text-right">Impressions ↓</th>
                <th className="px-2 py-2 text-right">Clicks</th>
                <th className="px-2 py-2 text-right">CTR</th>
                <th className="px-2 py-2 text-right">Spend</th>
                <th className="px-2 py-2 text-right">Avg. CPC</th>
                <th className="px-4 py-2 text-right">Score</th>
              </tr>
            </thead>
            <tbody>
              {!loading && adGroups.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-sm text-gray-400">
                    No data for this campaign
                  </td>
                </tr>
              )}
              {adGroups.map((a) => (
                <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={selected.has(a.id)}
                      onChange={() => toggleOne(a.id)}
                    />
                  </td>
                  <td className="px-2 py-2.5">
                    <div className="font-medium text-gray-900">{a.name}</div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Badge tone="gray">{PLATFORM_LABEL[a.platform] ?? a.platform}</Badge>
                      {a.campaignName}
                    </div>
                  </td>
                  <td className="px-2 py-2.5 text-right">{fmtInt(a.impressions)}</td>
                  <td className="px-2 py-2.5 text-right">{fmtInt(a.clicks)}</td>
                  <td className="px-2 py-2.5 text-right">{fmtPct(a.ctr)}</td>
                  <td className="px-2 py-2.5 text-right">{fmtUSD(a.spend, 0)}</td>
                  <td className="px-2 py-2.5 text-right">${fmtDecimal(a.avgCpc)}</td>
                  <td className="px-4 py-2.5 text-right">
                    {a.adScore && <Badge tone="blue">{a.adScore}</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
