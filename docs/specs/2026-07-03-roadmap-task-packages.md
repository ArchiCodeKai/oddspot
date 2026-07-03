# OddSpot 開發路線圖——任務包

日期：2026-07-03
狀態：Active（**狀態追蹤的唯一事實來源**；取代 CLAUDE.md 進度表與 `2026-06-08-current-status-roadmap.md` 的「下一步」章節）
關聯：`2026-07-03-product-spec.md`（範圍與 DoD）、`2026-07-03-technical-spec.md`（架構決策）

---

## 使用方式（給接手的模型）

1. 依 Phase 順序執行；同 Phase 內的任務包互相獨立，可任選。
2. 每包開工前：讀「範圍檔案」列出的檔案 + 技術規格書對應 ADR，**不讀其他**。
3. 每包完成的定義：驗收條件全勾 + `npm run build` 零錯誤 +
   `node --test tests/**/*.test.mjs` 全綠 + 更新本文件的狀態欄。
4. 「禁區」列的東西碰都不要碰。發現禁區外的問題：加 TODO 註解 + 回報，不要修。
5. 標 🧑 的任務需要使用者本人操作（部署、真機、git），模型只能準備材料。
6. Git 操作（add/commit/push）一律先列出指令與影響範圍，**等使用者確認**。

## 狀態總覽

| 包 | 名稱 | Phase | 狀態 |
|----|------|-------|------|
| W0 | WIP 收斂 commit | 0 | ⬜ 未開始 |
| T1 | Production 部署驗證 🧑 | 1 | ⬜ 未開始 |
| T2 | 照片每日上限改 DB 計數 | 1 | ⬜ 未開始 |
| T3 | scripts 補齊與依賴清理 | 1 | ⬜ 未開始 |
| T4 | Reject reason 全鏈路 | 2 | ⬜ 未開始 |
| T5 | 資訊架構收斂（動作回饋與入口） | 2 | ⬜ 未開始 |
| T6 | 真機 QA 🧑 | 2 | ⬜ 未開始 |
| T7 | 行為測試補強 | 3 | ⬜ 未開始 |
| T8 | pending 過期清理（admin 手動） | 3 | ⬜ 未開始 |
| T9 | 文件同步收斂 | 3 | ⬜ 未開始 |
| T10 | Demo 素材（README case study + 腳本） | 3 | ⬜ 未開始 |

---

## Phase 0：收斂現場（最先做，半天內）

### W0 — WIP 收斂 commit 🧑

- **目標**：把 working tree 的 22 個修改檔 + `src/components/submit/` 收成乾淨的 commit(s)。
- **為什麼**：這批變更（投稿位置預覽、收藏同步重構、孤兒圖清理）已完成且 build/測試全綠，
  積著只有風險沒有好處。
- **步驟**：模型整理 diff 摘要並按主題分組（投稿 UX / 收藏同步 / admin 清理 / 文件），
  提出 commit 訊息草稿，**列出完整 git 指令清單後停下等使用者確認**。
- **驗收**：`git status` 乾淨；每個 commit 是單一主題；訊息符合現有風格（feat:/fix:/docs:）。
- **禁區**：不改任何程式碼內容；不 push 到 remote（除非使用者另行確認）。

## Phase 1：上線（本週。產品規格書 DoD 的直接對應）

### T1 — Production 部署驗證 🧑

- **目標**：Vercel production 全鏈路實測通過。
- **模型可做**：產出逐步 checklist 文件（env 清單見技術規格書第五節、OAuth callback URL
  格式、`/admin` health check 與 blob smoke 的預期結果、`prisma migrate deploy` 指令）。
- **使用者做**：設定 Vercel env、Google/LINE console callback、實際點擊驗證。
- **驗收**：
  - [ ] `/admin` health check 全綠、blob smoke test 通過
  - [ ] Google 與 LINE 各完成一次真實登入
  - [ ] 完成一筆真實投稿（含照片）→ admin 核准 → 地圖上看得到
  - [ ] 公開 URL 在無痕視窗可完整走過：地圖 → 滑卡 → 收藏 → 行程 → 外部導航
