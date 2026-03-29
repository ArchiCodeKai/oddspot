# 地圖元件設計

## 元件樹

```
map/page.tsx（Page，資料獲取層）
└── MapView（UI 容器）
    ├── APIProvider（@vis.gl/react-google-maps，包裝 Google Maps）
    ├── Map（地圖本體）
    │   └── SpotMarker × N（景點標記）
    └── SpotPopup（選中景點的資訊卡，絕對定位在地圖底部）
```

## MapView

**路徑**：`src/components/map/MapView.tsx`

Props：
```typescript
interface MapViewProps {
  spots: SpotMapPoint[];
  userLocation: { lat: number; lng: number } | null;
}
```

責任：
- 包裝 APIProvider 和 Map
- 管理 selectedSpot 狀態（控制 SpotPopup 顯示）
- 點擊地圖空白處 → 關閉 SpotPopup
- 點擊標記 → 切換選中景點

TODO：整合 useMapStore（目前 selectedSpot 在 local state）

## SpotMarker

**路徑**：`src/components/map/SpotMarker.tsx`

- 使用 `AdvancedMarker`（需要 mapId）
- 圓點大小：未選中 14px，選中 20px
- 顏色依 category 決定（8 色）
- 選中狀態：外發光效果

## SpotPopup

**路徑**：`src/components/map/SpotPopup.tsx`

- 絕對定位在地圖底部中央
- 顯示：分類標籤、名稱、狀態 badge、難度、查看詳情按鈕
- 「查看詳情」→ 連到 `/spots/[id]`（Step 3 待實作）

## 擴充指南

**加入篩選器**：
1. 在 `map/page.tsx` 加入篩選器 UI（下拉選單或 tag chips）
2. 從 `useMapStore` 讀取 `filters`
3. 將 `filters` 加入 API query string
4. API 已支援 `categories` 參數

**升級為 React Query**：
```typescript
const { data } = useQuery({
  queryKey: ["spots", lat, lng, radius, filters],
  queryFn: () => fetchSpots({ lat, lng, radius, ...filters }),
});
```
