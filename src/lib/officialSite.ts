import { prisma } from "@/lib/prisma";

export const STORE_PRODUCTS = [
  { name: "Tokyo Disney Resort Tickets", price: 68 },
  { name: "Universal Studios Japan (USJ) Tickets", price: 89 },
  { name: "Shibuya Sky Observation Deck Tickets", price: 22 },
  { name: "Osaka Amazing Pass", price: 27 },
  { name: "Japan eSIM", price: 15 },
  { name: "Harry Potter Studio Tour Tickets", price: 75 },
  { name: "Okinawa FunPASS", price: 45 },
  { name: "Skyliner Keisei Railway Tickets", price: 12 },
] as const;

const PAYMENT_METHODS = ["Credit Card", "Line Pay", "ATM Transfer", "Cash on Delivery"];

type OrderInput = {
  orderNumber: string;
  orderDate: Date;
  amount: number;
  status: "Paid" | "Unpaid" | "Refunded" | "Cancelled";
  paymentMethod: string;
  items: { product: string; quantity: number; unitPrice: number }[];
};

export type SyncResult = { source: "live" | "mock"; ordersSynced: number };

// Real integration point: once there's an actual store backend / MCP,
// point OFFICIAL_SITE_API_URL at it. Expected response shape:
//   GET {OFFICIAL_SITE_API_URL}/orders?since=<ISO date>
//   -> { orders: [{ orderNumber, orderDate, amount, status, paymentMethod,
//                    items: [{ product, quantity, unitPrice }] }] }
export async function syncStoreOrders(): Promise<SyncResult> {
  const apiUrl = process.env.OFFICIAL_SITE_API_URL;

  const orders: OrderInput[] = apiUrl
    ? await fetchLiveOrders(apiUrl)
    : generateMockOrders();

  for (const o of orders) {
    await prisma.storeOrder.upsert({
      where: { orderNumber: o.orderNumber },
      create: {
        orderNumber: o.orderNumber,
        orderDate: o.orderDate,
        amount: o.amount,
        status: o.status,
        paymentMethod: o.paymentMethod,
        items: { create: o.items },
      },
      update: {
        orderDate: o.orderDate,
        amount: o.amount,
        status: o.status,
        paymentMethod: o.paymentMethod,
      },
    });
  }

  if ((await prisma.storeInventory.count()) === 0) {
    await prisma.storeInventory.createMany({
      data: STORE_PRODUCTS.map((p) => ({ product: p.name, stock: randInt(0, 200) })),
    });
  }

  return { source: apiUrl ? "live" : "mock", ordersSynced: orders.length };
}

async function fetchLiveOrders(apiUrl: string): Promise<OrderInput[]> {
  const res = await fetch(`${apiUrl}/orders`, {
    headers: process.env.OFFICIAL_SITE_API_KEY
      ? { authorization: `Bearer ${process.env.OFFICIAL_SITE_API_KEY}` }
      : undefined,
  });
  if (!res.ok) throw new Error(`Official site API ${res.status}`);
  const data = await res.json();
  return (data.orders as OrderInput[]).map((o) => ({ ...o, orderDate: new Date(o.orderDate) }));
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}
function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}
function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

// Deterministic-shape mock: spreads orders over the last 10 days so the
// daily reconciliation, hourly distribution, and abandoned-cart (3-6 days
// unpaid) views all have realistic data to show without a live backend.
function generateMockOrders(): OrderInput[] {
  const orders: OrderInput[] = [];
  const now = new Date();

  for (let daysAgo = 0; daysAgo < 10; daysAgo++) {
    const ordersThatDay = randInt(4, 12);
    for (let i = 0; i < ordersThatDay; i++) {
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - daysAgo);
      orderDate.setHours(randInt(0, 23), randInt(0, 59), 0, 0);

      const itemCount = randInt(1, 3);
      const items = Array.from({ length: itemCount }, () => {
        const p = pick(STORE_PRODUCTS);
        return { product: p.name, quantity: randInt(1, 4), unitPrice: p.price };
      });
      const amount = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);

      // Unpaid orders 3-6 days old simulate carts worth recovering; older/newer
      // unpaid orders are rarer since they'd already be recovered or too fresh.
      let status: OrderInput["status"] = "Paid";
      if (daysAgo >= 3 && daysAgo <= 6 && Math.random() < 0.35) status = "Unpaid";
      else if (Math.random() < 0.06) status = "Refunded";
      else if (Math.random() < 0.03) status = "Cancelled";

      orders.push({
        orderNumber: `SO-${orderDate.toISOString().slice(0, 10).replace(/-/g, "")}-${String(i + 1).padStart(3, "0")}`,
        orderDate,
        amount,
        status,
        paymentMethod: pick(PAYMENT_METHODS),
        items,
      });
    }
  }

  return orders;
}
