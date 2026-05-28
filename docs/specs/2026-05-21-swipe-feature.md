# 滑卡片功能 spec（Step 4）

**日期**：2026-05-21
**範圍**：`/swipe` 路由、`src/components/swipe/`、底部 chip 區、跟 RoutePlannerStore 整合
**目標**：類 Bumble 體驗的滑卡片探索，整合 Stage 4 路線規劃
**狀態**：第一版已實作。實際路由採 `/map` 內雙模式，不另開 `/swipe` route。

---

## 一、範圍與目標

- 從 `/map` 底部 nav「探索」分頁進入，使用 `viewMode: "map" | "swipe"` 切換
- 卡片堆疊式 UI（看到後 1-2 張），左右拖拉決定行動
- **完全 reuse Stage 4 的 `RoutePlannerStore.selectedSpots`**，加進「目前路徑」= 加進 RouteSheet 的選點清單
- Guest mode：未登入也能滑、收藏、加目前路徑，動作存 localStorage，登入後 sync（沿用 Step 5 已完成的 `/api/saved/sync`）

## 二、入口

底部 nav「**探索**」分頁 → `/map` 內切換為 swipe mode

地圖頁、滑卡片頁、收藏頁共用底部 nav，切分頁不破壞 RoutePlannerStore 狀態（store 是全域 zustand）。

## 三、手勢定義

| 手勢 | 行動 | Store 動作 |
|---|---|---|
| **左滑** | pass（不再出現） | `useSwipeStore.addSkipped(id)` |
| **右滑** | 加進**收藏夾**（不加目前路徑） | `useSavedStore.addSave(id)` |
| **超級按鈕**（卡片內 ⭐ icon） | 加進**收藏夾 + 目前路徑** | `addSave` + `RoutePlannerStore.addSpot` |
| **上下滑 / 滾輪** | 卡片**內**滾動看完整詳情 | 無，純 UI |
| **撤回箭頭**（卡片外按鈕） | 撤回上一張 | `useSwipeStore.undo()` |
| **桌機滑鼠停卡片** + 滾輪 | 同上下滑（卡片內滾動） | 無 |

**關鍵設計**：
- 左右滑**隨時可用**，**不會被卡片內滾動鎖住**（避免 Bumble 那種「看到一半要回頂部才能右滑」的反直覺體驗）
- 撤回**只用按鈕**，不用手勢（避免跟內滾衝突）

## 四、卡片結構

### 4a. 卡片尺寸與內容區

```
固定高度：70vh（手機）/ 600px（桌機）
寬度：90vw（手機）/ 420px（桌機）
border-radius: 2px（acid 硬角）
旋轉 -2°（acid 「截圖」感）
```

### 4b. 卡片內容（從上到下）

```
┌──────────────────────────────────┐
│ [封面圖：佔上半 50% 卡片高度]    │
│  覆疊：左上 category 標籤        │
│        右上 [001/237] 編號       │
├──────────────────────────────────┤
│ 景點名稱（h2，Noto TC）           │
│ 距離 · 難度 · status badge       │
│ 一行描述（單行截斷）              │
│                                  │
│  ↓↓↓ 以下 200vh 詳情區（內滾） ↓↓↓
│                                  │
│  完整圖庫（橫滑）                │
│  歷史 / 由來 / 訪問建議          │
│  附近其他景點（mini list）       │
│  使用者上傳紀錄                  │
└──────────────────────────────────┘
```

### 4c. 卡片堆疊視覺

- 看到後面 1-2 張
- 後面卡片 `scale(0.95)` + `opacity(0.6)`
- 後面卡片 z-index 遞減
- 拖拉前面卡片時，後面卡片 `scale` 漸近 1.0

### 4d. 滑動視覺反饋

- 拖過閾值（100px）：邊緣染色（左滑染紅、右滑染綠、超級按鈕染金）
- 釋放：spring 飛出（`bounceStiffness 300, bounceDamping 20`）
- 撤回：spring 回彈（從畫面外飛回）

---

## 五、底部 chip 區（升級方案 C）

### 5a. layout