- **禁區**：過程中發現的程式 bug 記下來開新任務，不在部署當下急修。

### T2 — 照片每日上限改 DB 計數

- **目標**：`checkDailyMemoryLimit` 的照片每日上限（15 張/天）改為跨 instance 正確的計數。
- **為什麼**：serverless 每個 instance 記憶體獨立，現行實作在 production 守不住（ADR AD-7）。
- **作法建議**：新增 Prisma model `UploadLog { id, userId, createdAt }`（或以現有資料推算——
  但 Spot.images 在投稿失敗時不留痕，建議獨立 log 表）；上傳成功後寫入一筆；
  檢查時 count 當日（Asia/Taipei 起算，比照 `getTaipeiDayStart()`）。
- **範圍檔案**：`prisma/schema.prisma`（migration）、`src/app/api/uploads/spots/route.ts`、
  `src/lib/security/rateLimit.ts`、`tests/services/securityContracts.test.mjs`。
- **驗收**：
  - [ ] 每日上限計數存於 DB，重啟/多 instance 不影響
  - [ ] burst limit（記憶體）保留不動
  - [ ] securityContracts 測試更新並通過；新增至少一個行為測試驗證「第 16 張被拒」
  - [ ] `prisma migrate dev` 產生 migration 檔
- **禁區**：不引入 Redis/Upstash；不動投稿（`/api/spots`）的限流邏輯。

### T3 — scripts 補齊與依賴清理

- **目標**：接手者用標準指令就能跑測試與 seed；移除無用依賴。
- **範圍檔案**：`package.json`、`prisma/seed.ts`（確認 seed 設定）、CLAUDE.md（指令表同步）。
- **內容**：加 `"test": "node --test tests/**/*.test.mjs"`；補 prisma seed 設定；
  移除 `@prisma/adapter-better-sqlite3`、`better-sqlite3`、`@types/better-sqlite3`。
- **驗收**：
  - [ ] `npm test` 43+ 全綠；`npm run build` 零錯誤
  - [ ] `npm ls better-sqlite3` 查無此套件
  - [ ] `src/lib/db.ts` 無殘留 sqlite 分支
- **禁區**：不升級任何其他依賴版本（尤其 next-auth，見 AD-4）。

## Phase 2：UX 迴圈閉合（部署後 1–2 週）

### T4 — Reject reason 全鏈路

- **目標**：投稿被拒時使用者能看到原因。
- **範圍檔案**：`prisma/schema.prisma`（`Spot.rejectReason String?`，這是 v1 唯一允許的
  schema 變更）、`src/lib/validation.ts`、`src/app/api/admin/spots/[id]/route.ts`、
  `src/app/admin/page.tsx`（reject 時填原因，可選預設選項 + 自由文字）、
  `src/app/submissions/page.tsx`（顯示原因）。
- **驗收**：
  - [ ] admin reject 可附原因（不填則存預設文案）
  - [ ] `/submissions` 的 rejected 卡片顯示原因
  - [ ] 原因欄位有 Zod 驗證（長度上限 200）
  - [ ] 公開 API（`/api/spots*`）**不**回傳 rejectReason
  - [ ] migration 檔產生；契約測試補「admin route 含 rejectReason 處理」
- **禁區**：不做通知系統（email/push）；不動審核以外的 admin 功能。

### T5 — 資訊架構收斂（動作回饋與入口）

- **目標**：三個「寫入動作」完成後，使用者都知道結果去了哪（產品規格書附錄的三原則）。
- **內容**：
  1. 收藏成功 toast/提示帶 `/saved` 入口（地圖 popup、滑卡、詳情頁三處行為一致）。
  2. 投稿成功頁帶 `/submissions` 入口。
  3. 滑卡首次進入時的一次性提示（localStorage flag）：說明 左滑=略過、+=只收藏、
     右滑=收藏＋行程。
  4. RouteSheet 滿 5 點的 disabled 提示文案確認在四個 theme 下可讀。
- **範圍檔案**：`src/components/map/SpotPopup.tsx`、`src/components/swipe/`、
  `src/components/spots/SpotActionBar.tsx`、`src/app/submit/page.tsx`、相關 i18n messages。
