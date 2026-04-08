# AI 讀取優先順序

Claude Code 每次工作前，請依照以下順序讀取文件：

## 必讀（每次工作前）
1. `CLAUDE.md` — 操作原則、禁止事項、進度狀態
2. `.ai-context/global/restrictions.md` — 禁止操作清單
3. `.ai-context/global/coding-standards.md` — 編碼規範

### 涉及 UI / 視覺設計時（必讀）
- `.ai-context/global/visual-design.md` — 色彩、版型、元件風格、2026 趨勢採用方向

## 依任務類型選讀

### 修改地圖相關
4. `.ai-context/features/map/_module.md`
5. `docs/03-元件設計/map-components.md`

### 修改景點 API 或資料
4. `.ai-context/features/spots/_module.md`
5. `docs/05-API設計/spots-api.md`
6. `docs/01-專案規劃/04-資料模型.md`

### 修改狀態管理
4. `.ai-context/global/state-management.md`
5. `docs/04-狀態管理/store-design.md`

### 修改滑卡片（Step 4）
4. `.ai-context/features/swipe/_module.md`
5. `docs/03-元件設計/swipe-ui.md`
6. `docs/04-狀態管理/guest-mode.md`

### 修改認證（Step 5）
4. `.ai-context/features/auth/_module.md`
5. `docs/05-API設計/saved-spots-api.md`

## 文件更新責任

每次完成功能後：
- 更新 `CLAUDE.md` 的「開發進度」表格
- 更新對應的 `.ai-context/features/` 模組文件
- 新增的 API/Store/元件要在對應的 `docs/` 文件補充
