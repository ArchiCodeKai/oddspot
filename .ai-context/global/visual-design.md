# 視覺設計規範

> **版本說明：** 本文件為 v1 基礎規範。v2 (Acid / Y2K) 方向的覆寫規則請見 `.ai-context/global/design-direction-v2.md`，以 v2 為優先。

## 設計方向

OddSpot 的核心調性：**神秘、探索感、台灣在地奇景**。
設計上要讓使用者感受到「我正在發現別人不知道的地方」。

---

## 色彩系統

### 基底色
- 背景：`bg-zinc-950`（深黑，主要頁面底色）
- 次層背景：`bg-zinc-900`（內容區塊）
- 邊框/分隔線：`bg-zinc-800`
- 主要文字：`text-white`
- 次要文字：`text-zinc-400`
- 說明文字：`text-zinc-500`

### 強調色
- 白色 CTA：`bg-white text-zinc-900`（主要行動按鈕）
- 半透明：`bg-white/10`、`bg-black/30`（Glassmorphism 用）

### 分類顏色（Badge、標記）
```typescript
const CATEGORY_COLORS = {
  "weird-temple": "#f97316",
  "abandoned": "#6b7280",
  "giant-object": "#3b82f6",
  "kitsch": "#ec4899",
  "marginal-architecture": "#14b8a6",
  "urban-legend": "#8b5cf6",
  "absurd-landscape": "#22c55e",
  "odd-shopfront": "#eab308",
};
```

---

## 頁面風格對應

| 頁面 | 背景 | 說明 |
|------|------|------|
| Landing page | `bg-zinc-950` | 深色，沉浸感 |
| 地圖頁 | Google Maps | 全螢幕，深色 Loading 狀態 |
| 景點詳情頁 | 混搭（Hero 圖 + 深色內容區） | 見下方詳細說明 |
| 滑卡片（Step 4） | `bg-zinc-950` | 維持深色調性 |

---

## 景點詳情頁版型規範

### 整體結構
```
┌──────────────────────────┐
│  Hero 圖片（全螢幕寬）    │  ← 圖片 + 返回按鈕（Glassmorphism）
│  高度：55-60vh           │
├──────────────────────────┤
│  內容區（bg-zinc-900）    │  ← 深色底色，圓角往上蓋住圖片
│  - 分類 badge + 狀態     │
│  - 名稱（中 + 英）        │
│  - 地址                  │
│  - 描述                  │
│  - 傳說（如有）           │
│  - 推薦到訪時段           │
└──────────────────────────┘
│  底部固定 Action Bar      │  ← Glassmorphism（backdrop-blur）
│  收藏按鈕 ｜ 導航按鈕    │
└──────────────────────────┘
```

### Hero 區
- 圖片全寬，高度 `55vh`，`object-cover`
- 若多張圖：顯示小圓點指示器（dots indicator）
- 返回按鈕：左上角，Glassmorphism 風格
  - `bg-white/20 backdrop-blur-md border border-white/10`
  - 圓形，固定於圖片上方

### 內容區
- `bg-zinc-900 rounded-t-3xl`（圓角蓋住 Hero 圖底部，做出層疊感）
- `margin-top: -24px`（往上 overlap Hero 區）
- padding：`px-5 pt-6 pb-32`（底部留空給 Action Bar）

### 底部 Action Bar
- `fixed bottom-0 left-0 right-0`
- `bg-zinc-900/80 backdrop-blur-md border-t border-white/5`
- 兩個按鈕：收藏（secondary）+ 導航至 Google Maps（primary）

---

## 元件規範

### Badge（分類 / 狀態 / 難度）
- 分類：使用 CATEGORY_COLORS 對應色，`bg-[color]/15 text-[color]`（低飽和背景）
- 狀態：使用 STATUS_COLORS（已定義於 `src/lib/constants/status.ts`）
- 難度：純文字 + `text-zinc-400`

### 按鈕
- 主要 CTA（白色）：`bg-white text-zinc-900 rounded-xl`
- 次要（框線）：`border border-zinc-700 text-zinc-300 rounded-xl`
- Glassmorphism：`bg-white/20 backdrop-blur-md border border-white/10 text-white`

### 圖片
- Seed data 使用 `/public/spots/xxx.jpg`（本地靜態）
- v2 Cloudinary URL 格式相同，無需額外處理
- 圖片載入失敗時顯示 `bg-zinc-800` 佔位符

---

## 2026 設計趨勢採用說明

採用以下趨勢，符合 OddSpot 探索感品牌：

| 趨勢 | 採用方式 |
|------|---------|
| Glassmorphism（回歸） | 返回按鈕、底部 Action Bar backdrop-blur |
| Emotionally Aware（深色調性） | 全站深色系，強化神秘探索感 |
| Motion-first | 圖片輪播、頁面進場（framer-motion，Step 後續可加） |
| Adaptive Color（分類顏色） | 每個分類有對應色彩，視覺識別 |

不採用以下趨勢（不符合 OddSpot 調性）：
- Brutalism（太粗獷，與在地溫度感衝突）
- 3D holographic（過重，行動端效能考量）

---

## 注意事項

- **不修改 `globals.css`**（全域限制）
- **不修改 `tailwind.config`**（全域限制）
- 所有自定義樣式使用 Tailwind utility class 或 inline style
- 顏色若無對應 Tailwind class，使用 `style={{ color: "#f97316" }}` 方式
