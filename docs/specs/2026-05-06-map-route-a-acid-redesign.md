# 地圖路線 A：Mapbox + Acid 風格改造

**日期**：2026-05-06
**範圍**：`src/app/map/page.tsx`、`src/components/map/`、Mapbox style 系統、路線規劃 + 多點最佳化、外部地圖 deep link
**目標**：把 Google Maps 換成 Mapbox，做到地圖底層也對齊首頁 Acid/Y2K 視覺，並加上 1–5 點最佳路線規劃功能
**核心決策**：**保留 Google Maps 圖資的權衡 < 視覺風格 100% 統一**，導航跳出去到外部 app

---

## 一、為什麼換掉 Google Maps

| 問題 | 說明 |
|---|---|
| CSS filter 是 hack | 現在 [MapView.tsx](../../src/components/map/MapView.tsx) 用 `invert(1) hue-rotate(180deg)` 強行轉色，無法控制單一圖層、無法關 POI、無法把街道改成 1px 細線 |
| Google Maps JSON Style 上限 | 即使做 Custom Style，渲染引擎仍是 Google 的，無法做出 wireframe 細線、虛線邊界、自訂 marker layer |
| 跟 design-direction-v2 不一致 | v2 第 49 行：`Stroke width: 0.5–1px. No fills.`；第 113 行：`NO gradient, NO glow, NO smoothing — raw pixel path is more Acid` — Google Maps 達不到 |
| Marker 客製化天花板 | `AdvancedMarker` 樣式受限，無法做 acid sticker（barcode + 八角星 + 編號標籤） |

**結論**：要做到 acid wireframe 必須換成 WebGL 向量地圖，Mapbox 是最快路徑。

---

## 二、技術選擇

| 項目 | 選擇 | 替代方案 | 為什麼 |
|---|---|---|---|
| 地圖引擎 | **Mapbox GL JS v3** | MapLibre GL（純開源 fork） | Studio 線上編輯器、Directions API 內建、5 萬載入/月免費 |
| React 套件 | **react-map-gl v8** | 自己包 mapbox-gl | 官方推薦的 React wrapper，宣告式 API |
| 路線 API | **Mapbox Directions API** | OSRM / GraphHopper | 內建 `optimize=true` 多點最佳化，跟主套件同 token |
| 樣式管理 | **JSON 進 git**（`src/lib/mapbox-styles/`） | Studio cloud URL | 跟 [themes.css](../../src/app/themes.css) 同維護模式，可 diff、可 PR review |
| 4 themes 支援 | **一次做齊**（4 份 JSON） | 先做 terminal | theme 切換時整份 style 換掉 |

**未來退路**：MapLibre API 跟 Mapbox 幾乎相容，真要逃離 Mapbox 只需換套件名 + 自架 OSRM，元件結構不動。

---

## 三、視覺規格

### 3a. 4 themes 地圖樣式對照表

從 [themes.css](../../src/app/themes.css) 讀出實際 token，對應到地圖各圖層：

| Token 用途 | 地圖圖層 | terminal | blueprint | caution | midnight |
|---|---|---|---|---|---|
| 海水 | `water` fill | `#14201c` | `#161a22` | `#1d1a14` | `#18181a` |
| 陸地 | `land` fill | `#1a2823` | `#1d2230` | `#23201a` | `#202024` |
| 主要道路 1px | `road-primary` line | `#5fd9c0` | `#4f7dff` | `#ffd24a` | `#d6d6dc` |
| 次要道路 0.5px @0.4 | `road-secondary` line | `#5fd9c0` | `#4f7dff` | `#ffd24a` | `#d6d6dc` |
| 國界 1px dashed | `boundary-country` line | `#7da99e` | `#8a93a3` | `#9b937f` | `#8e8e94` |
| 大型地名 label | `place-country` text | `#7da99e` | `#8a93a3` | `#9b937f` | `#8e8e94` |

### 3b. 通用 layer 設定（4 themes 共用）

```
ALL THEMES:
  POI 圖示             → visibility: none（全關）
  建築 fill            → visibility: none
  街道 label           → visibility: none
  公園/綠地 fill       → visibility: none
  鐵路、機場符號        → visibility: none

  道路：
    motorway / trunk  → 1px line, opacity 1.0
    primary           → 1px line, opacity 0.8
    secondary         → 0.5px line, opacity 0.5
    minor / tertiary  → 0.5px line, opacity 0.3

  邊界：
    country           → 1px dashed [4, 4]
    state             → 0.5px dashed [2, 4]

  Label：
    country / capital → Space Mono, 11px, letter-spacing 0.12em, uppercase
    region            → Space Mono, 9px, opacity 0.5
    city / town       → Space Mono, 8px, opacity 0.3
    street            → 不顯示
```

