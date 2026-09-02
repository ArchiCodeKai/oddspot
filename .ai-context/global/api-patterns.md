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
| `/api/spots` | POST | 投稿新景點，建立 pending | ✅ 完成 |
| `/api/uploads/spots` | POST | 投稿照片上傳到 Vercel Blob | ✅ 完成 |
| `/api/maps/resolve` | POST | 解析 Google Maps 手機分享短網址座標 | ✅ 完成 |
| `/api/spots/[id]` | GET | 取得單一景點詳情 | ✅ 完成 |
| `/api/saved` | GET/POST | 收藏管理 | ✅ 完成 |
| `/api/saved/[spotId]` | DELETE | 移除收藏 | ✅ 完成 |
| `/api/saved/sync` | POST | Guest saves 同步 | ✅ 完成 |
| `/api/admin/spots` | GET | 取得 pending 投稿 | ✅ 第一版完成 |
| `/api/admin/spots/[id]` | PATCH | approve / reject 投稿 | ✅ 第一版完成 |
| `/api/admin/cleanup` | GET / POST | 過期 pending 查數 / 清理（admin） | ✅ 完成 |

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

注意：Prisma 7 目前使用 `@prisma/adapter-pg`，`db.ts` 會透過 `DATABASE_URL` 建立 PostgreSQL 連線。
