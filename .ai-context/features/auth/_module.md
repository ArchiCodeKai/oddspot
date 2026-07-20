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
    → setUserId(userId)
    → 若 localStorage 有 guest 收藏，先 POST /api/saved/sync 合併進 DB
    → 再 GET /api/saved，hydrateFromServer 把完整收藏載回 useSavedStore
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
3. 登入成功 → useAuthSync 設定 store.userId
4. 若有 guest 收藏 → POST /api/saved/sync 合併進 SavedSpot 表（忽略已存在的）
5. GET /api/saved → hydrateFromServer 把 DB 完整收藏載回 store
6. 此後 addSave / removeSave 會即時同步後端，不再需要一次性 sync
```

> 舊版在步驟 5 是 `clearAll()` 清空 localStorage，會導致登入後愛心全變空心、
> 且登入後的新收藏進不了 DB；已改為從 DB hydrate（見 `docs/04-狀態管理/guest-mode.md`）。

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

- 右上角設定 popover 第一層會顯示帳號捷徑：`/saved`、`/map` 今日行程、`/submissions`。
- `AuthButton.tsx` 拆成組件群：`GuestLoginButton`（未登入時 cluster 旁的登入按鈕，含 OAuth
  provider 下拉）、`UserAvatar` / `UserMenuIdentity`（頭像與身分列）、`LogoutMenuItem`、
  `AccountShortcutLinks`。右上角未登入顯示登入按鈕 + globe；登入後頭像取代 globe 成為選單觸發器。
- 投稿成功畫面增加「查看投稿狀態」入口。
