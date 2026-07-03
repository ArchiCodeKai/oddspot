# OddSpot 技術規格書

日期：2026-07-03
狀態：Active（架構決策的權威文件；與 `.ai-context/global/` 各規範並行，衝突時以本文件為準）
關聯：`2026-07-03-product-spec.md`、`2026-07-03-project-analysis.md`、`2026-07-03-roadmap-task-packages.md`

---

## 一、架構決策記錄（ADR）

每條決策含理由與狀態。改變任何一條之前，先更新這份文件並說明推翻的理由。

### AD-1 Next.js App Router 全端單體，部署 Vercel

- **決策**：單一 Next.js 16 專案承載前端、API routes、admin，部署在 Vercel。
- **理由**：一人專案，消除前後端分離的溝通與部署成本；Vercel 免費額度足夠 MVP；
  面試展示時「一個 repo 講完整個系統」是優勢。
- **代價（已接受）**：serverless 帶來的無狀態限制（見 AD-7）；被 Vercel 生態綁定。

### AD-2 地圖用 Mapbox + react-map-gl，不用 Google Maps

- **決策**：Mapbox GL JS v3，四套自製主題 style JSON 由 `src/lib/mapbox/style-loader.ts` 載入。
- **理由**：Acid/Y2K 視覺是產品識別，Google Maps 無法深度客製地圖底圖；
  Mapbox 免費額度（50k loads/月）對 MVP 綽綽有餘。
- **代價**：導航仍依賴外部跳轉（Google Maps / Apple Maps），由 ExternalNavSheet 處理 fallback 鏈。

### AD-3 狀態管理：Zustand 管 UI 狀態、React Query 管伺服器資料

- **決策**：8 個 Zustand store 各管一塊 UI 狀態；所有 API 資料走 React Query（staleTime 5 分鐘）。
- **邊界規則**：Zustand 裡**不准**出現 API response 快取；React Query 的 queryKey
  參數來自 Zustand（filters、radius、bbox）。唯一例外是 `useSavedStore` 的
  `savedSpotIds`——它是「使用者意圖」不是伺服器快取，登入時以 DB 為準 hydrate。
- **持久化策略**：收藏、主題、語言 → localStorage；路線規劃 → sessionStorage（跨頁面不跨工作階段）；
  其餘不持久化。

### AD-4 認證：NextAuth v5（beta）+ Prisma Adapter + Google/LINE OAuth

- **決策**：沿用 next-auth 5.0.0-beta.30，database session。
- **理由**：Prisma adapter 整合成本最低；LINE 是台灣市場必要 provider。
- **已知風險**：beta 依賴。緩解：鎖定版本、正式版釋出後專門排一個升級任務、
  升級時跑完整 OAuth 流程驗證。**不要在其他任務裡順手升級 next-auth。**
- **Admin 判定**：DB `role` 欄位為主，`ADMIN_EMAIL` env 為 signIn 時的自動升級 + fallback。

### AD-5 資料庫：PostgreSQL（Neon/Vercel Postgres）+ Prisma 7

- **決策**：production 與 dev 都用 Postgres（`@prisma/adapter-pg`）。
- **待辦**：`@prisma/adapter-better-sqlite3` 與 `better-sqlite3` 已不使用，應自
  package.json 移除（roadmap T3）。
- **Migration 紀律**：schema 變更一律走 `prisma migrate dev`，不手改 DB。

### AD-6 圖片：前端壓縮 + Vercel Blob

- **決策**：投稿照片前端壓縮至 ≤600KB → `POST /api/uploads/spots` → Blob，
  路徑 `spots/{userId}/{uuid}.{ext}`；DB 只存 URL JSON。
- **清理策略**：投稿失敗時前端呼叫 DELETE 清孤兒圖（best-effort）；
  admin reject 時後端清圖。不做定期掃描 cron（v1 規模不需要）。

### AD-7 防濫用：DB 計數為主、記憶體限流為輔（serverless 現實）

