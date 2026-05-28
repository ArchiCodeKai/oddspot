# 滑卡片功能模組（Step 4）

> **Status**：已實作第一版，整合在 `/map` 的 `viewMode: "map" | "swipe"` 雙模式中。
> **規格 source of truth**：[`docs/specs/2026-05-21-swipe-feature.md`](../../../docs/specs/2026-05-21-swipe-feature.md)
> **實作備註**：原 spec 規劃獨立 `/swipe` 路由；目前實作選擇常駐同一個 `/map` 頁面，讓 Mapbox DOM 不因切換探索/地圖而重載。

## 元件結構（目前實作）

```
src/app/map/page.tsx      ← 地圖 / 探索雙模式入口

src/components/swipe/
  SwipeView.tsx           ← 容器，管 store + 渲染卡片堆疊 + chip 區
  SwipeCard.tsx           ← 單張卡片（Framer Motion drag + 內滾）
  SwipeActionBar.tsx      ← 浮在卡片底部上方的 skip / 加路線 / save 圓形按鈕（tooltip + press-only）
  FilterSheet.tsx         ← 探索 / 地圖共用篩選 sheet（滑入/滑出 + 明確關閉按鈕）
  TripPlanSheet.tsx       ← 顯示 RoutePlanner 選點，CTA 回地圖 RouteSheet

src/store/
  useSwipeStore.ts        ← 只保留 swipe session 狀態（skipped / undo）
  useRoutePlannerStore.ts ← 唯一路線選點來源（selectedSpots / optimize / route）
```

## 手勢定義

| 手勢 | 行動 | Store 動作 |
|---|---|---|
| 左滑 | pass（不再出現） | `useSwipeStore.addSkipped(id)` |
| 右滑 | 加進收藏夾（不加目前路徑） | `useSavedStore.addSave(id)` |
| 超級按鈕（卡片 +） | 加收藏 + 加目前路徑 | `useSavedStore.addSave` + `useRoutePlannerStore.addSpot` |
| 上下滑 / 滾輪 | 整張卡片**內**滾動看更多資訊 | 純 UI |
| 撤回箭頭（chip bar） | 撤回上一張 | `useSwipeStore.undo()` |

**關鍵設計**：
- 左右滑**隨時可用**，不被卡片內滾動鎖住
- 撤回只用按鈕，不用手勢（避免跟內滾衝突）

## 跟 Stage 4 / Stage 5 整合

- **RoutePlannerStore reuse**：探索頁行程計數與 TripPlanSheet 資料源 = `useRoutePlannerStore.selectedSpots`
- 滑卡片頁加點 → 切地圖頁打開 RouteSheet → 自動看到同份清單
- 收藏沿用 `useSavedStore`，登入後走 `/api/saved/sync`（Step 5 已實作）
- OPTIMIZE 不在滑卡片頁，留在地圖頁 RouteSheet
- 卡片內的 `導航前往 Google Maps` 是單點外部導航，不加入路線排程；使用者要排程仍按中間 + 加入今日行程

## 資料流

```
/api/spots（沿用地圖共用，v1 不另起 endpoint）
  ↓
spots[]
  ↓ 過濾 skippedIds
SwipeView
  ↓
SwipeCard 堆疊（顯示前 3 張）
  ├─ 左滑 → useSwipeStore.addSkipped
  ├─ 右滑 → useSavedStore.addSave
  ├─ 超級按鈕 → useSavedStore.addSave + useRoutePlannerStore.addSpot
  └─ 撤回 → useSwipeStore.undo

TripPlanSheet
  ├─ 讀 useRoutePlannerStore.selectedSpots
  ├─ remove → useRoutePlannerStore.removeSpot
  ├─ clear → useRoutePlannerStore.clear
  └─ 回地圖規劃路線 → 切 viewMode="map" + openSheet()
```

## Guest Mode

詳見 [docs/04-狀態管理/guest-mode.md](../../../docs/04-狀態管理/guest-mode.md)。

目前 swipe session 與 route persist 分工：
- `useSwipeStore.skippedIds`：session 內略過清單
- `useSwipeStore.lastSkippedId`：單步 undo
- `useRoutePlannerStore.selectedSpots`：目前路線選點，和地圖 RouteSheet 共用，持久化到 localStorage key `oddspot-route`

