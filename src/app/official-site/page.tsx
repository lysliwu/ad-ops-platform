"use client";

import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { RefreshCw, Mail, AlertTriangle } from "lucide-react";
import { Badge, Button, Card, KpiCard, PageTitle, EmptyState } from "@/components/ui";
import { fmtInt, fmtUSD, fmtDateTime } from "@/lib/format";

type Order = {
  id: string;
  orderNumber: string;
  orderDate: string;
  amount: number;
  status: string;
  paymentMethod: string;
};
type AbandonedOrder = Order & { recoverySent: boolean; items: { product: string; quantity: number }[] };
type ProductSales = { product: string; quantity: number; revenue: number; orders: number };
type Summary = {
  day: "today" | "yesterday";
  totals: { revenue: number; paidCount: number; unpaidCount: number; refundedCount: number; cancelledCount: number };
  hourly: { hour: string; orders: number }[];
  productSales: ProductSales[];
  orders: Order[];
};
type Inventory = { id: string; product: string; stock: number };

const STATUS_TONE: Record<string, "green" | "yellow" | "red" | "gray"> = {
  Paid: "green",
  Unpaid: "yellow",
  Refunded: "red",
  Cancelled: "gray",
};

export default function OfficialSitePage() {
  const [day, setDay] = useState<"today" | "yesterday">("yesterday");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [abandoned, setAbandoned] = useState<AbandonedOrder[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function loadSummary(d: "today" | "yesterday") {
    const res = await fetch(`/api/store/summary?day=${d}`);
    setSummary(await res.json());
  }
  async function loadAbandoned() {
    const res = await fetch("/api/store/abandoned");
    const d = await res.json();
    setAbandoned(d.orders);
  }
  async function loadInventory() {
    const res = await fetch("/api/store/inventory");
    const d = await res.json();
    setInventory(d.inventory);
  }

  useEffect(() => {
    loadSummary(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  useEffect(() => {
    loadAbandoned();
    loadInventory();
  }, []);

  async function sync() {
    setSyncing(true);
    setSyncMsg(null);
    const res = await fetch("/api/store/sync", { method: "POST" });
    const d = await res.json();
    setSyncMsg(`Synced ${d.ordersSynced} orders from ${d.source === "live" ? "official site API" : "mock data"}`);
    await Promise.all([loadSummary(day), loadAbandoned(), loadInventory()]);
    setSyncing(false);
  }

  async function markRecoverySent(id: string) {
    setAbandoned((prev) => prev.map((o) => (o.id === id ? { ...o, recoverySent: true } : o)));
    await fetch("/api/store/abandoned", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  return (
    <div>
      <PageTitle
        title="Official Site"
        subtitle="Daily reconciliation, product sales, order-time distribution, cart recovery, and inventory"
        actions={
          <Button onClick={sync} disabled={syncing}>
            <RefreshCw size={14} /> {syncing ? "Syncing…" : "Sync Orders"}
          </Button>
        }
      />
      {syncMsg && <div className="mb-3 text-xs text-gray-400">{syncMsg}</div>}

      {/* Daily reconciliation */}
      <div className="mb-3 flex items-center gap-2">
        {(["yesterday", "today"] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              day === d ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      {!summary ? (
        <EmptyState>Loading…</EmptyState>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <KpiCard label="Revenue (paid)" value={fmtUSD(summary.totals.revenue, 0)} />
            <KpiCard label="Paid orders" value={fmtInt(summary.totals.paidCount)} valueClassName="text-green-600" />
            <KpiCard label="Unpaid orders" value={fmtInt(summary.totals.unpaidCount)} valueClassName="text-yellow-600" />
            <KpiCard
              label="Refunded / Cancelled"
              value={`${fmtInt(summary.totals.refundedCount)} / ${fmtInt(summary.totals.cancelledCount)}`}
              valueClassName="text-red-600"
            />
          </div>

          <Card className="mb-4 p-0">
            <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
              Orders — {day}
            </div>
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="px-5 py-2">Order #</th>
                    <th className="px-2 py-2">Time</th>
                    <th className="px-2 py-2 text-right">Amount</th>
                    <th className="px-2 py-2">Payment</th>
                    <th className="px-5 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.orders.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                        No orders for {day}
                      </td>
                    </tr>
                  )}
                  {summary.orders.map((o) => (
                    <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-5 py-2 font-medium text-gray-900">{o.orderNumber}</td>
                      <td className="px-2 py-2 text-gray-500">{fmtDateTime(o.orderDate)}</td>
                      <td className="px-2 py-2 text-right">{fmtUSD(o.amount, 0)}</td>
                      <td className="px-2 py-2 text-gray-500">{o.paymentMethod}</td>
                      <td className="px-5 py-2 text-right">
                        <Badge tone={STATUS_TONE[o.status] ?? "gray"}>{o.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <div className="mb-3 text-sm font-semibold text-gray-800">Product sales analysis</div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
                    <th className="py-2">Product</th>
                    <th className="py-2 text-right">Qty</th>
                    <th className="py-2 text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.productSales.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-sm text-gray-400">
                        No sales for {day}
                      </td>
                    </tr>
                  )}
                  {summary.productSales.map((p) => (
                    <tr key={p.product} className="border-b border-gray-50">
                      <td className="py-2 text-gray-900">{p.product}</td>
                      <td className="py-2 text-right">{fmtInt(p.quantity)}</td>
                      <td className="py-2 text-right">{fmtUSD(p.revenue, 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <Card>
              <div className="mb-3 text-sm font-semibold text-gray-800">Order-time distribution</div>
              <div className="h-64 w-full">
                <ResponsiveContainer>
                  <BarChart data={summary.hourly} margin={{ left: 0, right: 8, top: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#888" }} interval={2} />
                    <YAxis tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="orders" name="Orders" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* Abandoned cart recovery */}
      <Card className="mb-4 p-0">
        <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
          Abandoned cart recovery <span className="font-normal text-gray-400">(unpaid, 3–6 days old)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-5 py-2">Order #</th>
              <th className="px-2 py-2">Placed</th>
              <th className="px-2 py-2">Items</th>
              <th className="px-2 py-2 text-right">Amount</th>
              <th className="px-5 py-2 text-right">Recovery</th>
            </tr>
          </thead>
          <tbody>
            {abandoned.length === 0 && (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
                  No abandoned carts in the recovery window
                </td>
              </tr>
            )}
            {abandoned.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-2 font-medium text-gray-900">{o.orderNumber}</td>
                <td className="px-2 py-2 text-gray-500">{fmtDateTime(o.orderDate)}</td>
                <td className="px-2 py-2 text-gray-500">
                  {o.items.map((it) => `${it.product} ×${it.quantity}`).join(", ")}
                </td>
                <td className="px-2 py-2 text-right">{fmtUSD(o.amount, 0)}</td>
                <td className="px-5 py-2 text-right">
                  {o.recoverySent ? (
                    <Badge tone="green">Sent</Badge>
                  ) : (
                    <Button variant="secondary" onClick={() => markRecoverySent(o.id)}>
                      <Mail size={14} /> Mark Sent
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Inventory */}
      <Card className="p-0">
        <div className="border-b border-gray-100 px-5 py-3 text-sm font-semibold text-gray-800">
          Inventory <span className="font-normal text-gray-400">(check stock before launching ads)</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs text-gray-500">
              <th className="px-5 py-2">Product</th>
              <th className="px-5 py-2 text-right">Stock</th>
            </tr>
          </thead>
          <tbody>
            {inventory.length === 0 && (
              <tr>
                <td colSpan={2} className="py-8 text-center text-sm text-gray-400">
                  No inventory data — click &quot;Sync Orders&quot; to initialize
                </td>
              </tr>
            )}
            {inventory.map((i) => (
              <tr key={i.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-2 text-gray-900">{i.product}</td>
                <td className="px-5 py-2 text-right">
                  <span className={i.stock < 10 ? "font-medium text-red-600" : "text-gray-700"}>{fmtInt(i.stock)}</span>
                  {i.stock < 10 && (
                    <Badge tone="red">
                      <AlertTriangle size={12} className="mr-1 inline" />
                      Low
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
