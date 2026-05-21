# 滑卡片功能模組（Step 4）

> **Status**：設計定案，待實作。
> **規格 source of truth**：[`docs/specs/2026-05-21-swipe-feature.md`](../../../docs/specs/2026-05-21-swipe-feature.md)

## 元件結構（待實作）

```
src/app/swipe/
  page.tsx                ← 路由入口

src/components/swipe/
  SwipeView.tsx           ← 容器，管 store + 渲染卡片堆疊 + chip 區
  SwipeCard.tsx           ← 單張卡片（Framer Motion drag + 內滾）
  SwipeCardDetail.tsx     ← 卡片下方 200vh 詳情區
  SwipeChipBar.tsx        ← 底部 chip bar + 撤回按鈕
  SwipeChipMiniCard.tsx   ← 點 chip 後彈出的 mini card
  SwipeEmptyState.tsx     ← 空狀態（acid 文案）
  SwipeOverlay.tsx        ← 拖拉時的邊緣染色覆疊

src/store/
  useSwipeStore.ts        ← 新增（skipped / history / undo）
```

## 手勢定義

| 手勢 | 行動 | Store 動作 |
|---|---|---|
| 左滑 | pass（不再出現） | `useSwipeStore.addSkipped(id)` |
| 右滑 | 加進收藏夾（不加目前路徑） | `useSavedStore.addSave(id)` |
| 超級按鈕（卡片 ⭐） | 加收藏 + 加目前路徑 | `addSave` + `RoutePlannerStore.addSpot` |
| 上下滑 / 滾輪 | 卡片**內**滾動看完整詳情 | 純 UI |
| 撤回箭頭（chip bar） | 撤回上一張 | `useSwipeStore.undo()` |

**關鍵設計**：
- 左右滑**隨時可用**，不被卡片內滾動鎖住
- 撤回只用按鈕，不用手勢（避免跟內滾衝突）

## 跟 Stage 4 / Stage 5 整合

- **RoutePlannerStore reuse**：底部 chip 區資料源 = `selectedSpots`
- 滑卡片頁加點 → 切地圖頁打開 RouteSheet → 自動看到同份清單
- 收藏沿用 `useSavedStore`，登入後走 `/api/saved/sync`（Step 5 已實作）
- OPTIMIZE 不在滑卡片頁，留在地圖頁 RouteSheet

## 資料流

```
/api/spots（沿用地圖共用，v1 不另起 endpoint）
  ↓
spots[]
  ↓ 過濾 skippedIds / savedIds / selectedSpotIds
SwipeView
  ↓
SwipeCard 堆疊（顯示前 3 張）
  ├─ 左滑 → useSwipeStore.addSkipped
  ├─ 右滑 → useSavedStore.addSave
  ├─ 超級按鈕 → useSavedStore.addSave + useRoutePlannerStore.addSpot
  └─ 撤回 → useSwipeStore.undo

SwipeChipBar
  ├─ 讀 useRoutePlannerStore.selectedSpots
  └─ 點 chip → SwipeChipMiniCard（reorder / remove）
```

## Guest Mode

詳見 [docs/04-狀態管理/guest-mode.md](../../../docs/04-狀態管理/guest-mode.md)。

新增的 localStorage keys：
- `oddspot-swipe-skipped`：略過清單
- `oddspot-swipe-history`：撤回堆疊
- `oddspot-route`：目前路徑（給未登入使用者持久化 RoutePlannerStore.selectedSpots）

容量上限：收藏 50 / 路徑 5（沿用 MAX_WAYPOINTS）/ 略過 200 / undo 20。

## Acid 細節（v2 視覺）

- 卡片旋轉 -2°（acid 截圖感）
- 右上角 `[001/237]` 編號 sticker
- 左下角 barcode sticker
- 滑動時邊緣染色（左紅 / 右綠 / 超級按鈕金）
- chip bar 內 mini 吉祥物 icon（blinking）
- 滿 5 個 → chip 集體 jitter 動畫

詳細時序見 spec 第九章。

## 實作階段

| 階段 | 任務 |
|---|---|
| 1 | 路由 + store 骨架 |
| 2 | SwipeCard 拖拉 + 內滾 |
| 3 | 卡片堆疊 + 滑出動畫 |
| 4 | SwipeChipBar + mini card |
| 5 | 撤回 + history |
| 6 | 空狀態 + acid 細節 |
| 7 | Guest mode 持久化 |

**總工時**：6-10h，建議獨立 stage 處理。

## 開放問題（實作前再確認）

- 卡片 fetch 來源：跟地圖共用 vs 獨立 endpoint
- 撤回上限：20 夠嗎？
- 桌機滾輪在卡片**外**怎麼處理（捲動整頁 vs 鎖住）
