# API 設計模式

## 回應格式

所有 API 統一使用 `ApiResponse<T>`：

```typescript
// src/types/api.ts
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}
```

## 標準回應寫法

```typescript
// 成功
return NextResponse.json<ApiResponse<T>>({ data: result, success: true });

// 失敗（4xx）
return NextResponse.json<ApiResponse<null>>(
  { data: null, success: false, error: "錯誤訊息" },
  { status: 400 }
);

// 伺服器錯誤（5xx）
return NextResponse.json<ApiResponse<null>>(
  { data: null, success: false, error: "查詢失敗" },
  { status: 500 }
);
```

## 現有 API Endpoints

| Endpoint | Method | 說明 | 狀態 |
|----------|--------|------|------|
| `/api/spots` | GET | 取得附近景點 | ✅ 完成 |
| `/api/spots/[id]` | GET | 取得單一景點詳情 | ⏳ Step 3 |
| `/api/saved` | GET/POST/DELETE | 收藏管理 | ⏳ Step 5 |
| `/api/saved/sync` | POST | Guest saves 同步 | ⏳ Step 5 |

## /api/spots 參數規格

```
GET /api/spots?lat={lat}&lng={lng}&radius={km}&categories={a,b}

lat: number（必填）
lng: number（必填）
radius: number（選填，預設 5，單位 km）
categories: string（選填，逗號分隔）
```

## Prisma Client 使用

永遠從 `@/lib/db` import，不直接 new PrismaClient：

```typescript
import { prisma } from "@/lib/db";
```

注意：Prisma 7 需要 better-sqlite3 adapter，已封裝在 `db.ts` 中。
