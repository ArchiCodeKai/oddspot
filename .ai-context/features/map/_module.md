# 地圖功能模組

> **Status**: Mapbox 路線 A 主功能已完成，正在做跨裝置視覺 / UX 收斂。
> **規格 source of truth**：`docs/specs/2026-05-06-map-route-a-acid-redesign.md`

## 元件結構（目前實作）

```
src/components/map/
  MapView.tsx              ← 地圖容器，包 react-map-gl Map
  SpotMarker.tsx           ← 景點標記（圓點，14/20px，主題色；Stage 5 升級 wireframe 球）
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

## 右上角設定 Cluster

`src/components/map/TopRightCluster.tsx` 是 `/map` 右上角的帳號捷徑 / 語言 / 主題 / 登入收合選單。

- 外層固定使用高層級 `z-50`，必須蓋過 swipe 工具列、卡片、地圖控制列。
- 桌機可維持 `var(--panel-glass-strong)` 玻璃面板；手機版改用 `--panel-solid` 實底，避免展開時看到後面的行程列、filter 或卡片內容透出。
- 手機版 popover 關閉 backdrop blur，改靠實底與 shadow 建立層級；這是為了可讀性，不是為了視覺特效。
- 已登入時第一層直接顯示 `AccountShortcutLinks`：已收藏、今日行程、我的投稿；避免使用者還要展開頭像第二層才找到主要頁面。
- 語言、主題、登入 / 登出仍沿用 `LangToggle`、`ThemeToggle`、`AuthButton`，不要在 cluster 內重寫狀態邏輯。
- `AuthButton` 已登入狀態只負責身分顯示與登出；登入狀態下不再提供 nested dropdown。

## 左上角地圖控制列

`src/app/map/page.tsx` 的 `.map-top-controls` 包住 filter trigger 與 `RadiusToggle`。

- 手機 / 桌機維持原本 top-left 位置。
- 平板斷點（768–1279px）改為 `top: 24px; left: 24px`，並限制 `max-width: calc(100vw - 148px)`，避免貼到右上角 settings cluster。
- 平板 filter trigger 提升到 44px touch target、11px 字級、較寬 padding；RadiusToggle chip 也同步加大，避免 iPad 模擬尺寸下文字與 icon 擠在一起。

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

## SpotMarker 視覺

**現狀（v2 已實作）**：所有 marker 採當前**主題色**（`var(--accent)`），隨 theme 切換變化。category 不再用顏色區分。

**未來目標（Stage 5 規劃中）**：升級成 **mini wireframe 球**（SVG 橢圓堆疊，跟 landing globe 同視覺語言）。完整規格見 [`docs/specs/2026-05-21-swipe-feature.md`](../../../docs/specs/) 同期的 marker 升級條目，以及 [`design-direction-v2.md`](../global/design-direction-v2.md) wireframe geometry 段落。

**設計取捨**：早期版本曾規劃 8 色 category（橘/灰/藍/粉/青/紫/綠/黃），但實作時發現跟主題系統衝突太多，改用主題色統一。未來 category 區分改靠 sticker 形狀或標籤，不再用顏色。

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
  RouteSheet 顯示「路徑規劃」與「最佳化」按鈕
  → 清單列可直接拖曳換順序；不使用右側 ↑ / ↓ 控制
  → 路徑規劃：useRoutePlannerStore.planInOrder()
  → 最佳化：useRoutePlannerStore.optimize()
  → planInOrder 使用 Directions API，照目前清單順序畫路線
  → optimize 使用 Optimization API，成功後重排 selectedSpots
  → store 寫入 route + optimizedOrder
  → RoutePolyline / RouteWaypointMarker 自動重繪

收起路線：
  方式 1：點擊 RouteSheet 右上角 X
  方式 2：從頂部拉手條或 header 往下拖曳，超過門檻即關閉
  motion：RouteSheet / ExternalNavSheet 共用 src/lib/motion/sheetMotion.ts，進場 spring、離場 0.2s ease-in，reduced motion 時改淡入淡出

視覺與定位：
  RouteSheet 高度依選點數往上長高，上限 86vh；5 點時不讓清單區出現內部 scrollbar
  footer 按鈕使用 repeat(..., minmax(0, 1fr)) 維持等寬，避免 zoom 或字體縮放造成寬度漂移
  LocateMeButton 展開時使用同一組選點數高度公式貼近 RouteSheet 頂部，避免高螢幕時飄太遠

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
| 0：Mapbox token 申請 | ✅ 完成，`NEXT_PUBLIC_MAPBOX_TOKEN` 必填 | 五 |
| 1：4 themes JSON | ✅ 完成 | 三、3a–3b |
| 2：MVP 替換 | ✅ 完成，地圖已改用 `react-map-gl/mapbox` | 六 |
| 3：LocateMeButton + 加入路線 | ✅ 完成 | 三、3f；四 |
| 4：RoutePlanner（含 Directions API + deep link） | ✅ 完成 | 三、3d–3e；四 |
| 5：Polish（acid marker / 動畫 / 文案） | 🔄 進行中，先收斂 UX 明確性 | 八 |

## 已知限制

- SpotPopup 的「查看詳情」連結到 `/spots/[id]`，景點詳情頁第一版已可顯示基本資訊與行動按鈕，照片牆與更多資料仍可再補強。
- Mapbox theme 切換與 RoutePolyline 顏色理論上已跟 `theme` 重算；仍需要桌機 / 平板 / 手機實際切換驗證。
- iOS Google Maps app scheme 沒裝 app 時的 fallback chain 還沒做，容易出現點了沒反應的體感。
- RouteSheet 滿 5 點時已保留 disabled「已達 5 點上限」按鈕，避免使用者誤判功能消失。
- Saved picker 空狀態已區分「完全沒收藏」與「目前地圖範圍沒有收藏」。

## 下一步 TODO

### P0 / P1 收斂

- `ExternalNavSheet`：補 iOS app scheme fallback 到 Google Maps web URL。
- `LocateMeButton`：確認展開 sheet 時與 sheet 的動態曲線一致；目前可先用 CSS bezier 微調，必要時再改 motion button。
- `RoutePolyline`：跨 theme 快速切換時確認線色不殘留。

### 已完成但仍可 polish

- 篩選器 UI 第一版已接上 `useMapStore.filters`，API 支援 category / status / difficulty；後續可補更明確的篩選摘要與「已套用 N 個條件」狀態。
- 半徑選擇器第一版已接上 `RadiusToggle` segmented control；平板斷點已加大 touch target，仍需實機確認。
- 收藏列表勾選介面已可搭配 Step 5 saved sync 使用；下一步是做個人收藏頁或更完整 picker。

## 未排程 / Stage 5+ polish 候選

### 雷達掃描 leader-line 視覺（獨立新功能）

第一次進地圖時，從使用者位置朝附近每個 spot marker 畫出 1px 虛線
+ 旋轉雷達掃描環（acid/Y2K 雷達 UI 風格）。

- **跟 RoutePolyline 的差異**：RoutePolyline 是使用者主動規劃後的「單一路徑」（A→B→C 沿路網），leader-line 是「進場視覺效果」（從圓心放射多條輔助線）
- **觸發時機**：地圖首次載入完成 + 有 userLocation + 至少 1 個 spot 可見
- **不觸發**：路線規劃中、已有 RoutePolyline、使用者拖動過地圖後
- **建議排程**：Stage 5 polish 範圍，獨立 PR
- **參考**：design-direction-v2.md 第 47–53 行 wireframe geometry / acid stickers 段落
