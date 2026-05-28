# 篩選器 + 半徑選擇器 UI spec

**日期**：2026-05-21
**範圍**：`src/components/map/FilterPanel.tsx`（新）、`RadiusSelector.tsx`（整合既有 `RadiusToggle`）
**目標**：補完 `useMapStore.filters` + `radius` 的 UI 控制
**狀態**：第一版已實作。FilterSheet 已接 `useMapStore.filters`，`/api/spots` 已支援 category / status / difficulty 查詢；RadiusToggle 沿用既有 segmented control。

---

## 一、現狀

### 已存在
- `useMapStore.filters`：資料結構已存在（category / status / difficulty）
- `useMapStore.radius`：5KM / 10KM / 20KM / 50KM 切換邏輯已存在
- 左上角 `FILTER` 按鈕 + 「6」徽章（顯示啟用篩選數）

### 已補齊
- FilterSheet UI 元件（目前位於 `src/components/swipe/FilterSheet.tsx`，地圖 / 探索共用）
- RadiusToggle segmented control
- Filter 套用後 trigger spots refetch
- API 查詢支援 `categories` / `status` / `difficulty`

### 後續可改善
- spec 原本規劃左側 slide-in panel；目前實作是 bottom sheet
- spec 原本規劃 status / difficulty 多選；目前 UI 為單選，但資料流支援陣列

---

## 二、FilterPanel

### 2a. 觸發

左上角 `FILTER` 按鈕（已有，含「6」徽章）。

### 2b. 進場動畫

從**左邊**滑入（spring，stiffness 320, damping 34）。
Backdrop 半透明 `var(--background-rgb) / 0.6` + blur 4px。

### 2c. 佈局

```
┌───────────────────────────────┐
│ archive://filter · 過濾條件   │  ← header
│                          ✕   │
├───────────────────────────────┤
│ 類型                          │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │廢墟  │ │廟宇  │ │巨物  │   │  ← 章戳貼紙，歪斜不平整
│ └──────┘ └──────┘ └──────┘   │
│ ┌──────┐ ┌──────┐ ┌──────┐   │
│ │ kitsch│ │街景  │ │ ... │   │
│ └──────┘ └──────┘ └──────┘   │
├───────────────────────────────┤
│ 狀態                          │
│ [active] [uncertain] [missing]│
├───────────────────────────────┤
│ 難度                          │
│ [easy] [medium] [hard]        │
├───────────────────────────────┤
│  [ 重置 ]    [ 套用（6 項）] │
└───────────────────────────────┘
```

### 2d. 章戳貼紙視覺（acid 風格）

每個 category / status / difficulty 選項都是一張**章戳貼紙**：

- 隨機旋轉 `-8° 到 +8°`
- 隨機 y offset `-4px 到 +4px`（不平整排列）
- 周圍輕微 drop shadow（像實體貼紙）
- 未選中：底色 transparent，1px dashed border
- 已選中：底色實心（依 category 主題色 / status 燈號 / difficulty 階調）
- Hover：scale(1.05) + 旋轉趨近 0°

參考視覺：Berlin agency 那種「歪斜 logo 貼紙堆疊」感（B-grade archive 視覺）。

### 2e. 多選邏輯

- category：多選 OR（選了 a + b → 顯示 a 或 b 的 spots）
- status：多選 OR
- difficulty：多選 OR
- 跨組：AND（category 為 X AND status 為 Y AND difficulty 為 Z）

### 2f. 套用按鈕

- 顯示「套用（N 項）」N = 啟用的篩選總數
- 按下 → `useMapStore.setFilters(draft)` → trigger spots refetch
- 重置 → 全部清空

### 2g. 啟用數徽章

左上角 FILTER 按鈕右側「N」徽章持續顯示啟用篩選總數（**沿用既有實作，不改動**）。

---

## 三、RadiusSelector

### 3a. 整合策略

跟既有 `RadiusToggle.tsx`（5KM / 10KM / 20KM / 50KM）整合：

- 視覺保留 segmented control（不改 slider）
- 視覺對齊 acid 風格（已有，沿用）
- 套用後 trigger spots refetch（已有，沿用）

### 3b. 不改的事

- 不加 slider（segmented 比較精準、好點）
- 不另起新元件（在 `RadiusToggle.tsx` 內微調即可）

---

## 四、State 流

```
[FilterPanel]                  [useMapStore]
draft (local state)            filters
   ↓ 套用                       ↓
setFilters(draft)         ─→  setFilters
                               ↓ trigger
                          /api/spots refetch
                               ↓
                          spots (recompute)

[RadiusToggle]
clicked km            ─→  setRadius
                               ↓ trigger
                          /api/spots refetch
                               ↓
                          spots (recompute)
```

**兩個 state 互不干擾**：
- filter 改變不重置 radius
- radius 改變不重置 filter
- 兩者同時改 → 兩次 refetch 用 React Query debounce 合併

---

## 五、章戳貼紙的隨機性處理

問題：「歪斜貼紙」不能每次 render 重算 rotation（否則 hover/state 變更會抖）。

解法：給每個 option 一個**穩定的 hash**（用 option key）：

```typescript
// utils
function stickerRotation(key: string): number {
  const hash = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((hash % 17) - 8); // -8 ~ +8 度
}

function stickerOffset(key: string): number {
  const hash = key.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return ((hash % 9) - 4); // -4 ~ +4 px
}
```

這樣同一個 category 永遠固定的 rotation / offset，但不同 category 之間呈現「隨機歪斜」。

---

## 六、元件結構

```
src/components/map/
  FilterPanel.tsx          ← 新增
  FilterStickerOption.tsx  ← 章戳貼紙單元（可選，組件複用）
  RadiusToggle.tsx         ← 改寫（acid 化）

src/lib/ui/
  sticker-rotation.ts      ← 穩定 hash 輔助
```

---

## 七、實作階段拆解

| 階段 | 任務 | Effort |
|---|---|---|
| 1 | FilterPanel 容器 + 進場動畫 | S |
| 2 | FilterStickerOption 視覺 | M |
| 3 | 套用 / 重置邏輯接 useMapStore | S |
| 4 | RadiusToggle acid 化 | S |
| 5 | 啟用數徽章邏輯（如果現有不夠用） | XS |

**總工時**：3-5h。

---

## 八、開放問題

- 篩選 panel 在桌機要不要改成 dropdown 或維持 sheet？建議手機/桌機都用 sheet（acid 風格更統一）
- category 8 種要不要分組（例如「人造怪地」/「廢棄空間」）？建議 v1 不分組
