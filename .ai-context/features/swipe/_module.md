# 滑卡片功能模組（Step 4）

## 狀態：設計階段，待討論後實作

以下為目前規劃，**實作前需要跟使用者確認以下三個開放問題**。

## 開放問題（實作前必須討論）

### Q1：卡片資料來源
**選項 A**：跟地圖共用同一份 spots 資料（`map/page.tsx` 統一管理）
- 優點：不多一次 API 呼叫，切換視圖資料一致
- 缺點：地圖不需要完整 description，卡片需要

**選項 B**：獨立 API endpoint `/api/spots/swipe`，每頁 fetch
- 優點：可以做 cursor-based pagination，無限滑動
- 缺點：切換視圖時資料不同步

**目前傾向**：選項 A（v1 資料量小，共用即可）

### Q2：滑完後的行為
- 附近景點全部滑完時，是否 load more？
- 是擴大半徑？還是顯示「附近沒有更多景點」？

### Q3：略過的景點
- 左滑略過的景點，同一 session 是否不再出現？
- 使用 `skippedIds: string[]` 存在 session storage 或 Zustand

## 元件計畫

```
src/components/swipe/
  SwipeView.tsx      — 卡片堆疊容器
  SpotCard.tsx       — 單張景點卡片（Framer Motion drag）
  SwipeActions.tsx   — 底部操作按鈕（X / ♥）
```

## 手勢設計

- 右滑：收藏（呼叫 useSavedStore.addSave）
- 左滑：略過（加入 skippedIds）
- 下滑：跳過（同略過）
- **不做「上滑查看更多」**（與 iOS 原生手勢衝突）

## Framer Motion 滑動參考

```typescript
// SpotCard 拖曳核心（概念示意，實作前討論確認）
<motion.div
  drag="x"
  dragConstraints={{ left: 0, right: 0 }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 100) handleSwipeRight();
    if (info.offset.x < -100) handleSwipeLeft();
  }}
>
```
