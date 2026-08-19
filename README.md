# Ad Ops Platform

Multi-platform 廣告投放管理儀表板 — Campaign / Ad Group 命名盤點、成效總覽、關鍵字規劃與品質、搜尋字詞報告、官網訂單與庫存、圖片素材、Sitelinks、審核狀態、Token 用量等頁面。

目前所有外部串接（Google Ads、官網後台等）在沒有設定對應 env var 時，會自動 fallback 成 deterministic mock data，UI 邏輯不受影響；串上真資料時不需要改頁面程式碼。細節見 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- Anthropic API（AI 生成關鍵字 / Sitelinks，選用）
- SerpApi（關鍵字建議，選用）

## 本地開發

```bash
npm install
cp .env.example .env
# DATABASE_URL 需要一個真的 Postgres 連線字串，例如 npx create-db 免費建一個 hosted Postgres
npx prisma db push
npm run db:seed
npm run dev
```

開 [http://localhost:3000](http://localhost:3000)。

## 環境變數

見 [`.env.example`](.env.example)。除了 `DATABASE_URL`，其他都是選用 — 沒設定時對應功能會用 mock 資料，UI 照常運作：

| 變數 | 用途 | 不設定時 |
|---|---|---|
| `DATABASE_URL` | Prisma 資料庫連線字串 | 必填 |
| `ANTHROPIC_API_KEY` | AI 生成關鍵字 / Sitelinks | fallback 成範例資料 |
| `SERPAPI_KEY` | Google 自動完成 / 相關搜尋 / PAA | 關鍵字建議只走 Claude |
| `OFFICIAL_SITE_API_URL` / `OFFICIAL_SITE_API_KEY` | 官網訂單/庫存真實後端 | 用 deterministic mock 資料 |
| `GOOGLE_ADS_DEVELOPER_TOKEN` | Google Ads 真實同步 | 用 mock 同步（設定但未實作真連線會刻意噴錯，避免誤以為已串上真資料） |

## 部署（Vercel）

1. 到 [vercel.com/new](https://vercel.com/new) 匯入這個 repo。
2. 在 Project Settings → Environment Variables 設定上表中的變數，`DATABASE_URL` 指向你的正式 Postgres（開發用的 `npx create-db` 資料庫是 24 小時內會過期的臨時庫，記得到它的 claim URL 領取才會變永久，正式環境建議另外開一個）。
3. Build command 用預設的 `next build` 即可（`package.json` 已內建）；`npx prisma db push` 或 `npx prisma migrate deploy` 需要先對正式資料庫跑過一次建表。
4. Push 到 `main` 後 Vercel 會自動部署。

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
