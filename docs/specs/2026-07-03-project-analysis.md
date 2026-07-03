# OddSpot 專案現況分析

日期：2026-07-03
性質：一次性的完整體檢報告（不需持續維護；狀態追蹤請看 roadmap）
關聯：`2026-07-03-product-spec.md`、`2026-07-03-technical-spec.md`、`2026-07-03-roadmap-task-packages.md`

---

## 一、完成度總覽

### 健康度硬指標（2026-07-03 實測）

| 指標 | 結果 |
|------|------|
| `npm run build` | ✅ 零錯誤、零 TS 警告，17 個路由全部產出 |
| 測試 | ✅ 43/43 通過（`node --test tests/**/*.test.mjs`；`npm test` script 尚未建立） |
| TODO/FIXME 註解 | 0 個 |
| 程式碼規模 | 144 個 .ts/.tsx 檔 |
| 未 commit 變更 | ⚠️ 22 個檔案 +567/−277 行（投稿位置預覽、收藏同步重構、孤兒圖清理） |

### 功能完成度

MVP v1 六大功能（地圖、滑卡、行程路線、收藏同步、投稿審核、認證）**程式層面全部完成**，
細節見 `2026-06-08-current-status-roadmap.md`。真正沒完成的是三件流程事：

1. **沒有部署到 production**——roadmap 從 6/8 就把它列為 P0 第一項，至今超過三週未動。
2. **真機 QA 沒跑過**——手勢密集的產品，DevTools 模擬不算數。
3. **working tree 積了一批 WIP**——越晚收斂，review 成本越高、遺失風險越大。

**結論：這是一個「程式完成度約 90%、產品完成度約 60%」的專案。**
差距全部在「上線與驗證」，不在功能。

## 二、架構優點（有證據的）

1. **安全邊界意識高於一般 side project 水準**：
   - 公開 API 狀態白名單（`PUBLIC_SPOT_STATUSES`），client 傳 `status=pending` 也會被過濾，
     且有契約測試防迴歸（`tests/services/securityContracts.test.mjs`）。
   - `/api/maps/resolve` 有 auth、20 次/分 rate limit、HTTPS-only + host 白名單、
     redirect 上限 5 次、4 秒 timeout（`src/lib/submit/googleMapsResolve.ts`）——SSRF 防禦到位。
   - Blob 路徑含 userId，DELETE 檢查所有權；admin reject 會清 Blob 並保留 `rejected` 供稽核。
   - 全部寫入 API 都有 Zod 驗證。
2. **狀態管理分工乾淨**：Zustand 只管 UI 狀態（8 個 store 職責單一），
   React Query 管伺服器資料，沒有互相越界。
3. **Guest → 登入同步設計完整**：localStorage 樂觀更新、登入時 merge 到 DB、
   後端失敗會回滾、登出不誤清 guest 資料（`useSavedStore` + `useAuthSync`）。
4. **關鍵路徑有測試保護**：安全契約、去重、query 參數、路線持久化、手勢邏輯。
5. **視覺系統有紀律**：抽查核心元件（MapView、RouteSheet、SwipeCard、SpotActionBar、
   SubmitLocationMapPreview）零寫死 hex、全走 CSS 變數，符合 design-direction-v2。
6. **文件量與準確度在 side project 中罕見地高**（.ai-context + docs 雙層，多數與實況一致）。

## 三、架構缺點

1. **Rate limit 的 burst 與照片每日上限存在 process 記憶體**（`src/lib/security/rateLimit.ts`）。
   Vercel serverless 每個 instance 各有一份 Map、cold start 歸零——部署後這層防線大部分失效。
   （每日「投稿」上限用 `prisma.spot.count` 是 DB-based，沒這個問題。）
2. **測試是「regex 契約測試」不是行為測試**：驗證的是「原始碼裡有出現 `checkRateLimit` 字串」，
   不是「rate limit 真的擋住第 7 次請求」。防迴歸有效，但給的信心有限。
3. **Landing 3D 是一座重資產孤島**：~6,000 行 Three.js 程式碼
   （GlobeSceneMobile 2,434 行、TeethJawR3F 1,091 行、GlobeScene 628 行），
   desktop/mobile 兩套 geometry builder 有重複。它能動、有 dynamic import 隔離，
   但任何人碰它都是高風險低報酬。
4. **i18n 半套**：三語 messages 齊全、client 可切換，但 server 端固定 zh-TW，
   換語言後 refresh 會閃回中文，也沒有 locale 路由（SEO 不友善）。
5. **schema 有四處「先建了沒在用」**：`rating`/`voteCount`、`VisitedSpot` 表、
   `googlePlaceId`、`expiresAt`（pending 30 天到期但沒有任何清理機制）。

## 四、技術債清單（按嚴重度排序）

### 🔴 嚴重——部署前必須處理

| # | 債 | 位置 | 影響 | 修復成本 |
|---|-----|------|------|---------|
| 1 | 照片每日上限用記憶體計數（`checkDailyMemoryLimit`） | `src/lib/security/rateLimit.ts`、`src/app/api/uploads/spots/route.ts` | serverless 下防濫用形同虛設，Blob 成本風險 | 低：比照投稿上限改 DB 計數，半天內 |
| 2 | 未部署 production | 流程債 | Hero Piece 價值 = 0；所有「待驗證」項目持續積壓 | 人工半天（checklist 已在 `/admin`） |
| 3 | 22 個檔案的 WIP 未 commit | working tree | 遺失風險、diff 越滾越大、文件與程式脫鉤 | 人工 review + commit，1–2 小時 |

