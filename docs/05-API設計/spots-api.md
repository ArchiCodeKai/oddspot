# Spots API 設計

## GET /api/spots

已實作（`src/app/api/spots/route.ts`）

### 參數

| 參數 | 必填 | 型別 | 預設值 | 說明 |
|------|------|------|--------|------|
| lat | ✅ | number | — | 緯度 |
| lng | ✅ | number | — | 經度 |
| radius | ❌ | number | 5 | 半徑（公里）|
| bbox | ❌ | string | — | `west,south,east,north` viewport 查詢，優先於 radius |
| categories | ❌ | string | — | 逗號分隔的分類篩選 |
| status | ❌ | string | active / uncertain / disappeared | 逗號分隔狀態；公開 API 只允許公開白名單，會排除 `pending` / `rejected` |
| difficulty | ❌ | string | — | 逗號分隔難度篩選 |

### 回應

```typescript
ApiResponse<{ spots: SpotMapPoint[]; nextCursor: string | null }>
// SpotMapPoint: { id, name, nameEn, category, status, difficulty, lat, lng, coverImage, images?, address?, visitCount? }
```

### 篩選邏輯

使用 bounding box 近似圓形搜尋（非精確圓形，效能較佳）：

```
latDelta = radius / 111
lngDelta = radius / (111 * cos(lat))
```

### 公開狀態白名單

`GET /api/spots` 是公開列表 API。使用者投稿會先建立 `status: "pending"`，公開列表一律只回傳：

- `active`
- `uncertain`
- `disappeared`

即使 query string 帶入 `status=pending` 或 `status=rejected`，也不會回傳待審核 / 已拒絕景點。

## POST /api/spots

已實作（`src/app/api/spots/route.ts`），需登入。

### Body

| 欄位 | 必填 | 型別 | 說明 |
|------|------|------|------|
| name | ✅ | string | 景點名稱 |
| category | ✅ | string | 8 個景點分類之一 |
| lat / lng | ✅ | number | 座標 |
| difficulty | ❌ | easy / medium / hard | 預設 `easy` |
| imageUrls | ❌ | string[] | Vercel Blob 圖片公開 URL，最多 3 張 |
| imageDataUrls | ❌ | string[] | 舊版相容欄位，最多 3 張壓縮 data URL |
| imageUrl | ❌ | string | 舊版相容欄位，只接受 HTTPS |

投稿成功後會建立 `status: "pending"`，審核通過前不會出現在公開列表。

### 防濫用

- 需要登入。
- 每位使用者有 burst rate limit，避免短時間大量 POST。
- 每位使用者每日投稿上限目前為 5 筆，使用台北日界線計算。
- 新投稿會檢查同名或約 80m 內近座標景點；命中時回傳 `409`，提醒可能已存在。

## POST /api/uploads/spots

已實作（`src/app/api/uploads/spots/route.ts`），需登入。

### 用途

投稿頁先用 Canvas 壓縮圖片，再把壓縮後檔案用 `multipart/form-data` 上傳到此 endpoint。

### 規則

- 需要 `BLOB_READ_WRITE_TOKEN`
- 只接受 `image/jpeg` / `image/png` / `image/webp`
- 壓縮後單張上限 600KB
- 每位使用者有短時間上傳限制與每日 15 張上限（目前為 server memory MVP）
- 上傳到 Vercel Blob public store
- 回傳 `{ url, pathname }`

### 回應

```typescript
ApiResponse<{ url: string; pathname: string }>
```

### 投稿頁輔助

