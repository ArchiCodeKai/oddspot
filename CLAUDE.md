# OddSpot — AI 操作入口

## 重要：開始前必讀

本文件是 Claude Code 的操作原則入口。
詳細架構文件請依序閱讀：`.ai-context/README.md`

---

## Vibe Coding 操作原則

### 絕對禁止
- **不可執行任何 git 操作**（add / commit / push / pull / merge）
- **不可執行 `npm run dev`**（port 使用限制）
- **不可安裝新套件**，未經確認前禁止修改 `package.json`
- **不可修改全域設定檔**：`globals.css`、`tailwind.config`、`tsconfig.json`
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
| `.ai-context/global/visual-design.md` | 視覺設計規範（色彩、版型、UI 元件風格）|
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
| Step 3 | 景點詳情頁 | ⏳ 待開始 |
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
