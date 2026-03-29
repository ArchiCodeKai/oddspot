# 收藏 API 設計（Step 5）

## 狀態：待實作

以下為設計規格，Step 5 實作時依此開發。

## GET /api/saved

取得目前登入用戶的收藏清單。

```typescript
// 需要 NextAuth session
// Response: ApiResponse<{ spotId: string; savedAt: Date }[]>
```

## POST /api/saved

新增收藏（登入後）。

```typescript
// Body: { spotId: string }
// Response: ApiResponse<{ id: string }>
// 重複收藏不報錯（upsert）
```

## DELETE /api/saved/[spotId]

移除收藏。

```typescript
// 需要 NextAuth session
// Response: ApiResponse<{ removed: boolean }>
```

## POST /api/saved/sync

Guest mode 同步（登入後一次性呼叫）。

```typescript
// Body: { spotIds: string[] }
// 行為：批次 upsert，已存在的忽略
// Response: ApiResponse<{ synced: number }>
```

## 認證保護

所有 /api/saved/* 需要驗證 session：

```typescript
import { auth } from "@/auth";
const session = await auth();
if (!session?.user?.id) {
  return NextResponse.json({ data: null, success: false, error: "未登入" }, { status: 401 });
}
```