- **決策**：
  - 每日投稿上限：`prisma.spot.count`（DB-based，跨 instance 正確）✅ 現狀
  - 每日照片上限：**改為 DB-based**（現為記憶體，roadmap T2 修正）
  - Burst limit（60 秒窗口）：保留記憶體實作，**定位為 best-effort 減速帶**，
    不是硬防線。真正的硬防線是每日 DB 上限 + 登入門檻。
- **理由**：v1 流量下引入 Redis/Upstash 是過度工程；DB 計數已能守住成本風險。
  若日後出現實際濫用，升級路徑是 Upstash Ratelimit（已預留 key 格式 `{action}:{userId}`）。

### AD-8 i18n：client-side 切換，server 端固定 zh-TW（v1 凍結決策）

- **決策**：三語 messages（zh-TW/en/ja）+ `useLocaleStore` client 切換；
  不做 locale 路由、不做 server 端語言協商。
- **已知缺陷（接受）**：切換語言後 refresh 首屏會閃回中文；SEO 只有中文。
- **理由**：目標市場是台灣，英日文是 demo 加分項不是需求。修 server-side i18n
  牽動 middleware 與路由結構，報酬不成比例。**v2 之前不准動這塊。**

### AD-9 測試：node:test 契約測試 + 逐步補行為測試

- **決策**：不引入 Jest/Vitest；沿用 node:test + .mjs。
- **現狀認知**：現有 43 個測試多為「原始碼 regex 契約」，防迴歸有效但不驗證行為。
- **方向**：新測試優先寫**行為測試**（直接 import 純函數模組：rateLimit、duplicate、
  googleMapsPaste、routePlannerPersistence 已可直接測）；React 元件不強求測試。
- **待辦**：`package.json` 加 `"test": "node --test tests/**/*.test.mjs"`（roadmap T3）。

### AD-10 Landing 3D：凍結維護模式

- **決策**：`src/components/landing/` 全區進入凍結——只修 bug，不加功能、不重構、
  不實作剩餘的 landing spec（globe-moon、moon point cloud、eye morph 三份 spec 標記凍結）。
- **理由**：~6,000 行高複雜度 Three.js 程式碼已穩定運作且被 dynamic import 隔離；
  其求職價值已透過 Vault 技術筆記收割；重構風險高、報酬趨近零。

## 二、資料模型

Schema 全文見 `prisma/schema.prisma`，此處記錄**使用狀態與變更規則**：

| Model / 欄位 | v1 狀態 | 說明 |
|--------------|---------|------|
| User / Account / Session / VerificationToken | ✅ 使用中 | NextAuth 標準結構，**不可改名或移除欄位** |
| User.role | ✅ 使用中 | `"user"` / `"admin"`，admin 判定主依據 |
| Spot 核心欄位（name/lat/lng/category/status/difficulty/images） | ✅ 使用中 | `images` 是 JSON string，讀寫都要 parse/stringify |
| Spot.status | ✅ 使用中 | `active`/`uncertain`/`disappeared`/`pending`/`rejected`；前三者是公開白名單 |
| Spot.expiresAt | ⚠️ 半使用 | 投稿時寫入 +30 天，尚無清理機制（roadmap T10） |
| Spot.rating / voteCount / visitCount | 💤 保留不用 | v1 UI 不顯示、無寫入 API；**不要因為「沒用到」而刪除**，v2 到訪驗證會用 |
| Spot.googlePlaceId | 💤 保留不用 | 未來去重強化用 |
| VisitedSpot | 💤 保留不用 | v2 到訪驗證用 |
| SavedSpot | ✅ 使用中 | `@@unique([userId, spotId])` 保證冪等 |

**v1 唯一允許的 schema 變更**：`Spot` 增加 `rejectReason String?`（roadmap T4）。
其他任何 schema 變更都要先在本文件開 ADR。

## 三、API 一覽（含防護矩陣)

