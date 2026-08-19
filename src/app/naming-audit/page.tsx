"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Badge, Button, Card, PageTitle, Select, Input, EmptyState } from "@/components/ui";

type AdGroup = {
  id: string;
  name: string;
  campaign: { id: string; name: string; platform: string };
  timeWindow: string | null;
  audienceTemp: string | null;
  audienceDef: string | null;
  exclusion: string | null;
  productTag: string | null;
};

const AUDIENCE_TEMP_OPTIONS = ["New", "Returning", "Hot (viewed, no purchase)"];
const EXCLUSION_OPTIONS = ["Exclude 30d purchasers", "Exclude warm-pool (6-pack)", "No exclusion"];

const REQUIRED_FIELDS = ["timeWindow", "audienceTemp", "audienceDef", "exclusion", "productTag"] as const;
const FIELD_LABELS: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  timeWindow: "Time",
  audienceTemp: "Temp",
  audienceDef: "Audience",
  exclusion: "Exclusion",
  productTag: "Product",
};

function missingFields(ag: AdGroup) {
  return REQUIRED_FIELDS.filter((f) => !ag[f]);
}

function suggestedName(ag: AdGroup) {
  return REQUIRED_FIELDS.map((f) => ag[f]).join("_");
}

export default function NamingAuditPage() {
  const [adGroups, setAdGroups] = useState<AdGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/naming-audit");
    const d = await res.json();
    setAdGroups(d.adGroups);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const total = adGroups.length;
    const incomplete = adGroups.filter((ag) => missingFields(ag).length > 0).length;
    return { total, incomplete, complete: total - incomplete };
  }, [adGroups]);

  const visible = onlyIncomplete ? adGroups.filter((ag) => missingFields(ag).length > 0) : adGroups;

  async function patch(id: string, data: Partial<AdGroup>) {
    setAdGroups((prev) => prev.map((ag) => (ag.id === id ? { ...ag, ...data } : ag)));
    setSavingId(id);
    await fetch("/api/naming-audit", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, ...data }),
    });
    setSavingId(null);
  }

  async function applySuggestedName(ag: AdGroup) {
    const name = suggestedName(ag);
    await patch(ag.id, { name });
  }

  return (
    <div>
      <PageTitle
        title="Naming Audit"
        subtitle="Audit every ad group against the [Time] [Temp] [Audience] [Exclusion] [Product] naming convention — surfaces incomplete or mismatched names"
      />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-xs text-gray-500">Total ad groups</div>
          <div className="mt-1 text-2xl font-semibold text-gray-900">{stats.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">Complete</div>
          <div className="mt-1 text-2xl font-semibold text-green-600">{stats.complete}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-gray-500">Needs fixes</div>
          <div className="mt-1 text-2xl font-semibold text-yellow-600">{stats.incomplete}</div>
        </Card>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
          />
          Show incomplete only
        </label>
        <span className="text-xs text-gray-400">Edits autosave</span>
      </div>

      <Card>
        {loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : visible.length === 0 ? (
          <EmptyState>No ad groups match</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs text-gray-500">
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Campaign</th>
                  <th className="py-2 pr-3">Current Name</th>
                  <th className="py-2 pr-3">Time</th>
                  <th className="py-2 pr-3">Temp</th>
                  <th className="py-2 pr-3">Audience</th>
                  <th className="py-2 pr-3">Exclusion</th>
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Suggested Name</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((ag) => {
                  const missing = missingFields(ag);
                  const complete = missing.length === 0;
                  return (
                    <tr key={ag.id} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-3">
                        {complete ? (
                          <Badge tone="green">
                            <CheckCircle2 size={12} className="mr-1 inline" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge tone="yellow">
                            <AlertTriangle size={12} className="mr-1 inline" />
                            Missing {missing.map((f) => FIELD_LABELS[f]).join(", ")}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-gray-500">
                        {ag.campaign.name}
                        <div className="text-xs text-gray-400">{ag.campaign.platform}</div>
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          className="w-40"
                          value={ag.name}
                          onChange={(e) => setAdGroups((prev) => prev.map((x) => (x.id === ag.id ? { ...x, name: e.target.value } : x)))}
                          onBlur={(e) => patch(ag.id, { name: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          className="w-24"
                          placeholder="17-24"
                          value={ag.timeWindow ?? ""}
                          onChange={(e) => setAdGroups((prev) => prev.map((x) => (x.id === ag.id ? { ...x, timeWindow: e.target.value } : x)))}
                          onBlur={(e) => patch(ag.id, { timeWindow: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Select
                          className="w-28"
                          value={ag.audienceTemp ?? ""}
                          onChange={(e) => patch(ag.id, { audienceTemp: e.target.value })}
                        >
                          <option value="">—</option>
                          {AUDIENCE_TEMP_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          className="w-32"
                          placeholder="LL1% purchasers"
                          value={ag.audienceDef ?? ""}
                          onChange={(e) => setAdGroups((prev) => prev.map((x) => (x.id === ag.id ? { ...x, audienceDef: e.target.value } : x)))}
                          onBlur={(e) => patch(ag.id, { audienceDef: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Select
                          className="w-28"
                          value={ag.exclusion ?? ""}
                          onChange={(e) => patch(ag.id, { exclusion: e.target.value })}
                        >
                          <option value="">—</option>
                          {EXCLUSION_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          className="w-32"
                          placeholder="Chicken Leg"
                          value={ag.productTag ?? ""}
                          onChange={(e) => setAdGroups((prev) => prev.map((x) => (x.id === ag.id ? { ...x, productTag: e.target.value } : x)))}
                          onBlur={(e) => patch(ag.id, { productTag: e.target.value })}
                        />
                      </td>
                      <td className="py-2 pr-3 text-xs text-gray-400">{complete ? suggestedName(ag) : "—"}</td>
                      <td className="py-2 pr-3">
                        <Button
                          variant="secondary"
                          disabled={!complete || savingId === ag.id}
                          onClick={() => applySuggestedName(ag)}
                        >
                          Apply Name
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
