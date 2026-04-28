# OddSpot — AI 操作入口

## 重要：開始前必讀

本文件是 Claude Code 的操作原則入口。
詳細架構文件請依序閱讀：`.ai-context/README.md`

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
2. 列出本次修改的所有檔案清單
3. 更新對應的文件（CLAUDE.md 或 .ai-context/ 下的相關 md）

### 文件同步原則
- 做完一個功能或元件後，必須更新 `.ai-context/` 對應的 md
- 新增的 Zustand store、API route、元件，都要更新文件
- 文件優先反映「目前實際狀態」，不是「計畫中的狀態」

### 最小影響範圍
- 只修改被請求的檔案，不「順便優化」其他部分
- 發現其他問題，先以 TODO 註解標記，回報使用者後再處理

---

## 專案快速索引

| 文件 | 說明 |
|------|------|
| `.ai-context/README.md` | AI 讀取優先順序 |
| `.ai-context/global/restrictions.md` | 禁止操作完整清單 |
| `.ai-context/global/coding-standards.md` | 編碼規範 |
| `.ai-context/global/visual-design.md` | 視覺設計規範 v1（基礎規則）|
| `.ai-context/global/design-direction-v2.md` | 視覺設計 v2 Acid/Y2K 方向（**優先於 v1**）|
| `.ai-context/global/state-management.md` | Zustand + React Query 分工 |
| `.ai-context/global/api-patterns.md` | API 設計模式 |
| `.ai-context/features/map/_module.md` | 地圖功能模組 |
| `.ai-context/features/spots/_module.md` | 景點功能模組 |
| `.ai-context/features/auth/_module.md` | 認證模組（Step 5）|
| `.ai-context/features/swipe/_module.md` | 滑卡片功能（Step 4，待討論）|
| `docs/01-專案規劃/` | 架構、功能範圍、技術棧 |
| `docs/02-MVP規劃/` | MVP v1 開發順序 |
| `docs/03-元件設計/` | 各元件設計規範 |
| `docs/04-狀態管理/` | Store 設計、Guest mode |
| `docs/05-API設計/` | API endpoints 規格 |

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
status  String  // "active" | "uncertain" | "disappeared"
difficulty String // "easy" | "medium" | "hard"
rating  Float   // 欄位存在，v1 UI 不顯示
visitCount Int  // 欄位存在，v1 UI 不顯示，v2 才有更新機制
```

## 開發進度（持續更新）

| 步驟 | 功能 | 狀態 |
|------|------|------|
| Step 1 | Schema + Seed Data | ✅ 完成 |
| Step 2 | 地圖頁 + MapView | 🔄 進行中 |
| Step 2+ | 游標軌跡 + 地圖點擊特效 + 頁面轉場動畫 | ✅ 完成 |
| Step 2+ | Design System v2 方向確立（Acid/Y2K） | 🔄 設計優化中 |
| Step 3 | 景點詳情頁（Shell + 動畫已完成，內容補完中） | 🔄 進行中 |
| Step 4 | 滑卡片 + Guest mode | ⏳ 待開始 |
| Step 5 | NextAuth + 收藏同步 | ⏳ 待開始 |



 ## 知識庫使用

  當需要查詢我的日記或筆記時：
  1. 先閱讀 `~/Vault/查詢指南.md`
  2. 按照指南的路徑規則定位檔案

  當需要幫我撰寫日記時：
  1. 先閱讀 `~/Vault/撰寫指南.md`
  2. 按照指南的格式撰寫內容

  日記路徑範例：`~/Vault/日記/2026/03/2026-03-26.md`

  請注意知識庫位置是 Vault>專案>
