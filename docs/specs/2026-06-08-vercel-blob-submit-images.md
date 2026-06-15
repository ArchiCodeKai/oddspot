# Vercel Blob 投稿照片儲存

## 目標

把投稿照片從「壓縮 data URL 存入 DB」改成「壓縮後上傳 Vercel Blob，DB 只存公開 URL」。

## 決策

- Blob store：Vercel Blob public store，region `hkg1`
- Env：`BLOB_READ_WRITE_TOKEN`
- 上傳路由：`POST /api/uploads/spots`
- 投稿路由：`POST /api/spots` 優先接收 `imageUrls`
- 相容性：`imageDataUrls` 與單張 `imageUrl` 暫時保留 fallback

## 資料流

1. `/submit` 選取最多 3 張圖片。
2. 前端用 Canvas 壓縮圖片。
3. 使用者按送出後，前端把壓縮後圖片送到 `/api/uploads/spots`。
4. `/api/uploads/spots` 檢查登入、MIME 類型、大小，並上傳 Vercel Blob。
5. Blob 回傳公開 URL。
6. `/submit` 把 `imageUrls` 送進 `/api/spots`。
7. `/api/spots` 建立 `status: "pending"` 景點，審核前不公開。

## 限制

- 單張壓縮後上限 600KB。
- 只接受 `image/jpeg` / `image/png` / `image/webp`。
- 目前未做刪除未使用 Blob 的清理工作；若未來使用者上傳成功但 `/api/spots` 失敗，可能留下孤兒圖片。
- 500 人內 MVP 可接受；正式產品可再補排程清理或 admin 刪除時同步刪 Blob。

## 驗證

- `node --test tests/services/submitContracts.test.mjs`
- `node --test tests/components/*.test.mjs tests/services/*.test.mjs tests/store/*.test.mjs`
- `npm run build`
