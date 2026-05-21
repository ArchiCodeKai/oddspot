# 地圖元件設計

> **改造中**：Google Maps → Mapbox 路線 A 改造規劃完成，待實作。
> 完整規格見 `docs/specs/2026-05-06-map-route-a-acid-redesign.md`。

## 元件樹（改造後）

```
map/page.tsx（Page，資料獲取層）
└── MapView（react-map-gl 容器）
    ├── Mapbox <Map>（地圖本體，吃 4 themes JSON style）
    │   ├── SpotMarker × N            ← 景點標記（圓點）
    │   ├── RoutePolyline             ← 路線繪製
    │   └── RouteWaypointMarker × N   ← 編號 marker
    ├── SpotPopup                     ← 選中景點資訊卡（絕對定位）
    ├── LocateMeButton                ← 右下角定位按鈕
    ├── RouteSheet                    ← 底部路線規劃 sheet
    └── ExternalNavSheet              ← 「開始導航」app 選擇 sheet
```

## MapView

**路徑**：`src/components/map/MapView.tsx`

Props（改造後維持不變）：
```typescript
interface MapViewProps {
  spots: SpotMapPoint[];
  userLocation: { lat: number; lng: number } | null;
  radius: number;
  onExpandRadius?: () => void;
  isError?: boolean;
  onRetry?: () => void;
}
```

責任：
- 包裝 react-map-gl `<Map>`
- 依 `useThemeStore` 的當前主題動態載入對應 mapbox-style JSON
- 管理 selectedSpot 狀態（控制 SpotPopup 顯示）
- 點擊地圖空白處 → 關閉 SpotPopup
- 點擊標記 → 切換選中景點

**重要**：改造後**移除** `DARK_MAP_FILTER` CSS filter hack，地圖本體直接是深色。

TODO：整合 useMapStore（目前 selectedSpot 在 local state）

## SpotMarker

**路徑**：`src/components/map/SpotMarker.tsx`

- 使用 react-map-gl 的 `<Marker>`（不再是 AdvancedMarker）
- 圓點大小：未選中 14px，選中 20px
- 顏色：主題色 `var(--accent)`，隨 theme 切換變化（早期規劃 8 色 category 已停用）
- 選中狀態：`box-shadow: 0 0 12px var(--accent)`
- **Stage 5 升級目標**：mini wireframe 球（SVG 橢圓堆疊），跟 landing globe 同視覺語言

## SpotPopup

**路徑**：`src/components/map/SpotPopup.tsx`

- 絕對定位在地圖底部中央（不變）
- 顯示：分類標籤、名稱、狀態 badge、難度、查看詳情按鈕
- 改造後**新增**：「加入路線」按鈕 → `useRoutePlannerStore.addSpot(spot)`
- 「查看詳情」→ 連到 `/spots/[id]`

## LocateMeButton（新元件）

**路徑**：`src/components/map/LocateMeButton.tsx`

- 位置：右下角 absolute（避開 RouteSheet 展開區域）
- 大小：44×44px（符合 design-direction-v2 第 138 行 44px touch target）
- 邊框：1px `var(--line-strong)`
- 背景：`var(--panel-glass)`
- border-radius: 2px（acid 硬角）
- 圖示：SVG 十字準星，14×14, stroke 1px `var(--accent)`

行為：
- 點擊 → `navigator.geolocation.getCurrentPosition`
- 成功 → `map.flyTo({ center: [lng, lat], zoom: 16, duration: 800 })`
- 1.5s acid 提示：「LOCATED · {lat}, {lng}」
- 拒絕授權 → 「PERMISSION DENIED · 開啟系統設定 > 定位」
- 取得失敗 → 「ERR_GPS · 訊號失蹤」

## RouteSheet（新元件）

**路徑**：`src/components/map/RouteSheet.tsx`

從下方滑上來的 bottom sheet，最大高度 60vh。

結構：
```
┌─────────────────────────────────────┐
│ ━━━━ (拉手條，兩側貼 barcode)         │
│ archive://route · FORM_ROUTE         │
├─────────────────────────────────────┤
│ 01 [景點名稱]                    ✕  │
│ 02 [景點名稱]                    ✕  │
│ 03 [景點名稱]                    ✕  │
│                                      │
│ + 從地圖選 · + 從收藏選              │
├─────────────────────────────────────┤
│ TOTAL DIST: 12.4km · EST: 28min     │
│ OPTIMIZED ✓                          │
├─────────────────────────────────────┤
│ [ START / 開始導航 ]                 │
└─────────────────────────────────────┘
```

設計細節：
- border-radius: 2px（不是 16px）
- 拉手條：4×40px，1px 外框，兩側貼 acid barcode sticker
- 「OPTIMIZED ✓」當 Mapbox 回傳順序 ≠ 使用者輸入順序時顯示
- 1–5 個 waypoint 限制（含使用者位置自動加為起點 spot 0，所以使用者最多選 4 個）

讀取 `useRoutePlannerStore` state，呼叫 `optimize()` 觸發 Directions API。

## RoutePolyline（新元件）

**路徑**：`src/components/map/RoutePolyline.tsx`

- 用 react-map-gl 的 `<Source type="geojson">` + `<Layer type="line">`
- 從 `useRoutePlannerStore.route.geometry` 讀 GeoJSON LineString
- paint:
  ```json
  {
    "line-color": "var(--accent)",
    "line-width": 1,
    "line-opacity": 1.0
  }
  ```
- 繪製動畫：GSAP 把 `line-dasharray` 從 `[0, 全長]` 動畫到 `[全長, 0]`，0.8s ease-out

## RouteWaypointMarker（新元件）

**路徑**：`src/components/map/RouteWaypointMarker.tsx`

中間 waypoint（不是起點/終點）的編號 marker：

- 16×16 圓圈
- 內含編號 `01` `02` `03` ... Space Mono 9px
- 邊框 1px `var(--accent)`，背景 `var(--background)`
- 起點/終點是 8×8 方塊（不用這個元件，由 RouteSheet 直接畫）

## ExternalNavSheet（新元件）

**路徑**：`src/components/map/ExternalNavSheet.tsx`

點擊 RouteSheet「開始導航」後彈出的選擇 sheet：

```
┌─────────────────────────────────────┐
│ 開啟外部導航 / EXTERNAL NAVIGATION    │
├─────────────────────────────────────┤
│ ◯ Google Maps                        │
│ ◯ Apple Maps（僅終點，中間點不會帶入）│  ← 多點規劃時 iOS only
│ ◯ 取消                                │
└─────────────────────────────────────┘
```

行為：
- 偵測平台（iOS / Android / desktop）
- 桌機直接跳，不顯示 sheet（單一選項時略過）
- 行動裝置必跳 sheet 讓使用者選

## 擴充指南

**加入篩選器**（仍待實作）：
1. 在 `map/page.tsx` 加入篩選器 UI（下拉選單或 tag chips）
2. 從 `useMapStore` 讀取 `filters`
3. 將 `filters` 加入 API query string
4. API 已支援 `categories` 參數

**升級為 React Query**（仍待實作）：
```typescript
const { data } = useQuery({
  queryKey: ["spots", lat, lng, radius, filters],
  queryFn: () => fetchSpots({ lat, lng, radius, ...filters }),
});
```

**多 theme 地圖樣式擴充**：
- 新增 theme → `src/lib/mapbox-styles/{name}.json`
- `src/lib/mapbox/style-loader.ts` 加入對應映射
- 顏色從 `themes.css` 對應 token 抓 hex
