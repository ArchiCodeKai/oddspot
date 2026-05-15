# 地圖功能模組

> **Status**: 改造中。Google Maps → Mapbox 路線 A 改造規劃完成，待實作。
> **規格 source of truth**：`docs/specs/2026-05-06-map-route-a-acid-redesign.md`

## 元件結構（改造後目標）

```
src/components/map/
  MapView.tsx              ← 地圖容器，包 react-map-gl Map
  SpotMarker.tsx           ← 景點標記（圓點，14/20px，category 8 色）
  SpotPopup.tsx            ← 點擊標記後的資訊卡，多一個「加入路線」按鈕
  MapClickEffect.tsx       ← 地圖點擊箭頭特效（不動，已掛在 layout.tsx 根層）
  RouteSheet.tsx           ← 路線規劃 bottom sheet
  RoutePolyline.tsx        ← 地圖上畫路線（GeoJSON LineString）
  RouteWaypointMarker.tsx  ← 編號 marker（01/02/03）
  LocateMeButton.tsx       ← 右下角定位按鈕
  ExternalNavSheet.tsx     ← 「開始導航」app 選擇 sheet

src/components/ui/
  MagneticCursor.tsx       ← 自定義游標 + 軌跡（不動）

src/lib/mapbox-styles/
  terminal.json            ← 4 themes 各一份地圖樣式
  blueprint.json
  caution.json
  midnight.json
  base-template.json       ← 共用結構

src/lib/mapbox/
  directions.ts            ← Mapbox Directions API 封裝（多點最佳化）
  deep-link.ts             ← Google/Apple/web Maps deep link 產生器
  style-loader.ts          ← 依目前 theme 載入對應 style JSON

src/lib/
  cursor-state.ts          ← 游標軌跡 ring buffer（不動）

src/store/
  useMapStore.ts           ← 既有 store（filters 等）
  useRoutePlannerStore.ts  ← 新增：路線規劃狀態
```

## 資料流

```
map/page.tsx
  ├─ fetch /api/spots（使用者位置 + 半徑）
  │  └─ spots: SpotMapPoint[]
  │
  ├─ MapView（spots, userLocation）
  │  ├─ SpotMarker × N
  │  │  └─ click → SpotPopup
  │  │     └─ 「加入路線」→ useRoutePlannerStore.addSpot
  │  ├─ RoutePolyline（讀 useRoutePlannerStore.route）
  │  ├─ RouteWaypointMarker × N
  │  ├─ LocateMeButton
  │  └─ RouteSheet（讀 useRoutePlannerStore）
  │     └─ 「開始導航」→ ExternalNavSheet（依平台展示選項）
  │        └─ 點擊 → window.location.href = deepLink
  │
  └─ MapClickEffect（layout 根層，listen "oddspot:markerclick"）
```

## 4 themes 地圖樣式

四份 JSON 對應 `src/app/themes.css` 的 token：

| Token | terminal | blueprint | caution | midnight |
|---|---|---|---|---|
| `--background`（海水） | `#14201c` | `#161a22` | `#1d1a14` | `#18181a` |
| `--panel`（陸地） | `#1a2823` | `#1d2230` | `#23201a` | `#202024` |
| `--accent`（道路） | `#5fd9c0` | `#4f7dff` | `#ffd24a` | `#d6d6dc` |
| `--muted`（label） | `#7da99e` | `#8a93a3` | `#9b937f` | `#8e8e94` |

**統一規則**（4 themes 共用）：POI / 街道 label / 建築 fill / 公園 fill 全關，主要道路 1px、次要道路 0.5px @0.4 opacity，國界 1px dashed。

切換 theme 時透過 `style-loader.ts` 整份替換 Mapbox style，不做局部 setPaintProperty。

## 分類顏色對應（SpotMarker）

**8 色不隨 theme 變**（design-direction-v2 第 36 行：「Category colors do NOT change per theme」）：

```typescript
const CATEGORY_COLORS = {
  "weird-temple": "#f97316",          // 橘
  "abandoned": "#6b7280",              // 灰
  "giant-object": "#3b82f6",          // 藍
  "kitsch": "#ec4899",                 // 粉
  "marginal-architecture": "#14b8a6",  // 青
  "urban-legend": "#8b5cf6",          // 紫
  "absurd-landscape": "#22c55e",       // 綠
  "odd-shopfront": "#eab308",          // 黃
};
```

