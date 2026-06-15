# 認證模組（Step 5）

## 狀態：功能完成，部署驗證待辦

目前已完成 NextAuth v5 基礎串接、Google / LINE OAuth provider、登入 UI、Guest saved spots 同步 API、個人收藏頁、我的投稿狀態頁與前端觸發。

部署前仍需確認：
- Google Cloud OAuth redirect URI
- LINE Developers Login Channel redirect URI
- Vercel Production / Preview 環境變數
- Prisma migrations 與 PostgreSQL provider 一致性
- Vercel Production / Preview 是否都有 `AUTH_*` 與資料庫 env

## NextAuth 5 架構

使用 `@auth/prisma-adapter`，Schema 已包含：
- `User`（含 emailVerified）
- `Account`（OAuth token）
- `Session`
- `VerificationToken`

## 目前資料流

```
layout.tsx
  → auth()
  → ClientAuthProvider(userId, userName, userEmail, userImage)
  → SessionProvider 提供 client-side user
  → useAuthSync(userId)
  → 若 localStorage 有 savedSpotIds，POST /api/saved/sync
```

## 待驗證 / 待補強清單

1. 確認 LINE / Google OAuth 在 Production domain 的 callback 正常。
2. 確認 `/api/saved/sync` 在部署資料庫上可正常寫入 `SavedSpot`。
3. `/saved` 與 `/submissions` 已由 Server Component 內的 `auth()` + `redirect("/map")` 保護；若未來登入限定頁變多，再建立 `src/middleware.ts` 集中保護。
4. Landing page 是否已登入自動導向 `/map` 目前不是必需，可視產品入口再決定。

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

## 已新增登入後入口

- Auth dropdown 的「已收藏」會導向 `/saved`。
- Auth dropdown 的「我的投稿」會導向 `/submissions`。
- 投稿成功畫面增加「查看投稿狀態」入口。