### 3c. SpotMarker（保持圓點，第一版不升級）

| 狀態 | 大小 | 樣式 |
|---|---|---|
| 未選中 | 14px | category 8 色實心圓，1px 外框 `var(--background)` |
| 選中 | 20px | 同上，加 `box-shadow: 0 0 12px {category}` |
| Hover (桌機) | 16px | 縮放動畫 0.15s |

8 個 category 顏色不變，由 [SpotMarker.tsx](../../src/components/map/SpotMarker.tsx) 既有定義保留。

### 3d. 路線視覺（RoutePolyline）

```
- stroke: 1px var(--accent)（隨主題切換）
- 無漸層、無 glow
- stroke-dasharray: 無（實線，因為地圖背景已經很 acid）
- 起點 marker: 8×8 方塊，var(--accent) fill
- 終點 marker: 8×8 方塊，var(--foreground) fill（區分用）
- waypoint marker（中間點）: 16×16 圓圈，內含編號 01 02 03，Space Mono
- 繪製動畫: stroke-dashoffset 從全長到 0，0.8s ease-out（GSAP）
```

### 3e. RouteSheet（bottom sheet）

從下方滑上來，全寬，最大高度 60vh。

```
標題列    archive://route · FORM_ROUTE / 歸檔行程
選點清單  01 [景點名稱]                   ✕
         02 [景點名稱]                   ✕
         03 [景點名稱]                   ✕
         + 從地圖選 / 從收藏選
摘要區    TOTAL DIST: 12.4km · EST: 28min · OPTIMIZED ✓
按鈕      [ START / 開始導航 ]
```

設計細節：
- border-radius: 2px（不是 16px，acid 是硬角）
- 頂部 4×40px 拉手條（drag handle），1px 外框
- 拉手條兩側貼 barcode sticker（v2 第 53 行）
- 「OPTIMIZED ✓」當 Mapbox 回傳的 waypoint 順序跟使用者輸入不同時顯示

### 3f. LocateMeButton（**新需求**，右下角）

```
位置: position: absolute, right: 16px, bottom: 88px (RouteSheet 收起時)
                                bottom: calc(60vh + 16px) (RouteSheet 展開時)
大小: 44×44px（符合 v2 第 138 行 44px touch target）
邊框: 1px var(--line-strong)
背景: var(--panel-glass)
border-radius: 2px
圖示: SVG 十字準星，14×14, stroke 1px var(--accent)
點擊行為:
  1. 取得 navigator.geolocation.getCurrentPosition
  2. map.flyTo({ center: [lng, lat], zoom: 16, duration: 800 })
  3. 顯示一個 1.5s 的 acid 提示：「LOCATED · {lat}, {lng}」
錯誤行為:
  - 拒絕授權 → 顯示「PERMISSION DENIED · 開啟系統設定 > 定位」
  - 取得失敗 → 顯示「ERR_GPS · 訊號失蹤」
```

---

## 四、API 與資料流

### 4a. Mapbox Directions API

```
POST GET https://api.mapbox.com/directions/v5/mapbox/{profile}/{coords}
       ?optimize=true
       &geometries=geojson
       &overview=full
       &access_token={NEXT_PUBLIC_MAPBOX_TOKEN}

profile: driving | walking | cycling
coords:  lng,lat;lng,lat;...（最多 12 點，含起點終點）
回傳:    { routes: [{ geometry: GeoJSON LineString, distance, duration, ...}], waypoints: [{ waypoint_index }] }
```

**封裝位置**：`src/lib/mapbox/directions.ts`

```typescript
interface DirectionsRequest {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: Array<{ lat: number; lng: number }>;
  profile?: "driving" | "walking" | "cycling";
}

interface DirectionsResponse {
  geometry: GeoJSON.LineString;
  distanceMeters: number;
  durationSeconds: number;
  optimizedOrder: number[];  // waypoint_index 對應使用者輸入的順序，不同 = 系統重排過
}

async function fetchOptimizedRoute(req: DirectionsRequest): Promise<DirectionsResponse>
```

### 4b. Deep Link 規格（外部導航）

點擊「開始導航」後**彈出選擇 sheet**列出可用 app：

