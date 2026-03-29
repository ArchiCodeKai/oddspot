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
- `status`：三個值 `active` | `uncertain` | `disappeared`，**不是 `gone`**

## 景點分類（SpotCategory）

8 個分類，詳見 `src/lib/constants/categories.ts`：
`weird-temple` / `abandoned` / `giant-object` / `kitsch` /
`marginal-architecture` / `urban-legend` / `absurd-landscape` / `odd-shopfront`

## v1 圖片規則

- Seed data：`/public/spots/xxx.jpg`（本地靜態，佔位符）
- v2 用戶上傳：Cloudinary URL，格式相同（都是 URL 存入 images JSON）

## 景點詳情頁（Step 3 待實作）

路由：`/spots/[id]`
- 目前是佔位符
- 需要 API：`GET /api/spots/[id]`
- 詳細設計見：`docs/03-元件設計/spot-detail.md`
