"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Plus, RefreshCw, Sparkles, X } from "lucide-react";
import { Badge, Button, Card, PageTitle, Select, scoreTone, qsTone, EmptyState } from "@/components/ui";
import { fmtInt } from "@/lib/format";

type Campaign = { id: string; name: string; platform: string };
type AdGroup = { id: string; name: string };
type Intent = "transactional" | "commercial" | "informational" | "navigational";
type Keyword = {
  id: string;
  text: string;
  qualityScore: number | null;
  estCtr: string | null;
  adRelevance: string | null;
  landingPageExp: string | null;
  status: string;
  matchType: string;
  intent: Intent | null;
};
type Candidate = {
  keyword: string;
  intent: Intent;
  source: "claude" | "serp_autocomplete" | "serp_related" | "serp_paa";
  notes: string;
};

const INTENT_META: Record<Intent, { emoji: string; label: string; tone: "green" | "yellow" | "blue" | "gray" }> = {
  transactional: { emoji: "🟢", label: "Transactional", tone: "green" },
  commercial: { emoji: "🟡", label: "Commercial", tone: "yellow" },
  informational: { emoji: "🔵", label: "Informational", tone: "blue" },
  navigational: { emoji: "⚪", label: "Navigational", tone: "gray" },
};
const INTENT_ORDER: Intent[] = ["transactional", "commercial", "informational", "navigational"];
const SOURCE_LABEL: Record<Candidate["source"], string> = {
  claude: "Claude",
  serp_autocomplete: "Google Autocomplete",
  serp_related: "Google Related Searches",
  serp_paa: "People Also Ask",
};