## 環境變數

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ...   ← 必填，使用者自行於 mapbox.com 申請
```

範本見 `.env.example`。`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` 改造階段 2 完成後可移除。

## 路線規劃資料流

```
使用者選點：
  方式 1：點地圖 marker → SpotPopup「加入路線」→ addSpot
  方式 2：RouteSheet 內「+ 從收藏選」→ Saved Spots picker → addSpot

選滿（>= 2 點）：
  RouteSheet 顯示「OPTIMIZE / 計算最佳順序」按鈕
  → useRoutePlannerStore.optimize()
  → fetchOptimizedRoute（Mapbox Directions API with optimize=true）
  → store 寫入 route + optimizedOrder
  → RoutePolyline / RouteWaypointMarker 自動重繪

開始導航：
  RouteSheet「START / 開始導航」
  → 偵測平台（iOS / Android / desktop）
  → ExternalNavSheet 列出可用 app（Apple Maps 多點時加灰色提示）
  → 點選 → 跳出去外部 app
```

## 游標與特效系統

**架構重點不變**：`MagneticCursor` 和 `MapClickEffect` 必須掛在 `layout.tsx` 根層（`position:fixed` 不可在任何 `transform` 祖先內）。

**資料流**：
```
MagneticCursor  →  cursorState.trail（ring buffer）
                →  cursorState.lastAngle
SpotMarker      →  dispatch CustomEvent "oddspot:markerclick"
MapClickEffect  →  listen "oddspot:markerclick"，從 cursorState 讀取軌跡，播放 GSAP 動畫
```

**觸控設備與手機 viewport**：兩個效果元件都只在桌面 viewport 渲染。判斷同時包含 `pointer: coarse` 與 `max-width: 1023px`，避免 DevTools 手機尺寸下仍輸出停在左上角的箭頭 DOM。

## 實作進度

| 階段 | 狀態 | 對應 spec 章節 |
|---|---|---|
| 0：Mapbox token 申請 | ⏳ 待使用者執行 | 五 |
| 1：4 themes JSON | ⏳ 待開始 | 三、3a–3b |
| 2：MVP 替換 | ⏳ 待開始 | 六 |
| 3：LocateMeButton + 加入路線 | ⏳ 待開始 | 三、3f；四 |
| 4：RoutePlanner（含 Directions API + deep link） | ⏳ 待開始 | 三、3d–3e；四 |
| 5：Polish（acid marker / 動畫 / 文案） | ⏳ 待開始 | 八 |

## 已知限制

- SpotPopup 的「查看詳情」連結到 `/spots/[id]`，景點詳情頁 Step 3 已有 Shell，內容持續補完
- 目前 [MapView.tsx](../../../src/components/map/MapView.tsx) 用 `@vis.gl/react-google-maps` + CSS filter（`invert(1) hue-rotate(180deg)`）做深色化，是改造前的暫時方案

## TODO（改造後仍未解決）

- 加入篩選器 UI（useMapStore.filters）
- 加入半徑選擇器
- 收藏列表勾選介面（階段 4 中實作，但 Saved Spots store 要等 Step 5 才存後端）

## 未排程 / Stage 5+ polish 候選

### 雷達掃描 leader-line 視覺（獨立新功能）

第一次進地圖時，從使用者位置朝附近每個 spot marker 畫出 1px 虛線
+ 旋轉雷達掃描環（acid/Y2K 雷達 UI 風格）。

- **跟 RoutePolyline 的差異**：RoutePolyline 是使用者主動規劃後的「單一路徑」（A→B→C 沿路網），leader-line 是「進場視覺效果」（從圓心放射多條輔助線）
- **觸發時機**：地圖首次載入完成 + 有 userLocation + 至少 1 個 spot 可見
- **不觸發**：路線規劃中、已有 RoutePolyline、使用者拖動過地圖後
- **建議排程**：Stage 5 polish 範圍，獨立 PR
- **參考**：design-direction-v2.md 第 47–53 行 wireframe geometry / acid stickers 段落