`/submit` 以「貼上 Google Maps 連結或座標」作為主要位置輸入。使用者貼上後會即時解析座標、自動帶入 `lat` / `lng`，並顯示「已讀取座標：lat, lng」。解析成功後才會 lazy load 小型 Mapbox 預覽，自動定位到該座標；pin 固定在預覽框中心，使用者拖曳底圖後會用地圖中心點同步更新 `lat` / `lng`。預覽地圖支援桌機滑鼠滾輪縮放與手機 / 平板雙指縮放，縮放後會維持目前 zoom，範圍限制在 `13` 到 `16`：`16` 是初始大小與最大 zoom in，`13` 允許使用者往外看更大範圍；旋轉、傾斜與雙擊縮放維持關閉。欄位右側的「復位」按鈕可回到第一次解析出的原始座標，並把預覽地圖縮放恢復到初始 `16`。手動經緯度欄位保留在「進階座標」收合區。

目前支援：

- `25.0478, 121.5319`
- `https://www.google.com/maps/@25.0478,121.5319,17z`
- `https://www.google.com/maps?q=25.0478,121.5319`
- `https://www.google.com/maps?ll=25.0478,121.5319`
- `https://www.google.com/maps/place/...!3d25.0478!4d121.5319`
- `https://maps.app.goo.gl/...` 手機分享短網址

手機分享短網址會透過 `POST /api/maps/resolve` 由後端追蹤 Google Maps redirect 後解析座標。

## POST /api/maps/resolve

已實作（`src/app/api/maps/resolve/route.ts`），需登入。

### 用途

解析手機 Google Maps 分享出來的 `maps.app.goo.gl` 短網址，回傳座標供 `/submit` 自動帶入。

### 規則

- 需要登入。
- 有短時間 rate limit。
- 只接受 Google Maps 相關白名單網域 redirect。
- 最多追蹤 5 次 redirect。
- 不回傳 HTML 或完整網頁內容，只回傳座標或錯誤訊息。

### 回應

```typescript
ApiResponse<{ lat: number; lng: number }>
```

## GET /api/spots/[id]

已實作（`src/app/api/spots/[id]/route.ts`）。

### 回應

```typescript
ApiResponse<Spot>
// Spot: 完整欄位，包含 description, images, legend 等
```

### 實作要點

- 如果 spotId 不存在，回傳 404
- images 保持 JSON string 格式（前端自行 parse）

## Admin API

### GET /api/admin/spots

已實作（`src/app/api/admin/spots/route.ts`），需 admin 權限。

用途：取得所有 `status: "pending"` 的投稿景點，供 `/admin` 審核頁使用。

### PATCH /api/admin/spots/[id]

已實作（`src/app/api/admin/spots/[id]/route.ts`），需 admin 權限。

Body：

```typescript
{ action: "approve" | "reject" }
```

行為：
- `approve`：將 spot 更新為 `status: "active"`，並清掉 `expiresAt`。
- `reject`：刪除該 spot 的 Blob 圖片、清空 `images`，並將 spot 更新為 `status: "rejected"`，讓使用者可以在「我的投稿狀態」看到結果。

已知限制：
- 目前沒有 reject reason；使用者只能看到 rejected 狀態。

### GET /api/admin/health

已實作，需 admin 權限。

用途：Production 驗證用，檢查 env 是否缺漏、DB 是否可 query，並回傳 Google / LINE OAuth callback URL 供後台核對。此 API 不回傳 secret 值。

### POST /api/admin/blob-smoke

已實作，需 admin 權限。

用途：Vercel Blob smoke test。會建立一個 `health/blob-smoke-*.txt`，成功後立即刪除，用來確認 `BLOB_READ_WRITE_TOKEN` 與 Blob store 權限可用。

## 未來 API（v2）

| Endpoint | 說明 |
|----------|------|
| `POST /api/spots/[id]/visit` | 到訪驗證打卡 |
| `GET /api/spots/[id]/visits` | 取得該景點到訪紀錄 |
| `POST /api/spots/[id]/report` | 檢舉或回報景點狀態 |
| `GET /api/me/submissions` | 目前先用 `/submissions` Server Component 直接查詢；若未來要 SPA 快取再補 API |
| `POST /api/uploads/cleanup` | 清理未綁定 spot 的 Blob 圖片（可改成排程任務） |
