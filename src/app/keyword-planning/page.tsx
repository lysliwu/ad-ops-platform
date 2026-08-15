"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, PageTitle } from "@/components/ui";
import { fmtInt, fmtUSD } from "@/lib/format";

type Idea = {
  id: string;
  seedTerm: string;
  suggestion: string;
  avgMonthlySearch: number;
  competition: string;
  suggestedBid: number;
};

const COMP_TONE: Record<string, "green" | "yellow" | "red"> = { Low: "green", Medium: "yellow", High: "red" };

export default function KeywordPlanningPage() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [seed, setSeed] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/keyword-planning");
    const d = await res.json();
    setIdeas(d.ideas);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function generate() {
    if (!seed.trim()) return;
    setGenerating(true);
    await fetch("/api/keyword-planning/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ seedTerm: seed.trim() }),
    });
    setSeed("");
    await load();
    setGenerating(false);
  }

  const grouped = useMemo(() => {
    return ideas.reduce<Record<string, Idea[]>>((acc, i) => {
      (acc[i.seedTerm] ??= []).push(i);
      return acc;
    }, {});
  }, [ideas]);

  return (
    <div>
      <PageTitle title="Keyword Planning" subtitle="Enter a seed term — AI suggests related long-tail keywords, search volume, and bid ideas" />

      <div className="mb-4 flex items-center gap-2">
        <Input
          placeholder="Enter a seed term, e.g. Osaka Amazing Pass"
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate()}
          className="w-72"
        />
        <Button onClick={generate} disabled={!seed.trim() || generating}>
          <Sparkles size={14} /> {generating ? "Generating…" : "Generate keyword ideas"}
        </Button>
      </div>

      {loading ? (
        <EmptyState>Loading…</EmptyState>
      ) : Object.keys(grouped).length === 0 ? (
        <EmptyState>Enter a seed term to start planning keywords</EmptyState>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([seedTerm, list]) => (
            <Card key={seedTerm} className="p-0">
              <div className="border-b border-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800">
                {seedTerm}
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500">
                    <th className="px-4 py-2">Suggested keyword</th>
                    <th className="px-2 py-2 text-right">Avg. monthly searches</th>
                    <th className="px-2 py-2 text-center">Competition</th>
                    <th className="px-4 py-2 text-right">Suggested bid</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((i) => (
                    <tr key={i.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800">{i.suggestion}</td>
                      <td className="px-2 py-2 text-right">{fmtInt(i.avgMonthlySearch)}</td>
                      <td className="px-2 py-2 text-center">
                        <Badge tone={COMP_TONE[i.competition] ?? "gray"}>{i.competition}</Badge>
                      </td>
                      <td className="px-4 py-2 text-right">{fmtUSD(i.suggestedBid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
