"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge, Button, Card, Input, KpiCard, PageTitle } from "@/components/ui";
import { fmtDate, fmtDecimal, fmtInt, fmtUSD, fmtPct } from "@/lib/format";

type RoiRow = {
  id: string;
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
  adType: string;
};

type Summary = {
  orderCount: number;
  dateRange: [string, string] | null;
  spend: number;
  commission: number;
  roi: number;
  semCount: number;
  dsaCount: number;
  sem: RoiRow[];
  dsa: RoiRow[];
};

type Keyword = {
  id: string;
  text: string;
  matchType: string;
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  avgCpc: number;
  convRate: number;
  qualityScore: number | null;
  currentBid: number;
};

type Detail = {
  found: boolean;
  campaignName?: string;
  groupSpend?: number;
  avgCpc?: number;
  selfBidPrice?: number;
  keywords?: Keyword[];
};

const MONTHS = ["2026-08", "2026-07", "2026-06"];
type SortKey = keyof Pick<
  RoiRow,
  "semClicks" | "semSpend" | "orders" | "refunds" | "grossCommission" | "netCommission" | "roi" | "netRoi"
>;

function SortHeader({
  label,
  k,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void;
}) {
  return (
    <th
      className="cursor-pointer select-none px-2 py-2 text-right hover:text-gray-700"
      onClick={() => onSort(k)}
    >
      {label} {sortKey === k ? (sortDir === "asc" ? "▲" : "▼") : ""}
    </th>
  );
}