### 🟠 中——一個月內處理

| # | 債 | 位置 | 影響 | 修復成本 |
|---|-----|------|------|---------|
| 4 | burst rate limit 在 serverless 只有 best-effort 效果 | `src/lib/security/rateLimit.ts` | 防線弱化但每日 DB 上限仍在，屬可接受風險，需文件化 | 文件化 0.5 小時；徹底解需 Upstash/KV，2–3 小時 |
| 5 | `npm test` / `npm run seed` script 不存在 | `package.json` | 接手者（含 AI）不知道怎麼跑測試和 seed | 30 分鐘 |
| 6 | next-auth 5.0.0-beta.30 | `package.json` | beta 依賴，升級可能 breaking | 監控即可；正式版出後排半天升級 |
| 7 | reject reason 缺失 | schema + admin API + `/submissions` | 投稿被拒的使用者不知道原因，UX 迴圈斷裂 | 半天 |
| 8 | 契約測試未覆蓋行為 | `tests/` | rate limit、sync 等核心邏輯無行為驗證 | 每個模組 2–3 小時 |
| 9 | `@prisma/adapter-better-sqlite3` + `better-sqlite3` 裝了沒用 | `package.json` | 混淆接手者、拖慢 install | 15 分鐘 |

### 🟡 輕——有空再處理，或明確決定不處理

| # | 債 | 位置 | 建議 |
|---|-----|------|------|
| 10 | i18n server 端固定 zh-TW | `src/i18n/request.ts` | **決定不修**（v1 凍結），在技術規格書記錄決策 |
| 11 | Landing 3D 大檔與重複 builder | `src/components/landing/` | **凍結不重構**，只修 bug；風險已被 dynamic import 隔離 |
| 12 | `expiresAt` 無清理機制 | schema + admin | 在 `/admin` 加手動清理按鈕即可，不做 cron |
| 13 | 大元件檔：RouteSheet 728 行、SwipeView 729 行、submit/page 614 行 | `src/components/`、`src/app/submit/` | 下次改到該檔時順勢拆，不專門開工 |
| 14 | `MAX_WAYPOINTS = 5` 散落多處 | RouteSheet、useRoutePlannerStore | 併入其他任務時抽到 `lib/constants/` |
| 15 | `useAuthSync` side effect 寫在 hook 而非 store action | `src/hooks/useAuthSync.ts` | 可讀性問題，不影響行為，低優先 |
| 16 | `images` 存 JSON string 而非 Json type | schema | v1 接受；v2 若要查詢圖片再 migrate |
| 17 | admin 無 audit log、無角色管理 UI | admin | v2 再議；目前單一 admin 夠用 |
| 18 | 文件債：visual-design.md 未標註 v2 已停用部分、Vault 索引停在 4 月的認知 | docs / Vault | 本次規格作業一併處理 |

### 已查證不是債的（澄清）

- `/api/maps/resolve`「無驗證」的疑慮：**不成立**，防護完整（見架構優點 1）。
- TeethJawR3F / RomanBustR3F / WormholeR3F「死碼」疑慮：**不成立**，
  被 `LangPortalToggle` 與 `globe/Moon` 引用，是 landing 體驗的一部分。
- iOS 外部導航 fallback：git 歷史顯示已實作（`3d88284`），
  roadmap P0 清單該項應標記完成，只剩真機驗證。

## 五、誠實的方向評估

### 走偏訊號一：部署拖延是目前唯一真正的危機

Roadmap 6/8 就把 production 驗證列為 P0 第一項，之後三週的 commit
全部是功能與 UX 打磨。對一般產品這叫迭代，對「求職 Hero Piece」這叫**逃避風險最高的一步**。
OAuth callback、Blob、DB migration 只有上了 production 才知道會不會炸。
建議：**在做任何新功能之前，先部署。** 部署後所有問題都會變具體。

### 走偏訊號二：Landing 3D 的投資已過報酬點

4–5 月的 3D 實驗（月球點雲、潮汐殼、牙齒、石膏頭像）技術含量高，
且已沉澱成 Vault 裡 7 份技術筆記——這筆投資的價值已經收割完畢。
三份未實作的 landing spec（globe-moon、moon point cloud、eye morph）應正式標記凍結。
面試官會被完整的產品迴圈說服，不會因為月亮多一種 morph 而加分。

### 走偏訊號三：文件開始出現多重事實來源

CLAUDE.md 進度表、roadmap spec、四個 feature module 各自維護狀態，
已出現輕微不同步（iOS fallback 一處說待辦、git 已完成）。
本次規格作業將收斂為：**CLAUDE.md 只放指針，roadmap 是狀態唯一來源**。

### 方向沒問題的部分（同樣要誠實說）

- 產品範圍控制得很好：該拒絕的（社群、AI 審核、複雜收藏夾）都拒絕了。
- 「先修安全與流程、不急著加功能」的 P0 判斷完全正確，執行也到位（除了部署本身）。
- 技術選型沒有炫技病：Zustand 而非 Redux、node:test 而非重型框架、
  Vercel 全家桶而非自架，都是一人專案的正確選擇。
