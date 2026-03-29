# Guest Mode 設計

## 概念

未登入用戶可以完整使用探索功能，收藏的景點存在 localStorage。
登入後自動同步到後端，不丟失收藏記錄。

## 資料流

```
[未登入狀態]
用戶右滑 / 點收藏
  → useSavedStore.addSave(spotId)
  → 存入 localStorage("oddspot-saved-spots")

[登入觸發]
NextAuth OAuth 登入成功
  → onSignIn callback（待實作）
  → 讀取 useSavedStore.savedSpotIds
  → POST /api/saved/sync { spotIds: [...] }
  → API 批次 upsert SavedSpot 表
  → useSavedStore.clearAll()

[登入後]
收藏資料從後端讀取（React Query）
前端 UI 顯示邏輯：
  - 未登入：查 useSavedStore.isSaved(id)
  - 已登入：查 React Query 快取
```

## Sync API 設計（Step 5 實作）

```typescript
// POST /api/saved/sync
// Body: { spotIds: string[] }
// 行為：批次 upsert，已存在的忽略（不報錯）
// Response: ApiResponse<{ synced: number }>
```

## 邊界情境

| 情境 | 處理方式 |
|------|----------|
| sync 失敗 | 保留 localStorage，下次登入再試 |
| 景點已被刪除 | API 跳過不存在的 spotId |
| 重複收藏 | SavedSpot @@unique 約束，upsert 忽略 |
| 未登入但 localStorage 空 | 正常顯示未收藏狀態 |

## UI 整合要點（Step 4）

收藏按鈕邏輯：
```typescript
// 未登入：使用 useSavedStore
// 已登入：使用 React Query mutation + API
const isSaved = session
  ? serverSavedIds.includes(spotId)  // 後端資料
  : useSavedStore.getState().isSaved(spotId); // localStorage
```
