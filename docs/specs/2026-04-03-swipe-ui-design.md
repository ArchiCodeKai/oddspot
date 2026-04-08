# Step 4：滑卡片 UI + Guest Mode 設計規格

**日期**：2026-04-03
**狀態**：實作中

---

## 實作範圍

✅ 完整切版 + 基本互動（drag、按鈕、toast、✓ 動畫、bottom sheet）
✅ useSwipeStore 建立（skippedIds + tripSpotIds）
✅ Bottom Tab Bar（地圖 / 探索）
✅ 桌機鍵盤/按鈕導航（←→ 滑動，↑↓ 捲動）
❌ 路線最佳化演算法（TODO 註解）
❌ 篩選實際過濾 spots（state 建好但不接 API）

---

## 架構

```
map/page.tsx
├── viewMode: "map" | "swipe"（local state）
├── spots data（共用，兩個 view 用同一份）
├── <BottomTabBar>（固定底部）
├── viewMode === "map" → <MapView>
└── viewMode === "swipe" → <SwipeView>
```

---

## 新建檔案

| 檔案 | 說明 |
|------|------|
| `src/store/useSwipeStore.ts` | skippedIds + tripSpotIds（max 5） |
| `src/components/layout/BottomTabBar.tsx` | 地圖/探索 tab |
| `src/components/swipe/SwipeView.tsx` | 滑卡片容器 |
| `src/components/swipe/SwipeCard.tsx` | 單張卡片（framer-motion） |
| `src/components/swipe/SwipeActionBar.tsx` | X / + / ✓ 按鈕列 |
| `src/components/swipe/FilterSheet.tsx` | 篩選底部 sheet（切版） |

---

## SwipeView 版型

```
┌──────────────────────────────────────┐
│  篩選按鈕（左上）   2/5 行程計數（右上） │
│                                       │
│  ┌───────────────────────────────┐    │
│  │  封面圖（上半部，固定）         │    │ ← 後方疊縮小陰影卡
│  ├───────────────────────────────┤    │
│  │  ▼ 可捲動內容區               │    │
│  │  分類 badge + 狀態 + 難度      │    │
│  │  景點名稱（大）                │    │
│  │  英文名稱                     │    │
│  │  地址                        │    │
│  │  描述                        │    │
│  │  傳說                        │    │
│  │  推薦時段                    │    │
│  │  查看完整詳情 →               │    │
│  └───────────────────────────────┘    │
│                                       │
│  [ X 跳過 ]  [ + 加入行程 ]  [ ✓ 收藏 ] │
└──────────────────────────────────────┘
```

---

## 按鈕行為

| 按鈕/操作 | 行為 |
|----------|------|
| X / 左滑 | skippedIds += id，切下一張 |
| + | tripSpotIds += id（max 5），滿了顯示 toast |
| ✓ / 右滑 | useSavedStore.addSave，icon 短暫變 ♡，切下一張 |
| ↑↓ / 滾輪 | 卡片內容捲動 |
| ←→ / 鍵盤 | 左滑/右滑 |

Toast：「今日行程已達上限（5 個地點）」，2.5 秒消失

---

## 桌機導航按鈕（右側）

- ← 觸發左滑（跳過）
- → 觸發右滑（收藏）
- ↑↓ 捲動卡片內容
- 僅在 `md:` breakpoint 以上顯示

---

## FilterSheet 內容（底部 sheet，v1 切版）

- 景點類型：彩色 chip 多選（8 個分類，使用 CATEGORY_COLORS）
- 難度：3 格 toggle（容易 / 普通 / 困難）
- 狀態：3 格 toggle（可探索 / 狀況不明 / 已消失）
- 按鈕：「重設」（次要）+ 「套用篩選」（主要）
- v1 套用不實際過濾，UI 關閉即可

---

## useSwipeStore

```typescript
interface SwipeState {
  skippedIds: string[];
  tripSpotIds: string[];        // max 5，session only（不 persist）
  addSkipped(id: string): void;
  addToTrip(id: string): boolean; // 回傳 false 代表已滿
  removeFromTrip(id: string): void;
  isInTrip(id: string): boolean;
  clearSession(): void;
}
```

---

## 未來擴充（不在 v1）

- 路線最佳化：Haversine + 最近鄰演算法，結果丟進 Google Maps 多點導航 URL
- 篩選接 API（useMapStore.filters）
- 評論區（v2）