- **驗收**：
  - [ ] 三處收藏動作提示行為一致且可點擊跳轉
  - [ ] 滑卡提示只出現一次，清 localStorage 後重現
  - [ ] 文案走 i18n messages，不寫死在 JSX
  - [ ] 視覺符合技術規格書第四節硬規則（CSS 變數、2px 圓角）
- **禁區**：不重構現有元件結構；不加新頁面；不動 useSavedStore 的同步邏輯。

### T6 — 真機 QA 🧑

- **目標**：四環境核心流程實測（iPhone Safari / Android Chrome / iPadOS Safari / 桌機 Chrome）。
- **模型可做**：產出逐環境 QA checklist（滑卡手勢、卡片內滾動、filter sheet、RouteSheet
  下滑收合、外部導航跳轉、theme 切換）。使用者回報問題後，逐項開修復任務。
- **驗收**：四環境 checklist 全部執行過，問題清單歸零或明確標記「接受」。

## Phase 3：品質與展示（求職材料就緒）

### T7 — 行為測試補強

- **目標**：核心純函數模組有真正的行為測試（不是 regex 契約）。
- **範圍**：`rateLimit`（窗口內第 N+1 次被拒、過期重置）、`duplicate`（同名/近座標判定）、
  `googleMapsPaste` 與 `googleMapsResolve` 的 parser（各 URL 格式）、
  `useSavedStore` 的樂觀更新回滾（可用最小 mock fetch）。
- **驗收**：新增 ≥15 個行為測試全綠；不改動被測模組的公開介面；既有契約測試保留。
- **禁區**：不引入測試框架；不為了可測性重構元件。

### T8 — pending 過期清理（admin 手動）

- **目標**：`/admin` 加「清理過期 pending」按鈕：刪除 `expiresAt < now` 且 `status=pending`
  的 spot 及其 Blob 圖片。
- **範圍檔案**：`src/app/admin/page.tsx`、新增 `src/app/api/admin/cleanup/route.ts`（admin 保護）。
- **驗收**：
  - [ ] 按鈕顯示將清理的筆數，二次確認後執行
  - [ ] Blob 圖片以 `Promise.allSettled` best-effort 清理（比照 reject 現行模式）
  - [ ] 契約測試：cleanup route 有 `isAdminSession` 檢查
- **禁區**：不做 cron / Vercel scheduled functions（AD-6 的清理策略）。

### T9 — 文件同步收斂

- **目標**：消除多重事實來源與已知過時標註。
- **內容**：
  1. `visual-design.md` 在已被 v2 停用的段落（8 色分類等）加註「已停用，見 design-direction-v2.md」。
  2. `design-direction-v2.md` 的實作進度段更新到現況。
  3. `2026-06-08-current-status-roadmap.md` 開頭加註「下一步章節已由 2026-07-03 roadmap 取代，
     本文件保留作功能狀態快照」。
  4. 三份 landing spec（04-27、04-28、05-02）開頭加註「❄️ 凍結（AD-10）」。
  5. iOS 外部導航 fallback 在各文件的狀態統一為「已實作、待真機驗證」。
- **驗收**：上述五處修改完成；沒有新增任何「計畫中」內容（文件只反映現狀）。

### T10 — Demo 素材

- **目標**：README 改寫為 case study + 5 分鐘 demo 腳本。
- **內容**：架構圖（mermaid）、關鍵決策故事（Mapbox 客製、guest sync、審核安全邊界、
  Acid 視覺系統）、demo 動線腳本（地圖 → 滑卡 → 行程 → 導航 → 投稿 → 審核）、
  截圖或 GIF 佔位清單（由使用者補真機截圖）。
- **驗收**：README 讓沒看過專案的工程師 5 分鐘內理解系統全貌；demo 腳本可照唸。

---

## 明確不排入的（與產品規格書凍結清單一致）

社群功能、複雜收藏夾、AI 審核、到訪驗證、足跡地圖、評分 UI、原生 App、
locale 路由/SEO i18n、landing 3D 新迭代、Redis rate limit、audit log、admin 角色管理 UI。
要做其中任何一項之前，先修改產品規格書並說明理由。
