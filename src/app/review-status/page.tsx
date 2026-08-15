"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge, Card, EmptyState, PageTitle } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";

type Item = {
  id: string;
  type: string;
  name: string;
  campaign: string;
  adGroup: string | null;
  status: string;
  reason: string | null;
  updatedAt: string;
};

const TYPE_LABEL: Record<string, string> = { ad: "Ad", keyword: "Keyword", extension: "Asset" };
const STATUS_TONE: Record<string, "green" | "yellow" | "red" | "gray"> = {
  Approved: "green",
  "In Review": "yellow",
  Disapproved: "red",
  Limited: "red",
};

export default function ReviewStatusPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/review-status")
      .then((r) => r.json())
      .then((d) => {
        setItems(d.items);
        setLoading(false);
      });
  }, []);

  const filtered = items.filter(
    (i) => (type === "all" || i.type === type) && (status === "all" || i.status === status)
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    items.forEach((i) => (c[i.status] = (c[i.status] ?? 0) + 1));
    return c;
  }, [items]);

  return (
    <div>
      <PageTitle title="Review Status" subtitle="Google Ads review outcomes for ads, keywords, and asset extensions" />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {["all", "ad", "keyword", "extension"].map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              type === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t === "all" ? "All types" : TYPE_LABEL[t]}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-200" />
        {["all", "Approved", "In Review", "Disapproved", "Limited"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              status === s ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s === "all" ? "All statuses" : s} {s !== "all" && counts[s] ? `(${counts[s]})` : ""}
          </button>
        ))}
      </div>

      <Card className="p-0">
        {loading ? (
          <EmptyState>Loading…</EmptyState>
        ) : filtered.length === 0 ? (
          <EmptyState>No matching items</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                  <th className="px-4 py-2">Item</th>
                  <th className="px-2 py-2">Type</th>
                  <th className="px-2 py-2">Campaign / Ad Group</th>
                  <th className="px-2 py-2">Reason</th>
                  <th className="px-2 py-2 text-right">Updated</th>
                  <th className="px-4 py-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((i) => (
                  <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{i.name}</td>
                    <td className="px-2 py-2.5 text-gray-500">{TYPE_LABEL[i.type]}</td>
                    <td className="px-2 py-2.5 text-xs text-gray-500">
                      <div>{i.campaign}</div>
                      {i.adGroup && <div className="text-gray-400">{i.adGroup}</div>}
                    </td>
                    <td className="px-2 py-2.5 text-xs text-gray-400">{i.reason ?? "—"}</td>
                    <td className="px-2 py-2.5 text-right text-xs text-gray-400">
                      {fmtDateTime(i.updatedAt)}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Badge tone={STATUS_TONE[i.status] ?? "gray"}>{i.status}</Badge>
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
