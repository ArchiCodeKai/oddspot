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
