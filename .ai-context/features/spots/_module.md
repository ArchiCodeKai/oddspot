# 景點功能模組

## 資料模型

`SpotMapPoint`（地圖用，輕量）：
```typescript
{ id, name, nameEn, category, status, difficulty, lat, lng, coverImage }
```

`Spot`（詳情頁用，完整）：
```typescript
{ ...SpotMapPoint, description, descriptionEn, address,
  images, rating, visitCount, lastVerifiedAt, recommendedTime, legend }
```

## 注意事項

- `images` 欄位是 JSON string：`'["url1","url2"]'`，讀取需 `JSON.parse()`
- `coverImage` = `JSON.parse(images)[0]`，無額外欄位
- `rating` / `visitCount`：v1 UI 不顯示，欄位保留供 v2 使用
- `status`：公開狀態為 `active` | `uncertain` | `disappeared`，審核狀態為 `pending` | `rejected`；公開 `GET /api/spots` 只允許公開白名單，不會回傳 `pending` / `rejected`

## 景點分類（SpotCategory）

8 個分類，詳見 `src/lib/constants/categories.ts`：
`religious-site` / `peculiar-place` / `giant-object` / `modern-ruins` /
`urban-legend` / `curiosity-shop` / `graffiti` / `living-landmark`

## 投稿與圖片規則

- Seed data：`/public/spots/xxx.jpg`（本地靜態，佔位符）
- 投稿正式版：`/submit` 可選最多 3 張照片，前端用 Canvas 壓縮後先送 `/api/uploads/spots`
- `/api/uploads/spots` 需登入，會檢查 `image/jpeg` / `image/png` / `image/webp` 與壓縮後 600KB 上限，再用 Vercel Blob 儲存公開圖片
- `POST /api/spots` 優先接收 `imageUrls` 並寫入 `images` JSON；舊版 `imageDataUrls` 與單張 HTTPS `imageUrl` 只作相容 fallback
- Vercel Blob 需要 `BLOB_READ_WRITE_TOKEN`，此 env 只能在 server 使用，不可加 `NEXT_PUBLIC_`
- `/api/uploads/spots` 已加 burst rate limit 與每日上傳上限；目前是 server memory MVP，未來高流量時可改 Upstash Redis 或 DB log
- `POST /api/spots` 已加每人每日投稿上限與同名 / 近座標 duplicate check

> 目前使用者表示先暫停照片送出功能的後續擴充；已完成的 Blob upload 仍保留在程式碼與 API 中，但下一步優先修 UX / 安全 / 流程收斂。

## 投稿座標輔助

- `/submit` 支援 Google Maps 貼上解析，位置：`src/lib/submit/googleMapsPaste.ts`
- 投稿表單已把「貼上 Google Maps 連結或座標」放在表單最上方，作為主要位置輸入。
- 使用者貼上後會即時解析並自動帶入 `lat` / `lng`，成功訊息格式為「已讀取座標：lat, lng」。
- 手動經緯度欄位已收進「進階座標」，預設收合，保留給解析失敗或進階使用者。
- 解析成功後會顯示小型位置預覽 pin，讓使用者確認座標已被讀取。
- 目前支援 `lat,lng`、`@lat,lng`、`q=lat,lng`、`ll=lat,lng`、`!3dlat!4dlng`
- `maps.app.goo.gl` 短網址暫不展開，避免精簡版需要外部網路解析

## 景點詳情頁（Step 3 進行中）

路由：`/spots/[id]`
API：`GET /api/spots/[id]`（已實作）

### 元件結構
```
src/app/spots/[id]/page.tsx       — Server Component，fetch 資料
src/components/spots/SpotDetailShell.tsx  — Client 外殼，管理返回動畫
```

### 頁面進場動畫
- `PageTransition`（`src/components/providers/PageTransition.tsx`）掛在 `layout.tsx`
- 景點詳情頁：從下方升起（`y: 56 → 0`，`scale: 0.98 → 1`，duration 0.38s）
- `SpotDetailShell` 管理離場動畫（按鈕先行向左淡出，頁面再向下滑出）

詳細設計見：`docs/03-元件設計/spot-detail.md`

## Admin 審核

已實作第一版：

```
src/app/admin/page.tsx
src/app/api/admin/spots/route.ts
src/app/api/admin/spots/[id]/route.ts
```

- `GET /api/admin/spots`：只回傳 `status: "pending"` 的景點。
- `PATCH /api/admin/spots/[id]`：
  - `approve`：把 spot 狀態改成 `active`，並清掉 `expiresAt`。
  - `reject`：刪除 Vercel Blob 圖片、把 spot 改成 `rejected`，並清空 `images`，讓使用者仍可在「我的投稿狀態」看到結果。
- 權限透過 `isAdminSession(session)` 檢查。

## Production 驗證

已新增 admin-only 檢查 API：

```
src/app/api/admin/health/route.ts
src/app/api/admin/blob-smoke/route.ts
```

- `/api/admin/health`：檢查 env 是否缺漏、DB 是否可 query，並回傳 Google / LINE OAuth callback URL 提示；不回傳 secret 值。
- `/api/admin/blob-smoke`：寫入一個暫時 Blob 後立即刪除，用於確認 `BLOB_READ_WRITE_TOKEN` 與 Blob store 可用。
- `/admin` 頁已提供兩個按鈕觸發上述檢查。

## 下一步缺口

### P0 / P1

- Production env / OAuth callback / Blob smoke test 已有 admin 檢查入口；正式 deploy 後仍要在 Vercel production 實際跑一次。
- `/api/uploads/spots` 已限制 MIME type 與 600KB，但仍要補更明確的失敗 UI 與重試行為。
- 防濫用目前是 MVP：投稿每日上限用 DB count，上傳每日上限用 server memory。若使用者變多，應改成 Redis / DB upload log。
- 缺少 reject reason；目前只有 `rejected` 狀態，尚未提供細節原因。

### P2 / 未來擴充

- 照片牆 / 到訪驗證 / 檢舉機制。
- 週期性清理未綁定 spot 的 Blob 檔。
- 投稿審核保留 reject reason，而不是直接刪除所有紀錄。
