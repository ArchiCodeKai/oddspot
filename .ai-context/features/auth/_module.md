# 認證模組（Step 5）

## 狀態：部分完成

目前已完成 NextAuth v5 基礎串接、Google / LINE OAuth provider、登入 UI、Guest saved spots 同步 API 與前端觸發。

部署前仍需確認：
- Google Cloud OAuth redirect URI
- LINE Developers Login Channel redirect URI
- Vercel Production / Preview 環境變數
- Prisma migrations 與 PostgreSQL provider 一致性

## NextAuth 5 架構

使用 `@auth/prisma-adapter`，Schema 已包含：
- `User`（含 emailVerified）
- `Account`（OAuth token）
- `Session`
- `VerificationToken`

## 待實作清單

1. 建立 `src/middleware.ts`（保護需登入路由，如 /profile）
2. Landing page 加入 server-side auth check（已登入 → 導向 /map）
3. 確認 LINE / Google OAuth 在 Production domain 的 callback 正常
4. 確認 `/api/saved/sync` 在部署資料庫上可正常寫入 SavedSpot

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
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
AUTH_LINE_ID=
AUTH_LINE_SECRET=
```

## OAuth Callback URL

本地開發：
```
http://localhost:3000/api/auth/callback/google
http://localhost:3000/api/auth/callback/line
```

Vercel 部署後：
```
https://your-domain.vercel.app/api/auth/callback/google
https://your-domain.vercel.app/api/auth/callback/line
```
