# Guest Mode 設計

最後更新：2026-06-08

## 概念

未登入使用者可以完整使用探索功能，收藏的景點先存在 localStorage。
登入後自動同步到後端，不丟失收藏記錄。

## 目前資料流

```
[未登入狀態]
使用者按中間 + / 打勾 / 右滑收藏
  → useSavedStore.addSave(spotId)
  → 存入 localStorage("oddspot-saved-spots")

[登入成功後]
layout.tsx
  → auth()
  → ClientAuthProvider(userId)
  → useAuthSync(userId)
  → 讀取 useSavedStore.savedSpotIds
  → POST /api/saved/sync { spotIds: [...] }
  → API 批次 upsert SavedSpot 表
  → sync 成功後 useSavedStore.clearAll()

[登入後]
後端收藏資料由 /api/saved 提供
```

## Sync API

```typescript
// POST /api/saved/sync
// Body: { spotIds: string[] }
// 行為：逐筆 upsert，已存在的忽略（不報錯）
// Response: ApiResponse<{ synced: number }>
```

## 邊界情境

| 情境 | 處理方式 |
|------|----------|
| sync 失敗 | 保留 localStorage，下次登入再試 |
| 景點已被刪除 | 目前單筆 upsert 會失敗並記 log；不阻斷其他 spot |
| 重複收藏 | SavedSpot `@@unique([userId, spotId])` + upsert |
| 未登入但 localStorage 空 | 不觸發 sync |
| 已登入且 localStorage 有收藏 | `useAuthSync` 一次性同步，成功後清空 |

## UI 整合要點

目前滑卡片邏輯：

```typescript
// 叉叉 / 左滑：略過
// 中間 +：只收藏
// 打勾 / 右滑：收藏並加入今日行程
```

未登入時先用 `useSavedStore` 顯示收藏狀態。若後續要讓登入後 UI 也即時反映後端收藏，建議統一做一層 `useSavedSpotsQuery`，不要讓每個元件各自判斷 localStorage / server source。

## 下一步

- 個人收藏頁：讓使用者知道收藏後去哪裡找。
- 收藏 picker：RouteSheet 目前可從當前地圖範圍內收藏挑選，未來可改成完整 saved list。
- 若要支援大量收藏，sync API 可從逐筆 upsert 改成批次寫入。
