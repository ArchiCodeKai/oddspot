# 投稿與公開景點安全精簡版設計

日期：2026-06-05

## 目標

本次只處理 A/B 的精簡版：

- A：修正公開景點列表的 P0/P1 風險，降低使用者在「投稿 → 地圖 → 探索」之間迷路的機率。
- B：強化投稿頁，支援照片選取壓縮與 Google Maps 文字貼上解析。

## 本次實作範圍

### 1. 公開景點列表不外洩待審核資料

`GET /api/spots` 是公開列表 API。使用者投稿會建立 `status: "pending"`，所以公開列表必須預設只顯示可公開狀態，且即使 query string 帶入 `pending` 也不能回傳。

公開允許狀態：

- `active`
- `uncertain`
- `disappeared`

### 2. Google Maps 貼上解析

投稿頁新增一個貼上欄位，支援精簡版解析：

- `25.0478, 121.5319`
- `https://www.google.com/maps/@25.0478,121.5319,17z`
- `https://www.google.com/maps?q=25.0478,121.5319`
- `https://www.google.com/maps?ll=25.0478,121.5319`

不在本次處理：

- `maps.app.goo.gl` 短網址展開
- Google Places API 自動補地址
- 從商家名稱直接 geocoding

### 3. 照片上傳精簡版

投稿頁支援使用者選取最多 3 張圖片，瀏覽器端壓縮後送到 `POST /api/spots`。

本次採用壓縮後的 data URL 存入 `images` JSON，理由是不用新增套件、雲端儲存服務或環境變數，能先驗證投稿 UX 與資料流。

限制：

- 最多 3 張
- 單張原始檔案上限 8MB
- 壓縮後單張 data URL 上限 500KB
- 只接受 `image/jpeg`、`image/png`、`image/webp`

後續正式版應改成物件儲存（Object Storage），例如 Cloudinary / S3 / Vercel Blob，避免資料庫長期膨脹。

## UX 調整

- 投稿頁把座標輸入改成「可以貼 Google Maps，也可以手填」。
- 照片欄位顯示壓縮狀態與預覽，讓使用者知道系統有處理圖片大小。
- 投稿成功文案維持「送出審核」，避免使用者誤以為會立刻公開。

## 測試策略

- Google Maps 貼上 parser 用 unit test 驗證支援格式與錯誤格式。
- 投稿驗證 schema 用 unit test 驗證圖片陣列數量、data URL 格式與大小上限。
- Spots 公開 API 用 source contract test 確認公開狀態白名單會排除 `pending`。
