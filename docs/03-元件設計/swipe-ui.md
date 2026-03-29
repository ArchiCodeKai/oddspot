# 滑卡片 UI 設計（待討論）

## 狀態：設計階段

**實作前需要討論的開放問題，詳見 `.ai-context/features/swipe/_module.md`**

---

## 設計概念

卡片堆疊式介面，每次顯示一張景點卡，使用者拖曳決定行動。

## 手勢對應

| 手勢 | 行動 |
|------|------|
| 右滑 | 收藏（呼叫 useSavedStore.addSave）|
| 左滑 | 略過（加入 skippedIds）|
| 下滑 | 跳過（同略過）|
| 點擊 | 查看景點詳情 |
| ❌ 上滑 | **不做**（iOS 手勢衝突）|

## 卡片內容

- 封面圖（全版）
- 景點名稱
- 分類標籤 + 距離
- 難度標示
- 狀態 badge

## 待決定事項

1. 資料從哪來（與地圖共用 or 獨立 fetch）
2. 滑完後行為
3. skippedIds 存哪

## Framer Motion 技術規格

使用 `drag="x"` + `onDragEnd` 判斷方向：

```typescript
// 閾值設定（待調整）
const SWIPE_THRESHOLD = 100; // px

onDragEnd={(_, info) => {
  if (info.offset.x > SWIPE_THRESHOLD) handleSwipeRight();
  if (info.offset.x < -SWIPE_THRESHOLD) handleSwipeLeft();
}}
```

spring 動效設定：
```typescript
dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
```
