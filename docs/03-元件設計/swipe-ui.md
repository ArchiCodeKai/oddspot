# 滑卡片 UI 設計

> **Status**：設計定案，待實作。
> **完整 spec**：[`docs/specs/2026-05-21-swipe-feature.md`](../specs/2026-05-21-swipe-feature.md)
> **模組現況**：[`.ai-context/features/swipe/_module.md`](../../.ai-context/features/swipe/_module.md)

本文件聚焦 UI 層細節（視覺、動畫、互動）。資料流 / store / 整合策略見 spec。

---

## 卡片尺寸

| 項目 | 手機 | 桌機 |
|---|---|---|
| 寬度 | 90vw | 420px |
| 高度（固定） | 70vh | 600px |
| 旋轉 | -2°（acid 截圖感） | -2° |
| border-radius | 2px（acid 硬角） | 2px |

下方還有 200vh 詳情區可內滾。

## 手勢對應

| 手勢 | 行動 |
|---|---|
| 左滑（>100px） | pass |
| 右滑（>100px） | 加收藏夾 |
| 超級按鈕（卡片 ⭐ icon） | 加收藏 + 加目前路徑 |
| 上下滑 / 桌機滾輪在卡片內 | 卡片內滾動 |
| 撤回箭頭（chip bar） | 撤回上一張 |

**重點**：左右滑隨時可用，不會被內滾鎖住。

## Framer Motion 拖拉設定

```typescript
<motion.div
  drag="x"                    // 只允許 x 軸
  dragDirectionLock           // 一旦判定方向就鎖
  dragElastic={0.2}
  dragMomentum
  dragTransition={{
    bounceStiffness: 300,
    bounceDamping: 20,
  }}
  onDragEnd={(_, info) => {
    if (info.offset.x > 100) handleSwipeRight();
    if (info.offset.x < -100) handleSwipeLeft();
  }}
>
  <div style={{ overflowY: "auto", touchAction: "pan-y" }}>
    {/* 內滾區 */}
  </div>
</motion.div>
```

關鍵：`dragDirectionLock` + 內滾 `touchAction: pan-y` 讓瀏覽器自動分派垂直/水平手勢。

## 卡片堆疊視覺

- 看到後面 1–2 張
- 後面卡片 `scale(0.95)` + `opacity(0.6)`
- z-index 遞減
- 拖拉前面卡片時，後面 scale 漸近 1.0（給「下一張準備好」的視覺）

## 滑動視覺反饋

- 拖過閾值（100px）：邊緣染色
  - 左滑 → 紅色 `#ff3b3b`（pass）
  - 右滑 → 綠色 `#5fd9c0`（收藏）
  - 超級按鈕 → 金色 `#ffd24a`（加路徑）
- 釋放：spring 飛出（依方向）
- 撤回：spring 從畫面外飛回

## 底部 Chip Bar

```
┌──────────────────────────────────────┐
│ ⏮ 撤回    👁  👁  👁  _  _          │
└──────────────────────────────────────┘
```

| 狀態 | 視覺 |
|---|---|
| 空位 | dashed 1px border，opacity 0.3 |
| 有點 | mini 吉祥物 icon（blinking mood，6–8px） |
| 滿 5 個 | 集體 jitter 動畫（±2px 隨機抖） |
| 超出 | 集體 shake + toast 提示 |

點 chip → 彈出 mini card（移除 / reorder），詳見 spec 第五章。

## Acid sticker 元素

- 卡片右上角：`[001/237]` 編號（archive 風格）
- 卡片左下角：mini barcode sticker
- 邊緣偶爾出現 `archive://taipei` 章戳（每 3 張隨機一張）

## 空狀態

```
┌──────────────────────────────────┐
│                                  │
│   所有怪地都被你看過了           │
│   試試擴大半徑                    │
│                                  │
│       [ 回地圖調整  ]            │
│                                  │
└──────────────────────────────────┘
```

文案 acid 化詳見 spec 第八章。