| 路由 | 方法 | Auth | Zod | Rate limit | 備註 |
|------|------|------|-----|-----------|------|
| `/api/spots` | GET | – | ✅ | – | 狀態白名單過濾，cursor 分頁 50/頁 |
| `/api/spots` | POST | ✅ | ✅ | burst 6/60s + 每日 5（DB） | 去重檢查、status=pending、expiresAt+30d |
| `/api/spots/[id]` | GET | – | ✅ | – | pending/rejected 不可見 |
| `/api/saved` | GET/POST | ✅ | ✅ | – | |
| `/api/saved/[spotId]` | DELETE | ✅ | ✅ | – | |
| `/api/saved/sync` | POST | ✅ | ✅（≤500 筆） | – | guest merge |
| `/api/uploads/spots` | POST | ✅ | type/size | burst 20/60s + 每日 15（⚠️ 記憶體→T2 改 DB） | JPEG/PNG/WebP ≤600KB |
| `/api/uploads/spots` | DELETE | ✅ | URL 所有權 | – | 孤兒圖清理，僅限 `spots/{userId}/` |
| `/api/maps/resolve` | POST | ✅ | host 白名單 | 20/60s | HTTPS-only、5 redirects、4s timeout |
| `/api/admin/spots` | GET | ✅ admin | – | – | pending 清單 |
| `/api/admin/spots/[id]` | PATCH | ✅ admin | ✅ enum | – | approve/reject，reject 清 Blob |
| `/api/admin/health`、`/api/admin/blob-smoke` | GET/POST | ✅ admin | – | – | production 檢查 |

**回應格式**：統一 `ApiResponse<T>`（`{ data, success, error? }`），錯誤訊息繁體中文。

## 四、視覺系統落地規範

權威來源鏈（衝突時上面的贏）：

1. `src/design-reference/claude-design-source/.../themes.css` —— 色票的唯一事實
2. `.ai-context/global/design-direction-v2.md` —— v2 Acid/Y2K 方向
3. `oddspot-acid-components` skill —— 濃縮版技術規範
4. `.ai-context/global/visual-design.md` —— v1 基礎（部分已被 v2 停用）

### 硬規則（PR 檢查清單）

- [ ] 顏色一律 `var(--accent)` / `var(--bg)` / `var(--fg)` 等 CSS 變數，
      **唯一例外**是 8 個分類色（不隨 theme 變）。
- [ ] 4 themes（terminal 預設 / blueprint / caution / midnight）經 `data-theme` 切換，
      新元件必須在四個 theme 下都不破版。
- [ ] 圓角預設 2px（`rounded-sm`）；大圓角僅限手機框、hero 圖、內容區頂部、按鈕。
- [ ] Wireframe 元素：stroke 0.5–1px、**no fill**、旋轉緩慢。
- [ ] Acid stickers：旋轉 -8° 到 +8°，不對齊 grid。
- [ ] 每個新元件選 1–3 個 Visual DNA（wireframe / stickers / marquee / eye mood），不要全上。
- [ ] 不移除 `body::before/after` 的 grain + scanlines。
- [ ] 低階裝置降級：3D → 2D SVG；`useReducedMotion` 必須支援。
- [ ] 不寫 custom shader、不做真實地球紋理。

### 落地流程

設計稿 → React 的流程固定為：`src/design-reference/` 讀 HTML 設計稿 →
輸出到 `src/components/` → 顏色轉 CSS 變數 → 四 theme 檢查 → build。
`claude-design-source/` 是 baseline **不可修改**；迭代放 `huashu-iterations/v{N}-{描述}/`。

## 五、環境變數清單

| 變數 | 用途 | 缺少時的行為 |
|------|------|-------------|
| `DATABASE_URL` | Postgres 連線 | 全站 API 掛 |
| `AUTH_SECRET` | NextAuth session 加密 | 登入掛 |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth | Google 登入掛 |
| `AUTH_LINE_ID` / `AUTH_LINE_SECRET` | LINE OAuth | LINE 登入掛 |
| `ADMIN_EMAIL` | admin 自動升級 + fallback 判定 | 無法產生第一個 admin |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | 地圖與路線 | 地圖空白（submit 預覽有優雅降級） |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | 照片上傳掛 |

Production 部署後用 `/admin` 的 health check + blob smoke test 逐項驗證（roadmap T1）。