export default function KlookRoiPage() {
  const [month, setMonth] = useState(MONTHS[0]);
  const [tab, setTab] = useState<"SEM" | "DSA">("SEM");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("netRoi");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [from, setFrom] = useState("2026-06-01");
  const [to, setTo] = useState("2026-08-14");
  const [optimizing, setOptimizing] = useState(false);
  type OptimizeItem = {
    id: string;
    product: string;
    adGroupName: string;
    spend: number;
    roi: number;
    orders: number;
    action: string;
  };
  const [optimizeItems, setOptimizeItems] = useState<OptimizeItem[] | null>(null);
  const [showOptimize, setShowOptimize] = useState(false);

  async function loadSummary(m: string) {
    setSummary(null);
    const res = await fetch(`/api/klook/summary?month=${m}`);
    setSummary(await res.json());
  }

  useEffect(() => {
    loadSummary(month);
    setExpanded(null);
    setShowOptimize(false);
    setOptimizeItems(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  async function generateReport() {
    setGenerating(true);
    await fetch("/api/klook/generate-report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    await loadSummary(month);
    setGenerating(false);
  }

  async function previewOptimize() {
    setShowOptimize(true);
    setOptimizing(true);
    setOptimizeItems(null);
    const res = await fetch("/api/klook/optimize-dsa", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ month }),
    });
    const d = await res.json();
    setOptimizeItems(d.items);
    setOptimizing(false);
  }

  async function toggleExpand(row: RoiRow) {
    if (expanded === row.id) {
      setExpanded(null);
      return;
    }
    setExpanded(row.id);
    setDetail(null);
    setDetailLoading(true);
    const res = await fetch(`/api/klook/detail?adGroupName=${encodeURIComponent(row.adGroupName)}`);
    setDetail(await res.json());
    setDetailLoading(false);
  }

  const rows = summary ? (tab === "SEM" ? summary.sem : summary.dsa) : [];

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? diff : -diff;
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  function sortBy(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div>
      <PageTitle title="ROI" subtitle="Affiliate performance comparison and automated DSA optimization" />

      <Card className="mb-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-800">Affiliate Performance Comparison</h2>
        <p className="mb-3 text-xs text-gray-500">
          Reports are always generated from orders already imported into the database — just pick a
          date range. You only need to select a file when importing a new report (deduped by Ticket
          ID, so re-importing never double-counts).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500">
            Select report file
          </span>
          <span className="text-xs text-gray-400">Date range</span>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="text-xs" />
          <span className="text-xs text-gray-400">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="text-xs" />
          <Button onClick={generateReport} disabled={generating}>
            {generating ? "Generating…" : "Generate Report (from imported data)"}
          </Button>
        </div>
        {summary && (
          <p className="mt-2 text-xs text-gray-400">
            {fmtInt(summary.orderCount)} orders in the database
            {summary.dateRange &&
              ` (${fmtDate(summary.dateRange[0])} – ${fmtDate(summary.dateRange[1])})`}
            . Re-importing automatically dedupes.
          </p>
        )}
      </Card>

      <Card className="mb-4">
        <h2 className="mb-1 text-sm font-semibold text-gray-800">Automated DSA Optimization</h2>
        <p className="mb-3 text-xs text-gray-500">
          Tiered by performance over the selected period: DSA spend &gt; $6 and ROI &lt; 0.5 → exclude
          the landing page; spend $1.5-$6 → exclude only non-converting search terms; existing
          exclusions are skipped automatically.
        </p>
        <Button variant="secondary" onClick={previewOptimize}>
          Preview optimization items
        </Button>
        {showOptimize && (
          <div className="mt-3 border-t border-gray-100 pt-3">
            {optimizing ? (
              <p className="text-sm text-gray-400">Calculating…</p>
            ) : optimizeItems && optimizeItems.length > 0 ? (
              <>
                <p className="mb-2 text-xs text-gray-500">Found {optimizeItems.length} items to optimize</p>
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-400">
                        <th className="py-1">Product</th>
                        <th className="py-1 text-right">Spend</th>
                        <th className="py-1 text-right">ROI</th>
                        <th className="py-1 text-right">Suggested Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {optimizeItems.map((it) => (
                        <tr key={it.id} className="border-t border-gray-50">
                          <td className="py-1.5">
                            <div className="font-medium text-gray-800">{it.product}</div>
                            <div className="text-gray-400">{it.adGroupName}</div>
                          </td>
                          <td className="py-1.5 text-right">{fmtUSD(it.spend)}</td>
                          <td className="py-1.5 text-right">{fmtDecimal(it.roi)}</td>
                          <td className="py-1.5 text-right">
                            <Badge tone={it.action === "Exclude landing page" ? "red" : "yellow"}>{it.action}</Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-gray-400">No optimization items match the criteria right now</p>
            )}
          </div>
        )}
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <div className="flex gap-1">
          {MONTHS.map((m) => (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                month === m ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {summary && (
          <span className="text-xs text-gray-400">
            {fmtInt(summary.semCount + summary.dsaCount)} products in this report
          </span>
        )}
      </div>

      {summary && (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <KpiCard label="Ad spend" value={fmtUSD(summary.spend)} />
          <KpiCard label="Commission revenue" value={fmtUSD(summary.commission)} />
          <KpiCard
            label="Overall ROI"
            value={fmtDecimal(summary.roi)}
            valueClassName={summary.roi >= 1 ? "text-emerald-600" : "text-amber-600"}
          />
        </div>
      )}

      <div className="mb-2 flex gap-2">
        <button
          onClick={() => setTab("SEM")}
          className={`rounded-md px-3 py-1 text-xs font-semibold ${
            tab === "SEM" ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          SEM ({summary?.semCount ?? 0})
        </button>
        <button
          onClick={() => setTab("DSA")}
          className={`rounded-md px-3 py-1 text-xs font-semibold ${
            tab === "DSA" ? "bg-blue-100 text-blue-700" : "text-gray-400 hover:text-gray-600"
          }`}
        >
          DSA ({summary?.dsaCount ?? 0})
        </button>
      </div>

      <Card className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                <th className="w-6 px-3 py-2" />
                <th className="px-1 py-2">Product</th>
                <th className="px-1 py-2">Primary Ad Group</th>
                <SortHeader label="SEM Clicks" k="semClicks" sortKey={sortKey} sortDir={sortDir} onSort={sortBy} />
                <SortHeader label="SEM Spend" k="semSpend" sortKey={sortKey} sortDir={sortDir} onSort={sortBy} />
                <SortHeader label="Orders" k="orders" sortKey={sortKey} sortDir={sortDir} onSort={sortBy} />
                <SortHeader label="Refunds" k="refunds" sortKey={sortKey} sortDir={sortDir} onSort={sortBy} />
                <SortHeader label="Gross Comm." k="grossCommission" sortKey={sortKey} sortDir={sortDir} onSort={sortBy} />
                <SortHeader label="Net Comm." k="netCommission" sortKey={sortKey} sortDir={sortDir} onSort={sortBy} />
                <SortHeader label="ROI" k="roi" sortKey={sortKey} sortDir={sortDir} onSort={sortBy} />
                <th
                  className="cursor-pointer select-none px-3 py-2 text-right hover:text-gray-700"
                  onClick={() => sortBy("netRoi")}
                >
                  Net ROI {sortKey === "netRoi" ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
                </th>
              </tr>
            </thead>
            <tbody>
              {!summary && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-400">
                    Loading…
                  </td>
                </tr>
              )}
              {summary && sorted.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-gray-400">
                    No data for this month
                  </td>
                </tr>
              )}
              {sorted.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    className="cursor-pointer border-b border-gray-50 hover:bg-gray-50"
                    onClick={() => toggleExpand(r)}
                  >
                    <td className="px-3 py-2.5 text-gray-400">
                      {expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </td>
                    <td className="px-1 py-2.5">
                      <div className="text-xs text-gray-400">{r.ticketId}</div>
                      <div className="font-medium text-gray-900">{r.product}</div>
                    </td>
                    <td className="px-1 py-2.5 text-xs text-gray-500">{r.adGroupName}</td>
                    <td className="px-1 py-2.5 text-right">{fmtInt(r.semClicks)}</td>
                    <td className="px-1 py-2.5 text-right">{fmtUSD(r.semSpend)}</td>
                    <td className="px-1 py-2.5 text-right">{fmtInt(r.orders)}</td>
                    <td className="px-1 py-2.5 text-right">
                      {r.refunds > 0 ? <span className="text-red-500">{r.refunds}</span> : "—"}
                    </td>
                    <td className="px-1 py-2.5 text-right">{fmtUSD(r.grossCommission)}</td>
                    <td className="px-1 py-2.5 text-right">{fmtUSD(r.netCommission)}</td>
                    <td className="px-1 py-2.5 text-right text-emerald-600">{fmtDecimal(r.roi)}</td>
                    <td className="px-3 py-2.5 text-right font-medium text-emerald-600">
                      {fmtDecimal(r.netRoi)}
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <td colSpan={11} className="px-6 py-4">
                        {detailLoading ? (
                          <p className="text-sm text-gray-400">Loading…</p>
                        ) : !detail?.found ? (
                          <p className="text-sm text-gray-400">No matching ad group details found</p>
                        ) : (
                          <div>
                            <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
                              <span className="font-medium text-gray-700">{r.adGroupName}</span>
                              <span>{detail.campaignName}</span>
                              <span>Group self-bid {fmtUSD(detail.selfBidPrice ?? 0)}</span>
                              <span>Group spend {fmtUSD(detail.groupSpend ?? 0)}</span>
                              <span>Avg. CPC {fmtUSD(detail.avgCpc ?? 0)}</span>
                            </div>
                            {detail.keywords && detail.keywords.length > 0 ? (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-gray-400">
                                    <th className="py-1">Keyword</th>
                                    <th className="py-1">Match</th>
                                    <th className="py-1 text-right">Impressions</th>
                                    <th className="py-1 text-right">Clicks</th>
                                    <th className="py-1 text-right">CTR</th>
                                    <th className="py-1 text-right">Spend</th>
                                    <th className="py-1 text-right">Avg. CPC</th>
                                    <th className="py-1 text-right">Conv. Rate</th>
                                    <th className="py-1 text-right">Quality Score</th>
                                    <th className="py-1 text-right">Current Bid</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {detail.keywords.map((k) => (
                                    <tr key={k.id} className="border-t border-gray-100">
                                      <td className="py-1.5 font-medium text-gray-800">{k.text}</td>
                                      <td className="py-1.5 text-gray-400">{k.matchType}</td>
                                      <td className="py-1.5 text-right">{fmtInt(k.impressions)}</td>
                                      <td className="py-1.5 text-right">{fmtInt(k.clicks)}</td>
                                      <td className="py-1.5 text-right">{fmtPct(k.ctr, 1)}</td>
                                      <td className="py-1.5 text-right">{fmtUSD(k.spend)}</td>
                                      <td className="py-1.5 text-right">{fmtUSD(k.avgCpc)}</td>
                                      <td className="py-1.5 text-right">{fmtPct(k.convRate, 0)}</td>
                                      <td className="py-1.5 text-right">{k.qualityScore ?? "—"}</td>
                                      <td className="py-1.5 text-right">{fmtUSD(k.currentBid)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-sm text-gray-400">No keyword data for this group yet</p>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
