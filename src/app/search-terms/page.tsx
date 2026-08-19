"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Ban, RefreshCw } from "lucide-react";
import { Badge, Button, Card, PageTitle, Select, EmptyState } from "@/components/ui";
import { fmtInt, fmtUSD, fmtPct } from "@/lib/format";

type Campaign = { id: string; name: string; platform: string };
type SearchTerm = {
  id: string;
  term: string;
  matchedKeyword: string | null;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  addedAsKeyword: boolean;
  excluded: boolean;
  adGroup: { id: string; name: string; campaign: { id: string; name: string } };
};

const SUGGEST_CLICK_THRESHOLD = 3;

export default function SearchTermsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("all");
  const [terms, setTerms] = useState<SearchTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlySuggestions, setOnlySuggestions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns((d.campaigns as Campaign[]).filter((c) => c.platform === "google_ads")));
  }, []);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/search-terms?campaignId=${campaignId}`);
    const d = await res.json();
    setTerms(d.terms);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function sync() {
    setSyncing(true);
    await fetch("/api/google-ads/sync", { method: "POST" });
    await load();
    setSyncing(false);
  }

  async function act(id: string, action: "addAsKeyword" | "exclude") {
    setBusyId(id);
    await fetch("/api/search-terms", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    await load();
    setBusyId(null);
  }

  const isSuggestion = (t: SearchTerm) => !t.addedAsKeyword && !t.excluded && t.clicks >= SUGGEST_CLICK_THRESHOLD;

  const visible = useMemo(
    () => (onlySuggestions ? terms.filter(isSuggestion) : terms),
    [terms, onlySuggestions]
  );

  return (
    <div>
      <PageTitle
        title="Search Terms"
        subtitle="Actual queries that triggered your ads — mine the high performers as new keywords, exclude the junk"
        actions={
          <Button onClick={sync} disabled={syncing}>
            <RefreshCw size={14} /> {syncing ? "Syncing…" : "Sync from Google Ads"}
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="all">All campaigns</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={onlySuggestions} onChange={(e) => setOnlySuggestions(e.target.checked)} />
          Only show suggestions ({SUGGEST_CLICK_THRESHOLD}+ clicks, not yet added)
        </label>
      </div>

      <Card className="p-0">
        {loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>
            No search terms yet — click &quot;Sync from Google Ads&quot; to pull the latest report
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-5 py-2">Search Term</th>
                  <th className="px-2 py-2">Ad Group</th>
                  <th className="px-2 py-2">Matched Keyword</th>
                  <th className="px-2 py-2 text-right">Impr.</th>
                  <th className="px-2 py-2 text-right">Clicks</th>
                  <th className="px-2 py-2 text-right">CTR</th>
                  <th className="px-2 py-2 text-right">Cost</th>
                  <th className="px-2 py-2 text-right">Conv.</th>
                  <th className="px-5 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-gray-900">{t.term}</div>
                      {isSuggestion(t) && (
                        <Badge tone="blue">Suggest add</Badge>
                      )}
                      {t.addedAsKeyword && <Badge tone="green">Added</Badge>}
                      {t.excluded && <Badge tone="gray">Excluded</Badge>}
                    </td>
                    <td className="px-2 py-2.5 text-gray-500">
                      {t.adGroup.name}
                      <div className="text-xs text-gray-400">{t.adGroup.campaign.name}</div>
                    </td>
                    <td className="px-2 py-2.5 text-gray-500">{t.matchedKeyword ?? "—"}</td>
                    <td className="px-2 py-2.5 text-right">{fmtInt(t.impressions)}</td>
                    <td className="px-2 py-2.5 text-right">{fmtInt(t.clicks)}</td>
                    <td className="px-2 py-2.5 text-right">
                      {fmtPct(t.impressions > 0 ? (t.clicks / t.impressions) * 100 : 0)}
                    </td>
                    <td className="px-2 py-2.5 text-right">{fmtUSD(t.cost, 2)}</td>
                    <td className="px-2 py-2.5 text-right">{fmtInt(t.conversions)}</td>
                    <td className="px-5 py-2.5">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="secondary"
                          disabled={t.addedAsKeyword || t.excluded || busyId === t.id}
                          onClick={() => act(t.id, "addAsKeyword")}
                        >
                          <Plus size={14} /> Add
                        </Button>
                        <Button
                          variant="ghost"
                          disabled={t.addedAsKeyword || t.excluded || busyId === t.id}
                          onClick={() => act(t.id, "exclude")}
                        >
                          <Ban size={14} /> Exclude
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
