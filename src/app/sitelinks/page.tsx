"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Sparkles, Trash2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge, Button, Card, PageTitle, Select, EmptyState } from "@/components/ui";

type Campaign = { id: string; name: string; platform: string };
type Sitelink = {
  id: string;
  title: string;
  description: string;
  url: string;
  active: boolean;
  sortOrder: number;
};

function SitelinkCard({ sl, onToggle, onDelete }: { sl: Sitelink; onToggle: () => void; onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sl.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab rounded-lg border border-gray-200 bg-white p-3 active:cursor-grabbing"
    >
      <div className="mb-1 flex items-start justify-between gap-2">
        <div className="text-sm font-medium text-gray-900">{sl.title}</div>
        <Badge tone={sl.active ? "green" : "gray"}>{sl.active ? "Active" : "Inactive"}</Badge>
      </div>
      <p className="mb-2 text-xs text-gray-500">{sl.description}</p>
      <div className="mb-2 truncate text-xs text-blue-500">{sl.url}</div>
      <div className="flex gap-2" onPointerDown={(e) => e.stopPropagation()}>
        <button
          onClick={onToggle}
          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          title={sl.active ? "Deactivate" : "Activate"}
        >
          <ExternalLink size={14} />
        </button>
        <button
          onClick={onDelete}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

export default function SitelinksPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [sitelinks, setSitelinks] = useState<Sitelink[]>([]);
  const [generating, setGenerating] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  useEffect(() => {
    fetch("/api/campaigns")
      .then((r) => r.json())
      .then((d) => setCampaigns((d.campaigns as Campaign[]).filter((c) => c.platform === "google_ads")));
  }, []);

  async function load(id: string) {
    if (!id) {
      setSitelinks([]);
      return;
    }
    const res = await fetch(`/api/sitelinks?campaignId=${id}`);
    const d = await res.json();
    setSitelinks(d.sitelinks);
  }

  useEffect(() => {
    load(campaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function generate() {
    if (!campaignId) return;
    setGenerating(true);
    await fetch("/api/sitelinks/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    await load(campaignId);
    setGenerating(false);
  }

  async function toggle(sl: Sitelink) {
    setSitelinks((prev) => prev.map((s) => (s.id === sl.id ? { ...s, active: !s.active } : s)));
    await fetch("/api/sitelinks", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: sl.id, active: !sl.active }),
    });
  }

  async function remove(id: string) {
    setSitelinks((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/sitelinks?id=${id}`, { method: "DELETE" });
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = sitelinks.findIndex((s) => s.id === active.id);
    const newIndex = sitelinks.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(sitelinks, oldIndex, newIndex);
    setSitelinks(reordered);
    await fetch("/api/sitelinks/reorder", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ids: reordered.map((s) => s.id) }),
    });
  }

  return (
    <div>
      <PageTitle title="Sitelinks" />

      <div className="mb-4 flex items-center justify-between">
        <Select value={campaignId} onChange={(e) => setCampaignId(e.target.value)}>
          <option value="">— Select a campaign —</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button onClick={generate} disabled={!campaignId || generating}>
          <Sparkles size={14} /> {generating ? "Generating…" : "AI Generate Sitelinks"}
        </Button>
      </div>

      <Card>
        {!campaignId ? (
          <EmptyState>Select a campaign, then click &quot;AI Generate Sitelinks&quot; to auto-analyze group themes</EmptyState>
        ) : sitelinks.length === 0 ? (
          <EmptyState>No sitelinks yet — click &quot;AI Generate Sitelinks&quot; to get started</EmptyState>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm text-gray-500">Existing sitelinks ({sitelinks.length})</span>
              <span className="text-xs text-gray-400">Drag cards to reorder</span>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sitelinks.map((s) => s.id)} strategy={rectSortingStrategy}>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {sitelinks.map((sl) => (
                    <SitelinkCard
                      key={sl.id}
                      sl={sl}
                      onToggle={() => toggle(sl)}
                      onDelete={() => remove(sl.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </>
        )}
      </Card>
    </div>
  );
}
