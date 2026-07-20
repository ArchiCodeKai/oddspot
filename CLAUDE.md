# OddSpot — AI 操作入口

## 重要：開始前必讀

本文件是 Claude Code 的操作原則入口。
詳細架構文件請依序閱讀：`.ai-context/README.md`

**接手任何工作前，先讀這四份 2026-07-03 規格（按需要挑）：**

| 想知道什麼 | 讀哪份 |
|-----------|--------|
| 現在該做什麼、任務怎麼領 | `docs/specs/2026-07-03-roadmap-task-packages.md`（**狀態唯一來源**） |
| 什麼該做、什麼明確不做 | `docs/specs/2026-07-03-product-spec.md` |
| 架構為什麼長這樣、哪些決策不可推翻 | `docs/specs/2026-07-03-technical-spec.md` |
| 專案體質與技術債全貌 | `docs/specs/2026-07-03-project-analysis.md` |

---

## 目前狀態（2026-07-03）

- MVP v1 六大功能（地圖、滑卡、行程路線、收藏同步、投稿審核、認證）程式層面完成。
- `npm run build` 零錯誤；測試 46/46 綠（`npm test`）。
- **最大缺口是「上線」不是「功能」**：production 部署驗證、真機 QA、WIP commit 收斂。
- 功能狀態細節見 `docs/specs/2026-06-08-current-status-roadmap.md`（快照）；
  下一步一律以 2026-07-03 roadmap 為準。

---

## 標準工作流程（接手模型照做）

1. 從 `docs/specs/2026-07-03-roadmap-task-packages.md` 領一個任務包（依 Phase 順序）。
2. 只讀該包「範圍檔案」+ 技術規格書對應 ADR，不要通讀整個專案。
3. 動手前確認不碰「禁區」與下方凍結清單。
4. 完成 = 驗收條件全勾 + `npm run build` 零錯誤 + 測試全綠 + 回寫 roadmap 狀態欄。
5. 發現範圍外的問題：加 TODO 註解 + 回報，**不要順手修**。

### 凍結清單（沒有使用者明確同意，一律不做）

- `src/components/landing/` 全區（~6,000 行 Three.js）：只修 bug，不加功能、不重構（ADR AD-10）
- i18n server 端行為與 locale 路由（ADR AD-8)
- next-auth 版本升級（ADR AD-4）
- schema 變更（唯一例外：`Spot.rejectReason`，見技術規格書第二節）
- 社群功能、收藏夾分類、AI 審核、到訪驗證、評分 UI、Redis rate limit
- `src/design-reference/claude-design-source/`（設計 baseline，唯讀）

---

## Vibe Coding 操作原則

### 操作前必須先確認
- **任何 git 操作（add / commit / push / pull / merge / checkout / branch 等）執行前，必須先說明打算做什麼、影響範圍，並等我明確確認後才可以執行**
- 一次確認只授權當下這一組操作，下次要再 git 操作時必須重新確認
- 高風險操作（force push / reset --hard / branch -D 等）即使已同意也要再次確認一次

### 絕對禁止
- **不可執行 `npm run dev`**（port 使用限制）
- **不可進行大範圍重構**，只針對被請求的部分修改

### 每次提交前必做
1. 執行 `npm run build`，確認零錯誤、零 TypeScript 警告
2. 執行測試，確認全綠
3. 列出本次修改的所有檔案清單
4. 更新對應的文件（roadmap 狀態欄或 .ai-context/ 下的相關 md）

### 文件同步原則
- 做完一個功能或元件後，必須更新 `.ai-context/` 對應的 md
- 新增的 Zustand store、API route、元件，都要更新文件
- 文件優先反映「目前實際狀態」，不是「計畫中的狀態」
- 進度狀態只更新 `docs/specs/2026-07-03-roadmap-task-packages.md`，不在多處維護進度表

### 最小影響範圍
- 只修改被請求的檔案，不「順便優化」其他部分
- 發現其他問題，先以 TODO 註解標記，回報使用者後再處理

---

## 硬規則速查（違反即打回）

