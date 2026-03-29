# Spots API 設計

## GET /api/spots

已實作（`src/app/api/spots/route.ts`）

### 參數

| 參數 | 必填 | 型別 | 預設值 | 說明 |
|------|------|------|--------|------|
| lat | ✅ | number | — | 緯度 |
| lng | ✅ | number | — | 經度 |
| radius | ❌ | number | 5 | 半徑（公里）|
| categories | ❌ | string | — | 逗號分隔的分類篩選 |

### 回應

```typescript
ApiResponse<SpotMapPoint[]>
// SpotMapPoint: { id, name, nameEn, category, status, difficulty, lat, lng, coverImage }
```

### 篩選邏輯

使用 bounding box 近似圓形搜尋（非精確圓形，效能較佳）：

```
latDelta = radius / 111
lngDelta = radius / (111 * cos(lat))
```

## GET /api/spots/[id]（Step 3 待實作）

### 回應

```typescript
ApiResponse<Spot>
// Spot: 完整欄位，包含 description, images, legend 等
```

### 實作要點

- 如果 spotId 不存在，回傳 404
- images 保持 JSON string 格式（前端自行 parse）

## 未來 API（v2）

| Endpoint | 說明 |
|----------|------|
| `POST /api/spots/[id]/visit` | 到訪驗證打卡 |
| `GET /api/spots/[id]/visits` | 取得該景點到訪紀錄 |