| 平台 | 可用選項 | URL 格式 |
|---|---|---|
| iOS | Google Maps（如裝） / Apple Maps / 取消 | `comgooglemaps://?daddr={lat},{lng}&directionsmode=driving`<br>`maps://?daddr={lat},{lng}` |
| Android | Google Maps / 其他已安裝（intent picker）/ 取消 | `geo:{lat},{lng}?q={lat},{lng}` 觸發 system picker |
| 桌機 | 直接在新分頁開 Google Maps web | `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` |

**多點 (waypoints) 處理**：

- **Google Maps**：支援 `&waypoints=lat,lng|lat,lng` ✅ 完整轉達多點
- **Apple Maps**：不支援 waypoints ❌ 只能傳「終點」，中間點丟失
- **解決方式**：iOS 多點規劃時，Apple Maps 選項顯示為「Apple Maps（僅終點，中間點不會帶入）」灰色提示

**封裝位置**：`src/lib/mapbox/deep-link.ts`

```typescript
function buildExternalNavLinks(waypoints: Array<{lat: number; lng: number; label: string}>): {
  platform: "ios" | "android" | "desktop";
  options: Array<{ label: string; url: string; warning?: string }>;
}
```

### 4c. RoutePlanner state（Zustand）

**新增 store**：`src/store/useRoutePlannerStore.ts`

```typescript
interface RoutePlannerStore {
  isOpen: boolean;
  selectedSpots: SpotMapPoint[];        // 1–5 個（含起點，使用者位置自動加為 spot 0）
  isOptimizing: boolean;
  route: DirectionsResponse | null;
  error: string | null;

  toggleSheet: () => void;
  addSpot: (spot: SpotMapPoint) => void;        // 從地圖點擊或收藏列表呼叫
  removeSpot: (id: string) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  optimize: () => Promise<void>;                 // 呼叫 fetchOptimizedRoute
  clear: () => void;
}
```

**選點來源**（兩種都做，對應 Q9）：
1. 地圖點擊任一 SpotMarker → SpotPopup 多一個按鈕「加入路線」
2. RouteSheet 內按「+ 從收藏選」→ 開啟 Saved Spots picker（`useSavedSpotsStore`，未來 Step 5 才存後端）

---

## 五、階段拆解

| 階段 | 任務 | Effort | 可獨立交付 |
|---|---|---|---|
| 0 | 使用者申請 Mapbox token，加進 `.env.local` | XS（5min，使用者側） | — |
| 1 | 4 themes 地圖樣式 JSON 設計 + Style Inspector demo 頁 | M（2–3h） | ✅ 純資料檔，不影響現有 google maps |
| 2 | MVP 替換：套件換掉、MapView/SpotMarker 改寫、CSS filter 拿掉 | M（2–3h） | ✅ 地圖跑得起來、景點顯示得出來 |
| 3 | LocateMeButton + SpotPopup「加入路線」按鈕 | S（1–1.5h） | ✅ |
| 4 | RoutePlanner（Sheet + Directions API + RoutePolyline + Deep link） | L（4–5h） | ✅ 完整路線規劃 |
| 5 | Polish：acid sticker marker、載入動畫、empty/error 文案、marquee | M（2–3h） | ✅ |

**階段 1 的特殊性**：純設計檔，不動 production 程式碼，可以先 PR 進 main。

**階段 2 起**：每個階段都建議獨立 PR，方便 review 跟 rollback。

---

## 六、檔案動作清單（實作階段參考）

### 新增

```
src/lib/mapbox-styles/
  terminal.json
  blueprint.json
  caution.json
  midnight.json
  base-template.json     ← 4 主題共用結構，避免重複

src/lib/mapbox/
  directions.ts          ← Directions API 封裝
  deep-link.ts           ← 外部地圖 deep link 產生器
  style-loader.ts        ← 依目前 theme 載入對應 JSON

src/components/map/
  RouteSheet.tsx         ← bottom sheet
  RoutePolyline.tsx      ← 地圖上畫路線
  RouteWaypointMarker.tsx ← 編號 marker
  LocateMeButton.tsx     ← 右下角定位按鈕
  ExternalNavSheet.tsx   ← 「開始導航」選擇 sheet

src/store/
  useRoutePlannerStore.ts
```

### 改寫

```
src/components/map/MapView.tsx        ← Google Maps → react-map-gl
src/components/map/SpotMarker.tsx     ← AdvancedMarker → Mapbox <Marker>
src/components/map/SpotPopup.tsx      ← 加「加入路線」按鈕（局部改）
```

### 不動（明確標記，避免誤改）

```
src/components/map/MapClickEffect.tsx
src/components/ui/MagneticCursor.tsx
src/lib/cursor-state.ts
src/types/spots.ts
```

