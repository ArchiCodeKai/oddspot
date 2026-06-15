# 景點詳情頁設計（Step 3）

最後更新：2026-06-08

## 狀態：第一版已完成

路由：`/spots/[id]`

目前頁面由 Server Component 直接查 Prisma：

```
src/app/spots/[id]/page.tsx
```

API 也已存在，可供其他前端資料流使用：

```
GET /api/spots/[id]
src/app/api/spots/[id]/route.ts
```

## 目前頁面區塊

### Hero 區

- 第一張圖片作為 cover image。
- 無圖片時改用 category glyph placeholder。
- 有 CRT scanline 與底部漸層遮罩，接到內容區。

### 基本資訊

- 中文名稱。
- 英文名稱（如有）。
- 分類 badge。
- 狀態 badge。
- 難度文字。
- 地址。

### 描述

- `description`。
- `legend`（如有）。
- `recommendedTime`（如有）。

### 行動按鈕

由 `src/components/spots/SpotActionBar.tsx` 負責：

- 收藏。
- 一鍵導航。

## API 設計

```typescript
// GET /api/spots/[id]
// Response: ApiResponse<Spot>
```

實作要點：

- 使用 `cuidSchema` 驗證 id。
- 找不到 spot 回傳 404。
- `images` 保持 JSON string，前端自行 parse。

## 下一步可補強

- 圖片牆：最多 3 張投稿照片，桌機 / 手機都要有穩定尺寸。
- 查詢 / 造訪數、推薦時段、GPS、外部 Google Maps link 的資訊密度可再優化。
- 「加入今日行程」入口可與 RoutePlannerStore 整合。
- 若照片來自 Vercel Blob，未來可補 blur placeholder 或固定 aspect-ratio，避免圖片載入造成版面跳動。
- v2 才做「我已到達」打卡、使用者照片牆、檢舉與回報。