```
┌──────────────────────────────────────┐
│                                      │
│           卡片主體 70vh              │
│                                      │
├──────────────────────────────────────┤
│ ⏮ 撤回    👁  👁  👁  _  _          │  ← 底部 chip bar
└──────────────────────────────────────┘
            ↑
        5 個位置（依 RoutePlannerStore.selectedSpots 長度）
```

### 5b. Chip 狀態

| 狀態 | 視覺 | 互動 |
|---|---|---|
| **空位** | dashed 1px border, opacity 0.3 | 不可點 |
| **有點** | mini 吉祥物 icon（blinking mood，6-8px） | 點 → 開 mini card |
| **滿 5 個** | 所有 icon 開始 jitter 動畫（±2px 隨機抖） | 點任一個 → mini card |
| **使用者超出**（按超級按鈕但滿） | 集體 shake + toast「目前路徑已滿 5 點，點底部 icon 編輯」 | — |

### 5c. Mini Card（點 chip 後彈出）

```
┌────────────────────────────┐
│ 02 · [景點名稱]             │
│ 距離 1.2km · 中等難度        │
│                            │
│ [ ↑ 上移 ]  [ ↓ 下移 ]     │
│ [    🗑 從路徑移除      ]  │
│ [        取消              ]│
└────────────────────────────┘
```

- 從點擊位置展開（spring 動畫）
- 點背景關閉
- 操作 reuse `RoutePlannerStore`：
  - 移除 → `removeSpot(id)`
  - 上移/下移 → `reorder(oldIndex, newIndex)`

### 5d. 撤回按鈕

- 位置：chip 區左側
- icon：`⏮` 或 acid 風格迴轉箭頭
- 行為：撤回上一張卡片（無論是 pass / 加收藏 / 加路徑）
- Disabled 當 swipe history 為空

---

## 六、跟 Stage 4 / Stage 5 整合

### 6a. RoutePlannerStore reuse（核心）

- 滑卡片頁的 chip 區資料源 = `useRoutePlannerStore.selectedSpots`
- 加點 = `addSpot(spot)`（跟 RouteSheet「+ 從收藏選」同 action）
- 刪點 = `removeSpot(id)`
- reorder = `reorder(oldIndex, newIndex)`

**結果**：滑卡片頁加完點 → 切到地圖頁打開 RouteSheet → 自動看到同一份清單 ✅

### 6b. OPTIMIZE 不在滑卡片頁

滑卡片頁只負責「加 / 編輯」，**最佳化路線在地圖頁的 RouteSheet**（Stage 4 已實作 `OPTIMIZE` 按鈕）。

維持 flow：**滑卡片探索 → 切地圖規劃 → 開始導航**。

### 6c. 收藏夾整合（沿用 Stage 5）

- 右滑 / 超級按鈕加進收藏 → `useSavedStore.addSave(id)`
- 未登入：存 localStorage（key: `oddspot-saved`）
- 登入時：呼叫 `/api/saved/sync`（Step 5 已實作）

## 七、Guest Mode（沿用既有設計）

詳見 [docs/04-狀態管理/guest-mode.md](../04-狀態管理/guest-mode.md)。

新增需要：
- `useSwipeStore.skippedIds`：左滑略過的 spot id 陣列
- `useSwipeStore.history`：撤回堆疊（最近 N 個動作）
- 未登入時 `useRoutePlannerStore.selectedSpots` 也存 localStorage（key: `oddspot-route`）

### Guest 容量上限

| 資料 | 上限 | 理由 |
|---|---|---|
| 收藏夾 | 50 | localStorage quota 保險 |
| 目前路徑 | 5 | 沿用 Stage 4 `MAX_WAYPOINTS` |
| skippedIds | 200 | 一個 session 內合理上限 |
| undo history | 20 | 太多沒意義 |

## 八、空狀態

| 情境 | 文案 | 行動 |
|---|---|---|
| 附近全部滑過 | `所有怪地都被你看過了 · 試試擴大半徑` | 按鈕跳回地圖、調半徑 |
| 沒有任何 spots | `ERR_NO_WEIRD_FOUND · 你附近暫無登記有案之怪地` | — |
| 達到 skippedIds 上限 | `已略過 200 個地點 · 重置略過清單` | reset 按鈕 |

