# 收藏 API 設計（Step 5）

最後更新：2026-06-08

## 狀態：已實作

相關檔案：

```
src/app/api/saved/route.ts
src/app/api/saved/[spotId]/route.ts
src/app/api/saved/sync/route.ts
src/hooks/useAuthSync.ts
src/components/auth/ClientAuthProvider.tsx
src/app/saved/page.tsx
src/components/saved/SavedSpotActions.tsx
```

## GET /api/saved

取得目前登入使用者的收藏清單。

```typescript
// 需要 NextAuth session
// Response: ApiResponse<{ spotId: string; savedAt: Date }[]>
```

行為：
- 未登入回傳 401。
- 依 `createdAt desc` 排序。
- 回傳欄位為 `{ spotId, savedAt }`，其中 `savedAt` 來自 `SavedSpot.createdAt`。

## POST /api/saved

新增收藏。

```typescript
// Body: { spotId: string }
// Response: ApiResponse<{ id: string }>
```

行為：
- 需要登入。
- 使用 `saveSpotSchema` 驗證 body。
- 使用 `upsert`，重複收藏不報錯。

## DELETE /api/saved/[spotId]

移除收藏。

```typescript
// 需要 NextAuth session
// Response: ApiResponse<{ removed: boolean }>
```

行為：
- 需要登入。
- 使用 `cuidSchema` 驗證 `spotId`。
- 使用 `deleteMany`，即使本來不存在也回傳 `{ removed: true }`。

## POST /api/saved/sync

Guest mode 同步。登入後由 `useAuthSync(userId)` 自動觸發。

```typescript
// Body: { spotIds: string[] }
// Response: ApiResponse<{ synced: number }>
```

行為：
- 需要登入。
- 使用 `syncSavedSchema` 驗證 body。
- 對每個 `spotId` 逐筆 `upsert`。
- 單筆失敗會記 log，不中斷整批同步。
- 前端收到 `success: true` 後呼叫 `useSavedStore.clearAll()` 清空 localStorage。

## 認證保護

所有 `/api/saved/*` 需要驗證 session：

```typescript
import { auth } from "@/auth";

const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json(
    { data: null, success: false, error: "未登入" },
    { status: 401 }
  );
}
```

## 下一步

- `/saved` 已新增個人收藏頁，直接以 Server Component 查 `SavedSpot` + `Spot`，並提供移除收藏、加入今日行程、進入詳情頁。
- 若登入後要即時顯示後端收藏狀態，建議接 React Query 或 SWR 快取，避免多個元件各自打 API。
- 目前 sync 逐筆 `upsert` 對小量收藏足夠；若未來收藏數量變大，可改成批次交易或 `createMany({ skipDuplicates: true })`。