export default function KeywordQualityPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [adGroupId, setAdGroupId] = useState("");
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [adding, setAdding] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [genMeta, setGenMeta] = useState<{ usedRealApi: boolean; usedSerp: boolean } | null>(null);

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => {
        const searchCampaigns = (d.campaigns as Campaign[]).filter((c) => c.platform === "google_ads");
        setCampaigns(searchCampaigns);
        if (searchCampaigns[0]) setCampaignId(searchCampaigns[0].id);
      });
  }, []);

  useEffect(() => {
    if (!campaignId) return;
    setAdGroupId("");
    setKeywords([]);
    setCandidates(null);
    fetch(`/api/ad-groups?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((d) => setAdGroups(d.adGroups));
  }, [campaignId]);

  async function loadKeywords() {
    if (!adGroupId) return;
    setLoading(true);
    const res = await fetch(`/api/keywords?adGroupId=${adGroupId}`);
    const d = await res.json();
    setKeywords(d.keywords);
    setLoading(false);
  }

  useEffect(() => {
    setCandidates(null);
    if (adGroupId) loadKeywords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adGroupId]);

  async function generateKeywords() {
    if (!adGroupId) return;
    setGenerating(true);
    setCandidates(null);
    const res = await fetch("/api/keywords/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adGroupId }),
    });
    const d = await res.json();
    setCandidates(d.candidates);
    setGenMeta({ usedRealApi: d.usedRealApi, usedSerp: d.usedSerp });
    setSelected(
      new Set(
        (d.candidates as Candidate[])
          .filter((c) => c.intent === "transactional" || c.intent === "commercial")
          .map((c) => c.keyword)
      )
    );
    setGenerating(false);
  }

  function toggleCandidate(keyword: string) {
    const next = new Set(selected);
    if (next.has(keyword)) next.delete(keyword);
    else next.add(keyword);
    setSelected(next);
  }

  function toggleGroup(intent: Intent, group: Candidate[]) {
    const allSelected = group.every((c) => selected.has(c.keyword));
    const next = new Set(selected);
    group.forEach((c) => (allSelected ? next.delete(c.keyword) : next.add(c.keyword)));
    setSelected(next);
  }

  async function addSelected() {
    if (!adGroupId || !candidates) return;
    const chosen = candidates.filter((c) => selected.has(c.keyword));
    if (chosen.length === 0) return;
    setAdding(true);
    await fetch("/api/keywords/add", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ adGroupId, keywords: chosen }),
    });
    setCandidates(null);
    await loadKeywords();
    setAdding(false);
  }

  function exportCsv() {
    const header = ["Keyword", "QS", "Est. CTR", "Ad Relevance", "Landing Page", "Intent", "Status"];
    const rows = keywords.map((k) => [
      k.text,
      k.qualityScore ?? "-",
      k.estCtr ?? "-",
      k.adRelevance ?? "-",
      k.landingPageExp ?? "-",
      k.intent ?? "-",
      k.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "keyword-quality.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeCount = keywords.filter((k) => k.status === "Active").length;

  const groupedCandidates = useMemo(() => {
    if (!candidates) return null;
    return INTENT_ORDER.map((intent) => ({
      intent,
      items: candidates.filter((c) => c.intent === intent),
    })).filter((g) => g.items.length > 0);
  }, [candidates]);

  return (
    <div>
      <PageTitle title="Keyword Quality" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="">— All Search campaigns —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select value={adGroupId} onChange={(e) => setAdGroupId(e.target.value)}>
          <option value="">— Select ad group —</option>
          {adGroups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" onClick={loadKeywords}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button variant="ghost" onClick={exportCsv} disabled={keywords.length === 0}>
            <Download size={14} /> Export CSV
          </Button>
          <Button onClick={generateKeywords} disabled={!adGroupId || generating}>
            <Sparkles size={14} /> {generating ? "Generating…" : "AI Generate Keywords"}
          </Button>
        </div>
      </div>

      {generating && (
        <Card className="mb-4">
          <EmptyState>Claude is brainstorming keywords and pulling in Google search data…</EmptyState>
        </Card>
      )}

      {groupedCandidates && groupedCandidates.length > 0 && (
        <Card className="mb-4">
          <div className="mb-3 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800">
                Suggested keywords ({candidates?.length}, {selected.size} selected)
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                {genMeta?.usedRealApi ? "Generated live by Claude" : "ANTHROPIC_API_KEY not set — showing sample data"}
                {genMeta?.usedSerp ? " · Enriched with SerpAPI" : " · SERPAPI_KEY not set, skipping Google search enrichment"}
                {" · "}Select keywords and click &quot;Add selected&quot; to actually write them to the ad group
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => setCandidates(null)}>
                <X size={14} /> Cancel
              </Button>
              <Button onClick={addSelected} disabled={selected.size === 0 || adding}>
                <Plus size={14} /> {adding ? "Adding…" : `Add selected keywords (${selected.size})`}
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {groupedCandidates.map(({ intent, items }) => {
              const meta = INTENT_META[intent];
              const allSelected = items.every((c) => selected.has(c.keyword));
              return (
                <div key={intent} className="rounded-lg border border-gray-100">
                  <button
                    onClick={() => toggleGroup(intent, items)}
                    className="flex w-full items-center justify-between rounded-t-lg bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    <span>
                      {meta.emoji} {meta.label} ({items.length})
                    </span>
                    <span className="font-normal text-blue-600">{allSelected ? "Deselect all" : "Select all"}</span>
                  </button>
                  <div className="divide-y divide-gray-50">
                    {items.map((c) => (
                      <label
                        key={c.keyword}
                        className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected.has(c.keyword)}
                          onChange={() => toggleCandidate(c.keyword)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-gray-900">{c.keyword}</span>
                            <Badge tone="gray">{SOURCE_LABEL[c.source]}</Badge>
                          </div>
                          {c.notes && <p className="mt-0.5 text-xs text-gray-400">{c.notes}</p>}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card className="p-0">
        {!adGroupId ? (
          <EmptyState>Select an ad group and click &quot;Refresh&quot;</EmptyState>
        ) : loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : keywords.length === 0 ? (
          <EmptyState>No keywords in this group yet — try &quot;AI Generate Keywords&quot;</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="w-8 px-4 py-2">
                    <input type="checkbox" />
                  </th>
                  <th className="px-2 py-2">Keyword</th>
                  <th className="px-2 py-2 text-center">QS ↑</th>
                  <th className="px-2 py-2 text-center">Est. CTR</th>
                  <th className="px-2 py-2 text-center">Ad Relevance</th>
                  <th className="px-2 py-2 text-center">Landing Page</th>
                  <th className="px-2 py-2 text-center">Intent</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((k) => {
                  const paused = k.status !== "Active";
                  return (
                    <tr
                      key={k.id}
                      className={`border-b border-gray-50 ${paused ? "text-gray-400" : ""} hover:bg-gray-50`}
                    >
                      <td className="px-4 py-2.5">
                        <input type="checkbox" />
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="font-medium">{k.text}</div>
                        <div className="text-xs text-gray-400">{k.matchType}</div>
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {k.qualityScore != null ? (
                          <Badge tone={qsTone(k.qualityScore)}>{k.qualityScore}</Badge>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {k.estCtr ? <Badge tone={scoreTone(k.estCtr)}>{k.estCtr}</Badge> : "—"}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {k.adRelevance ? (
                          <Badge tone={scoreTone(k.adRelevance)}>{k.adRelevance}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {k.landingPageExp ? (
                          <Badge tone={scoreTone(k.landingPageExp)}>{k.landingPageExp}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-2 py-2.5 text-center">
                        {k.intent ? (
                          <Badge tone={INTENT_META[k.intent].tone}>{INTENT_META[k.intent].emoji}</Badge>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge tone={paused ? "gray" : "green"}>{k.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-400">
              <span>
                {keywords.length} keywords · {fmtInt(activeCount)} active
              </span>
              <span>Search campaigns only · DSA campaigns excluded · QS updates every 24h</span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