## 九、Acid 細節

- 卡片旋轉 -2°
- 邊緣 barcode sticker（左下角）
- 卡片右上角 `[001/237]` 編號（archive 風格）
- 左滑時邊緣染紅（`#ff3b3b`），右滑染綠（`#5fd9c0`），超級按鈕染金（`#ffd24a`）
- 撤回按鈕用「迴轉箭頭」icon + acid sticker 框

## 十、算法

### v1：隨機（不重複）

```typescript
// 從 spots[] 過濾掉 skippedIds + savedIds + selectedSpotsIds
// 剩下的隨機抽，不重複
const candidates = spots.filter(
  (s) =>
    !skippedIds.includes(s.id) &&
    !savedIds.includes(s.id) &&
    !selectedSpotIds.includes(s.id),
);
```

### v2 留 TODO：collaborative filter

依使用者過往收藏 / 路徑記錄推薦類似景點。

## 十一、元件結構

```
src/app/map/page.tsx      ← 地圖 / 探索雙模式入口

src/components/swipe/
  SwipeView.tsx           ← 容器，管 swipe session + 渲染卡片堆疊
  SwipeCard.tsx           ← 單張卡片（Framer Motion drag + 內滾）
  SwipeActionBar.tsx      ← 底部 skip / 加路線 / save 按鈕
  FilterSheet.tsx         ← 地圖 / 探索共用篩選 sheet
  TripPlanSheet.tsx       ← 顯示 RoutePlanner 選點，CTA 回地圖 RouteSheet

src/store/
  useSwipeStore.ts        ← skipped / lastSkippedId
  useRoutePlannerStore.ts ← selectedSpots / route / optimize
```

## 十二、技術細節

### 12a. 手勢 + 內滾衝突解法

關鍵：上下滾動跟左右拖必須**互不干擾**。

```typescript
// SwipeCard.tsx
<motion.div
  drag="x"                            // 只允許 x 軸 drag
  dragDirectionLock                    // 一旦判定方向就鎖住
  dragElastic={0.2}
  dragMomentum
>
  <div style={{ overflowY: "auto", touchAction: "pan-y" }}>
    {/* 內滾區 */}
  </div>
</motion.div>
```

`dragDirectionLock` + 內滾的 `touchAction: pan-y` 讓瀏覽器自動分派：
- 主要垂直滑 → 內滾接管
- 主要水平滑 → drag 接管

### 12b. 卡片回收

被 swipe 出去的卡片不立刻 unmount（有撤回需求），保留在 history。
畫面上最多渲染 3 張：當前 + 後 2 張（背景）。

## 十三、實作階段拆解

| 階段 | 任務 | Effort |
|---|---|---|
| 1 | `/map` 雙模式 + `useSwipeStore` 骨架 | ✅ |
| 2 | `SwipeCard` 拖拉 + 上滑詳情 | ✅ |
| 3 | 卡片堆疊 + 滑出動畫 | ✅ |
| 4 | `TripPlanSheet` 接 `useRoutePlannerStore` | ✅ |
| 5 | 單步撤回 skip | ✅ |
| 6 | 空狀態 + acid 細節 | ✅ |
| 7 | RoutePlanner localStorage 持久化 | ✅ |

**目前狀態**：第一版已落地，後續重點是完整 undo history、桌機滾輪細節。

## 十四、不要動清單

- `useSavedStore`（沿用，不另起）
- `useRoutePlannerStore`（reuse，不新增 store）
- Stage 4 的 RouteSheet / SpotPopup / MapView（探索頁只透過 `useRoutePlannerStore` 與 RouteSheet 接軌）

## 十五、開放問題（實作前再確認）

- 卡片 fetch 來源：跟地圖共用 spots[] 還是獨立 endpoint？建議共用（v1 資料量小）
- 是否要補完整 undo history（目前只救回最近一次 skip）
- 桌機滾輪行為：滾在卡片**外**怎麼處理（捲動整頁 vs 鎖住）