容量上限：路徑 5（沿用 RoutePlanner `MAX_WAYPOINTS`）。收藏上限由 `useSavedStore` / sync 流程管理。

## Acid 細節（v2 視覺）

- 卡片旋轉 -2°（acid 截圖感）
- 右上角 `[001/237]` 編號 sticker
- 左下角 barcode sticker
- 滑動時邊緣染色（左紅 / 右綠 / 超級按鈕金）
- chip bar 內 mini 吉祥物 icon：沿用設計稿原始單眼輪廓與大眼睛比例；已選 slot 恆亮，並以外殼 squash / stretch、瞳孔位移、眼眶微傾做分層 idle 動作
- 桌機與寬螢幕時，三顆 action button 以 z-index 32 浮在卡片底部上方，不再藏在卡片背後
- action button 採圓形 64px touch target；中間加路線按鈕 76px，使用寬胖圓角十字作為主要 CTA
- action button 已移除內側同心圓；hover / focus 只顯示文字 tooltip；active 只做按壓，不讓按鈕本身承擔結果動畫
- 手機版首屏不顯示 action button，需滾到卡片底部才看到 68/82px 觸控按鈕；桌機版保留卡片外浮動按鈕
- SwipeView 手機版會替 `/map` 頂部 filter / radius 控制列預留安全高度；卡片 frame 使用 `min(100%, calc(100vw - 32px))` 置中，避免窄螢幕或瀏覽器縮放時偏移裁切
- SwipeView 平板斷點（768–1279px）使用 `clamp(34rem, 72vw, 48rem)` / `min(820px, 74vh)` 流體尺寸，toolbar 使用 `min(calc(100vw - 180px), 36rem)` 置中 compact group，並以 `margin-top: 58px` / `margin-bottom: 30px` 讓它離 nav 與卡片都有舒服距離
- SwipeView 不再渲染第二顆 filter；filter 只存在 `/map` 左上角全域控制列。SwipeView 左側的 `swipe-undo-button` 跟底部 action rail 同語言：圓形 icon-only，hover / focus 才顯示 `swipe-undo-tooltip`；手機 toolbar 放在上方 nav 與卡片之間並保留 14px 卡片間隙，平板同樣置於 nav 與卡片中間，桌機保留吉祥物列位置，只把 undo 縮到 37px 並水平左移到接近卡片左上角
- 手機與桌機拖曳時，左右邊緣會出現低透明度 X / check icon 往中心滑入並逐漸變淡，切換下一張後消失；桌機仍保留文字 stamp
- skip / save 結果回饋在卡片中心顯示 0.7s stamp；加入路線顯示資料夾 icon，卡片先回到中心再縮小淡出，形成收進資料夾的 intake 動畫
- SwipeCard 移除「查看完整詳情」按鈕，改成整張卡片內滾；資料包含查詢 / 造訪數、推薦時段、地址、GPS、最多 3 張照片與 Google Maps 導航
- 行程 slot hover 不用整條背景，也不再畫 per-slot 方框或外圈 glow；只用吉祥物本體微抬、眼球位移與文字底線提示可點擊
- FilterSheet 使用 `src/lib/motion/sheetMotion.ts` 的共用 bottom sheet motion；點遮罩可關閉，header 有 36px X 按鈕，也可從拉手條下滑關閉，並支援 reduced motion
- FilterSheet tag 使用 neon flicker / scanline / accent glow；點擊先跑 old-tube ignition，selected 後改成極細微 idle flicker，並尊重 reduced motion
- 滿 5 個 → chip 集體 jitter 動畫

詳細時序見 spec 第九章。

## 實作階段

| 階段 | 任務 |
|---|---|
| 1 | `/map` 雙模式 + swipe store 骨架 | ✅ |
| 2 | SwipeCard 拖拉 + 上滑詳情 | ✅ |
| 3 | 卡片堆疊 + 滑出動畫 | ✅ |
| 4 | TripPlanSheet 接 RoutePlannerStore | ✅ |
| 5 | 單步撤回 skip | ✅ |
| 6 | 空狀態 + acid 細節 | ✅ |
| 7 | Guest mode route 持久化 | ✅ |

**總工時**：6-10h，建議獨立 stage 處理。

## 開放問題（實作前再確認）

- 是否要補完整 history undo（目前只支援救回最近一次 skip）
- 桌機滾輪在卡片**外**怎麼處理（捲動整頁 vs 鎖住）
