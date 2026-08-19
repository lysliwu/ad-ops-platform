# Ad Ops Platform

Multi-platform 廣告投放管理儀表板 — Campaign / Ad Group 命名盤點、成效總覽、關鍵字規劃與品質、搜尋字詞報告、官網訂單與庫存、圖片素材、Sitelinks、審核狀態、Token 用量等頁面。

目前所有外部串接（Google Ads、官網後台等）在沒有設定對應 env var 時，會自動 fallback 成 deterministic mock data，UI 邏輯不受影響；串上真資料時不需要改頁面程式碼。細節見 [`docs/ROADMAP.md`](docs/ROADMAP.md)。

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + SQLite（本地開發用；正式環境需換成 hosted DB，見下方「部署」）
- Anthropic API（AI 生成關鍵字 / Sitelinks，選用）
- SerpApi（關鍵字建議，選用）

## 本地開發

```bash
npm install
cp .env.example .env   # 沒有的欄位可先留空，會 fallback 成 mock 資料
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
2. 在 Project Settings → Environment Variables 設定上表中的變數。
3. **資料庫**：這個專案目前用本地 SQLite 檔案（`prisma/schema.prisma` 的 `datasource` 是 `sqlite`，`DATABASE_URL` 預設指到 `file:./dev.db`）。Vercel 的 serverless function 檔案系統是唯讀（`/tmp` 雖可寫但不會在多次呼叫間保留），**直接部署會導致寫入資料在下一次請求就消失**。正式上線前需要：
   - 把 `prisma/schema.prisma` 的 `provider` 換成 `postgresql`（或其他 hosted DB），
   - 申請一個 hosted Postgres（例如 Prisma Postgres：`npx create-db`、或 Neon / Supabase），
   - 把新的連線字串設進 Vercel 的 `DATABASE_URL`，
   - `npx prisma migrate deploy` 建表。
4. Build command 用預設的 `next build` 即可（`package.json` 已內建）。
5. Push 到 `main` 後 Vercel 會自動部署。

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
