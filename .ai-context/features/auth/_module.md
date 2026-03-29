# 認證模組（Step 5）

## 狀態：待實作

預計在 Step 5 實作，目前 schema 已預先補好必要欄位。

## NextAuth 5 架構

使用 `@auth/prisma-adapter`，Schema 已包含：
- `User`（含 emailVerified）
- `Account`（OAuth token）
- `Session`
- `VerificationToken`

## 待實作清單

1. 安裝 `@auth/prisma-adapter`
2. 建立 `src/auth.ts`（NextAuth 設定）
3. 建立 `src/app/api/auth/[...nextauth]/route.ts`
4. 設定 Google / GitHub OAuth provider
5. 建立 `src/middleware.ts`（保護 /profile 路由）
6. Landing page 加入 server-side auth check（已登入 → 導向 /map）
7. 建立 `/api/saved/sync`（Guest saves 同步）

## Guest → 登入的 Sync 流程

```
1. 用戶右滑收藏 → useSavedStore.addSave(id) → localStorage
2. 用戶點擊登入 → NextAuth OAuth
3. 登入成功 → 觸發 POST /api/saved/sync（body: savedSpotIds）
4. API 寫入 SavedSpot 表（忽略已存在的）
5. 前端呼叫 useSavedStore.clearAll()
```

## 環境變數（待填入）

```
NEXTAUTH_SECRET=
NEXTAUTH_URL=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```
