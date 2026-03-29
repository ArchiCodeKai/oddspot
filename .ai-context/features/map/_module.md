# 地圖功能模組

## 元件結構

```
src/components/map/
  MapView.tsx      — 地圖容器，包含 APIProvider + Map
  SpotMarker.tsx   — 景點標記（AdvancedMarker，圓點）
  SpotPopup.tsx    — 點擊標記後的資訊卡
```

## 資料流

```
map/page.tsx
  → fetch /api/spots（使用者位置 + 半徑）
  → spots: SpotMapPoint[]
  → MapView（spots, userLocation）
      → SpotMarker × N
      → SpotPopup（selectedSpot）
```

## 分類顏色對應（SpotMarker）

```typescript
const CATEGORY_COLORS = {
  "weird-temple": "#f97316",      // 橘
  "abandoned": "#6b7280",          // 灰
  "giant-object": "#3b82f6",      // 藍
  "kitsch": "#ec4899",             // 粉
  "marginal-architecture": "#14b8a6", // 青
  "urban-legend": "#8b5cf6",      // 紫
  "absurd-landscape": "#22c55e",  // 綠
  "odd-shopfront": "#eab308",     // 黃
};
```

## 環境變數

```
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=  # 必填，否則地圖不顯示
```

## 已知限制

- 目前 map/page.tsx 用 fetch + useState，尚未升級 TanStack Query
- SpotPopup 的「查看詳情」連結到 /spots/[id]，該頁面是 Step 3 待實作的佔位符
- 地圖 mapId 目前用 "oddspot-map"，需要在 Google Maps Console 設定才有 AdvancedMarker 樣式

## TODO（Step 2 完成後）
- 升級 fetch 為 useQuery（TanStack React Query）
- 加入篩選器 UI（useMapStore.filters）
- 加入半徑選擇器
