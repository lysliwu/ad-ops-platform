# Ad Ops Platform — Roadmap

追蹤 ad-dashboard 的建置進度，尤其是每個外部串接還缺什麼才能從 mock 換成真資料。所有串接都遵循同一套 pattern（見 `src/lib/ai.ts`）：相關 env var 沒設定時自動 fallback 成 deterministic mock，UI 邏輯不受影響；設定好之後直接切換成真實 API，不需要改頁面程式碼。

## 已完成

| # | 項目 | 說明 | 主要檔案 |
|---|------|------|----------|
| 1 | Naming Audit | 【時間】【溫層】【受眾定義】【排除】【商品】命名盤點，行內編輯 + 一鍵套用建議名稱 | `src/app/naming-audit/`, `AdGroup` schema 新欄位 |
| 2 | Official Site（假資料） | 每日對帳、商品銷售分析、下單時段分佈、棄單挽回（未付款 3–6 天）、庫存查詢 | `src/lib/officialSite.ts`, `src/app/official-site/`, `src/app/api/store/*` |
| 3 | Google Ads Sync（假資料） | 每日成效同步、關鍵字指標同步、搜尋字詞報告（可一鍵加為關鍵字/排除）、帳戶診斷（serving_status） | `src/lib/googleAds.ts`, `src/app/search-terms/`, `src/app/api/google-ads/sync/` |

## 待辦 — 依串接優先順序

### A. 換成真實資料源（架構都已就緒，只差憑證）

- **Official Site API** — 官網訂單/庫存的真實後端
  - 需要：`OFFICIAL_SITE_API_URL`、`OFFICIAL_SITE_API_KEY`（見 `.env.example`）
  - 預期格式：`GET {OFFICIAL_SITE_API_URL}/orders?since=<ISO date>`，回傳 `{ orders: [...] }`
  - 目前狀態：先確認你的官網/後台系統是 Shopify、自建後端還是其他，再決定要不要調整這個介面形狀

- **Google Ads API** — 目前 `syncGoogleAds()` 是純 mock，設了 `GOOGLE_ADS_DEVELOPER_TOKEN` 會直接丟錯（刻意設計，避免誤以為已經串上真資料）
  - 需要：Developer Token、OAuth Client（Client ID/Secret + Refresh Token）、MCC 帳號 ID
  - 待做：在 `src/lib/googleAds.ts` 裡實作 `fetchLiveGoogleAdsData()`，改用 Google Ads API v18 的 GAQL 查詢（campaign / ad_group / ad_group_criterion / search_term_view）

### B. 全新串接（screenshot 裡提到、目前完全沒做）

- **Meta Ads API**（你是自己串 API，不是 MCP）
  - 需要：App ID/Secret、長效 Access Token、Ad Account ID
  - 範圍：成效數據撈曲（每日花費/購買/自報 ROAS）、受眾包設定、廣告投放、改預算、改文案
  - Schema 已經有 `platform: "meta"` 欄位可以掛，但 Campaign/AdGroup 目前的欄位是照 Google Ads 的邏輯設計（keyword-based），Meta 的 campaign/ad set/ad 三層結構要另外評估要不要共用現有 model 還是開新的

- **GA4**
  - 需要：GA4 Property ID、Service Account JSON（或 OAuth）
  - 範圍：流量、漏斗、來源歸因、UTM 帶單比對、跳出率/銷售頁分析

- **GSC（Google Search Console）**
  - 需要：已驗證網站 + Service Account 存取權限
  - 範圍：自然搜尋字詞，餵給現有的 Keyword Planning 頁面做關鍵字規劃參考

- **ihi 短網址**
  - 需要：ihi API Key
  - 範圍：自動產生帶 UTM 參數的短網址，串在廣告投放流程裡

- **Telegram 日報 + 監測排程**
  - 需要：Bot Token、目標 Chat ID
  - 範圍：每天早上把當日數據摘要推播到 Telegram；廣告調整後自動排程回頭檢視的時間點

### C. 最後一步

- **Agent 對話介面** — 把 A、B 全部串起來之後，把 `src/lib/ai.ts` 從「單次生成」升級成有 tool-calling、能查詢上述所有資料源的 agent，做到「每天跟 agent 聊半小時看數據做決策」的體驗

## 開發注意事項

- 改 `prisma/schema.prisma` 後記得 `npx prisma db push`，**而且要重啟 `next dev`**——已經在跑的 dev server 會抱著舊的 Prisma Client 不放，光 `prisma generate` 沒用，query 新欄位/新 model 會直接噴 `Cannot read properties of undefined`
- 所有 UI 文字（頁面標題、欄位、按鈕）一律用英文，跟現有頁面風格一致，即使我們對話是用中文
