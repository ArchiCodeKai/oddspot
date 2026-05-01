# 地圖功能模組

## 元件結構

```
src/components/map/
  MapView.tsx         — 地圖容器，包含 APIProvider + Map
  SpotMarker.tsx      — 景點標記（AdvancedMarker，圓點）
  SpotPopup.tsx       — 點擊標記後的資訊卡
  MapClickEffect.tsx  — 地圖點擊箭頭特效（固定在 layout.tsx 根層）

src/components/ui/
  MagneticCursor.tsx  — 自定義游標 + canvas 虛線軌跡（固定在 layout.tsx 根層）

src/lib/
  cursor-state.ts     — 游標軌跡 ring buffer（MagneticCursor 寫入，MapClickEffect 讀取）
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

## 游標與特效系統

**架構重點：** `MagneticCursor` 和 `MapClickEffect` 必須掛在 `layout.tsx` 根層（`position:fixed` 不可在任何 `transform` 祖先內）。

**資料流：**
```
MagneticCursor  →  cursorState.trail（ring buffer）
                →  cursorState.lastAngle
SpotMarker      →  dispatch CustomEvent "oddspot:markerclick"
MapClickEffect  →  listen "oddspot:markerclick"，從 cursorState 讀取軌跡，播放 GSAP 動畫
```

**觸控設備與手機 viewport：** 兩個效果元件都只在桌面 viewport 渲染。判斷同時包含 `pointer: coarse` 與 `max-width: 1023px`，避免 DevTools 手機尺寸下仍輸出停在左上角的箭頭 DOM。

## 已知限制

- 目前 map/page.tsx 用 fetch + useState，尚未升級 TanStack Query
- SpotPopup 的「查看詳情」連結到 /spots/[id]，景點詳情頁 Step 3 已有 Shell，內容持續補完
- 地圖 mapId 目前用 "oddspot-map"，需要在 Google Maps Console 設定才有 AdvancedMarker 樣式

## TODO
- 升級 fetch 為 useQuery（TanStack React Query）
- 加入篩選器 UI（useMapStore.filters）
- 加入半徑選擇器
