# Guest Mode 設計

最後更新：2026-06-29

## 概念

未登入使用者可以完整使用探索功能，收藏的景點先存在 localStorage。
登入後自動同步到後端，不丟失收藏記錄。

收藏的單一 source of truth 是 `useSavedStore`；「要不要寫後端」由 store 內部依登入狀態決定，
所有入口（地圖 popup、滑卡、詳情頁）只呼叫 `addSave` / `removeSave`，不各自判斷。

## 目前資料流

```
[未登入狀態（store.userId === null）]
使用者按中間 + / 打勾 / 右滑收藏
  → useSavedStore.addSave(spotId)
  → 只存入 localStorage("oddspot-saved-spots")

[登入後（store.userId 已設定）]
useSavedStore.addSave / removeSave
  → 先樂觀更新本地 state（UI 即時反映）
  → 同步打 POST /api/saved 或 DELETE /api/saved/[spotId]
  → API 失敗時自動還原本地 state（rollback）

[登入當下：合併 + hydrate]
layout.tsx → auth() → ClientAuthProvider(userId) → useAuthSync(userId)
  → setUserId(userId)
  → 若 localStorage 有 guest 收藏，先 POST /api/saved/sync 合併進 DB
  → 再 GET /api/saved，hydrateFromServer 把 DB 完整收藏載回 store
  （取代舊版「sync 成功後 clearAll 清空」，避免登入後愛心全變空心）

[登出（先前已登入 → 現在未登入）]
useAuthSync → clearAll() 清掉 DB 快取，避免外洩給下一個 guest
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
| sync 失敗 | `syncedRef` 重設、允許下次重試；localStorage guest 收藏保留 |
| 登入後寫後端失敗 | 樂觀更新自動還原（rollback）並 `console.error` |
| 景點已被刪除 | DB 外鍵約束擋下；單筆 upsert 失敗記 log，不阻斷其他 spot |
| 重複收藏 | SavedSpot `@@unique([userId, spotId])` + upsert（冪等）|
| 未登入但 localStorage 空 | 不觸發 sync |
| 初次 guest 載入 | 不清快取，保留 guest 自己的 localStorage（用 `prevUserIdRef` 區分初次 mount 與登出）|
| 真正登出 | `clearAll()` 清掉 DB 快取，避免下一個 guest 看到上一位的收藏 |

## UI 整合要點

目前滑卡片邏輯：

```typescript
// 叉叉 / 左滑：略過
// 中間 +：只收藏
// 打勾 / 右滑：收藏並加入今日行程
```

收藏狀態統一由 `useSavedStore.savedSpotIds` 提供：未登入時是 localStorage，登入後由 `hydrateFromServer` 從 DB 載入。
元件一律用 reactive selector 讀取（例如 `useSavedStore((s) => s.savedSpotIds.includes(id))`），
就能在 hydrate / 樂觀更新後即時反映，不需各自判斷 localStorage / server source。

## 下一步

- 個人收藏頁：讓使用者知道收藏後去哪裡找。
- 收藏 picker：RouteSheet 目前可從當前地圖範圍內收藏挑選，未來可改成完整 saved list。
- 若要支援大量收藏，sync API 可從逐筆 upsert 改成批次寫入。