### 依賴變動（package.json）

```
- "@vis.gl/react-google-maps": "^1.7.1"

+ "react-map-gl": "^8.0.0"
+ "mapbox-gl": "^3.0.0"
+ "@types/mapbox-gl": "^3.0.0" (devDependencies)
```

### 環境變數

```
.env.local（使用者本地，不進 git）
.env.example（要新增，範本進 git）

NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ... ← 必填，使用者自行申請
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY    ← 階段 2 後可移除
```

---

## 七、轉接流程

### A · 流程上的轉接（在當前 worktree 直接實作）

決定：**直接在當前 worktree（`sweet-driscoll-902df5`）做完所有階段**，不開新 branch、不先 merge 文件、不分兩次。

```bash
# 1. 規劃文件先單獨一個 commit（純文件，便於後續追蹤）
git add docs/specs/2026-05-06-map-route-a-acid-redesign.md \
        docs/03-元件設計/map-components.md \
        .ai-context/features/map/_module.md \
        CLAUDE.md \
        .env.example
git commit -m "docs: add map route A acid redesign spec"

# 2. 從階段 1 開始實作，每完成一個階段 commit 一次（不另開 branch）
#    例如：
#    git commit -m "feat(map): add 4 themes mapbox style JSONs"          ← 階段 1
#    git commit -m "feat(map): replace google maps with mapbox"           ← 階段 2
#    git commit -m "feat(map): add LocateMeButton + add-to-route action"  ← 階段 3
#    git commit -m "feat(map): add route planner with mapbox directions"  ← 階段 4
#    git commit -m "polish(map): acid sticker markers + loading copy"     ← 階段 5

# 3. 全部完成後再一次 PR 進 main，或階段性推上去都可以
```

**操作建議**：
- 每個階段建議至少一個 commit，方便後悔回滾
- 中途要切去做別的，把當前 commit 暫存（或 stash）即可
- 不用先 merge 文件 — 文件跟實作在同一條 branch 一起進 main 沒有壞處

### B · 跨對話 / 跨 AI 的轉接

任何 AI 接手只需讀以下三份文件即可繼續：

1. **本文件** — 完整規格與決策
2. [.ai-context/features/map/_module.md](../../.ai-context/features/map/_module.md) — 地圖模組現狀
3. [.ai-context/global/design-direction-v2.md](../../.ai-context/global/design-direction-v2.md) — Acid 視覺規範

**Hand-off prompt 範例**：

```
我要實作 OddSpot 地圖路線 A 改造的【階段 N：xxx】。

背景：目前地圖用 Google Maps + CSS filter，要換成 Mapbox 並做到 acid wireframe 風格。
規格：docs/specs/2026-05-06-map-route-a-acid-redesign.md
模組現狀：.ai-context/features/map/_module.md
視覺規範：.ai-context/global/design-direction-v2.md

請先讀以上三份 + src/components/map/ 現有檔案，然後依規格的【階段 N】檔案動作清單實作。
不要修改階段 N 範圍外的檔案，發現相關問題以 TODO 註解標記後回報。
```

---

## 八、未解決事項與後續決策

這些不影響階段 1–4 推進，但實作到對應階段時要再決定：

| 項目 | 決策時機 | 候選 |
|---|---|---|
| 多點規劃時 Apple Maps 灰掉還是隱藏 | 階段 4 | 灰掉 + 提示 / 完全隱藏 |
| 路線繪製動畫長度 | 階段 4 | 0.6s / 0.8s / 1.0s |
| acid sticker marker 設計 | 階段 5 | 八角星 / barcode / 編號標籤 多選一 |
| 載入動畫文案池 | 階段 5 | 對齊 v2 第 119 行 B-grade cracks |
| 是否做地圖層級的 marquee 狀態列 | 階段 5 | 可選增加 |

---

## 九、退路與已知風險

| 風險 | 機率 | 緩解 |
|---|---|---|
| Mapbox 免費額度不足（月用戶 > 5 萬） | 低 | 使用者預估 < 3000 月用戶，餘裕 16× |
| Mapbox 提價 / 政策改變 | 中 | 元件結構與 MapLibre 相容，可 1–2 天內換出 |
| Directions API 多點 12 個上限 | 不會碰到 | 規格上限 5 個，遠低於 12 |
| Deep link 在某些 Android 廠商 ROM 失效 | 低 | fallback 到 Google Maps web URL |
| Mobile WebGL 效能 | 低 | 4 themes 都關了 POI/建築 fill，layer 數比 Google Maps 預設少很多 |