- 顏色一律 CSS 變數（`var(--accent)` 等），寫死 hex 只允許 8 個分類色
- 新 UI 必須在四個 theme（terminal/blueprint/caution/midnight）下檢查
- 圓角預設 2px；wireframe 元素 no fill、stroke 0.5–1px
- 所有寫入 API 要有 Zod 驗證；公開 API 不可回傳 `pending` / `rejected` spot
- 錯誤訊息繁體中文；回應格式統一 `ApiResponse<T>`
- 註解簡潔中文、不用 emoji、不過度註解

---

## 專案快速索引

| 文件 | 說明 |
|------|------|
| `docs/specs/2026-07-03-*.md` | **四份權威規格（見頁首）** |
| `.ai-context/README.md` | AI 讀取優先順序 |
| `.ai-context/global/restrictions.md` | 禁止操作完整清單 |
| `.ai-context/global/coding-standards.md` | 編碼規範 |
| `.ai-context/global/visual-design.md` | 視覺設計規範 v1（部分已被 v2 停用）|
| `.ai-context/global/design-direction-v2.md` | 視覺設計 v2 Acid/Y2K 方向（**優先於 v1**）|
| `.ai-context/global/state-management.md` | Zustand + React Query 分工 |
| `.ai-context/global/api-patterns.md` | API 設計模式 |
| `.ai-context/features/map/_module.md` | 地圖功能模組 |
| `.ai-context/features/spots/_module.md` | 景點功能模組 |
| `.ai-context/features/auth/_module.md` | 認證模組 |
| `.ai-context/features/swipe/_module.md` | 滑卡片功能（已整合在 `/map` 探索模式）|
| `docs/01-專案規劃/` | 架構、功能範圍、技術棧 |
| `docs/02-MVP規劃/` | MVP v1 開發順序 |
| `docs/03-元件設計/` | 各元件設計規範 |
| `docs/04-狀態管理/` | Store 設計、Guest mode |
| `docs/05-API設計/` | API endpoints 規格 |
| `docs/specs/2026-06-08-current-status-roadmap.md` | 功能狀態快照（下一步章節已由 07-03 roadmap 取代）|

---

## 設計交接流程（Design Handoff Workflow）

本專案採三階段設計交接，每一階段產出都是下一階段的輸入：

### 1. Claude Design（雲端）— 設計原件 Source of Truth
- 專案：claude.ai/design「OddSpot Design System」
- 匯出方式：Share → Download project as .zip
- 解壓位置：`src/design-reference/claude-design-source/`
- 不可直接修改此資料夾內容（是 baseline）

### 2. Huashu Design skill — 設計迭代與變體
- 讀取：`src/design-reference/claude-design-source/` 作為基底
- 產出位置：`src/design-reference/huashu-iterations/v{N}-{描述}/`
- 建議模型：Sonnet 4.6（品質與 token 成本平衡）
- 關鍵設定：**跳過 Brand Asset Protocol 的品牌搜尋**，
  直接讀 `themes.css` 作為權威色票來源

### 3. Claude Code — 設計稿轉 React 元件
- 輸入：`src/design-reference/` 下任一 HTML 設計稿
- 輸出：`src/components/` 下的 React 元件
- 視覺規範遵循：`.ai-context/global/design-direction-v2.md`
- 顏色引用必須透過 `themes.css` 的 CSS 變數，不可寫死 hex 值

詳細規則見 `src/design-reference/README.md`。

---

## Spot Model 快速參考

```prisma
images  String  // JSON string: ["url1", "url2"]，第一張 = coverImage
status  String  // 公開："active" | "uncertain" | "disappeared"
                // 審核中/被拒："pending" | "rejected"（公開 API 永不回傳）
difficulty String // "easy" | "medium" | "hard"
rating  Float   // 欄位存在，v1 UI 不顯示
visitCount Int  // 欄位存在，v1 UI 不顯示，v2 才有更新機制
```

完整資料模型與欄位使用狀態見技術規格書第二節。

## 知識庫使用

當需要查詢我的日記或筆記時：
1. 先閱讀 `~/Vault/查詢指南.md`
2. 按照指南的路徑規則定位檔案

當需要幫我撰寫日記時：
1. 先閱讀 `~/Vault/撰寫指南.md`
2. 按照指南的格式撰寫內容

日記路徑範例：`~/Vault/日記/2026/03/2026-03-26.md`

請注意知識庫位置是 Vault>專案>
