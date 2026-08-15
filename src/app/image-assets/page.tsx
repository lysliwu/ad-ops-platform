"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Upload } from "lucide-react";
import { Badge, Button, Card, EmptyState, PageTitle, Select } from "@/components/ui";

type Asset = {
  id: string;
  fileName: string;
  tags: string;
  campaign: string | null;
  width: number | null;
  height: number | null;
  sizeKb: number | null;
};

function hashHue(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export default function ImageAssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tag, setTag] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/image-assets")
      .then((r) => r.json())
      .then((d) => {
        setAssets(d.assets);
        setLoading(false);
      });
  }, []);

  const tags = useMemo(() => {
    const set = new Set<string>();
    assets.forEach((a) => a.tags.split(",").forEach((t) => set.add(t.trim())));
    return Array.from(set);
  }, [assets]);

  const filtered = tag === "all" ? assets : assets.filter((a) => a.tags.includes(tag));

  return (
    <div>
      <PageTitle
        title="Image Assets"
        subtitle="Centralized creative library across campaigns — AI-sourced images land here too"
        actions={
          <Button disabled title="Uploads aren't supported in this prototype yet">
            <Upload size={14} /> Upload Image
          </Button>
        }
      />

      <div className="mb-4 flex items-center gap-2">
        <Select value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="all">All tags ({assets.length})</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <EmptyState>Loading…</EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState>No matching image assets</EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {filtered.map((a) => {
            const hue = hashHue(a.fileName);
            return (
              <Card key={a.id} className="overflow-hidden p-0">
                <div
                  className="flex aspect-square items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, hsl(${hue} 70% 88%), hsl(${(hue + 40) % 360} 70% 78%))`,
                  }}
                >
                  <ImageIcon className="opacity-40" size={28} style={{ color: `hsl(${hue} 40% 30%)` }} />
                </div>
                <div className="p-2.5">
                  <div className="truncate text-xs font-medium text-gray-800">{a.fileName}</div>
                  <div className="mt-1 truncate text-[11px] text-gray-400">{a.campaign}</div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-gray-400">
                    <span>
                      {a.width}×{a.height}
                    </span>
                    <span>{a.sizeKb} KB</span>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {a.tags.split(",").map((t) => (
                      <Badge key={t} tone="gray">
                        {t.trim()}
                      </Badge>
                    ))}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
