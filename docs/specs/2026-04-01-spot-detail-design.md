# Step 3：景點詳情頁設計規格

**日期**：2026-04-01
**狀態**：已核准，實作中

---

## 目標

補全地圖頁 Popup「查看詳情」按鈕的跳轉目標頁面，讓使用者可以看到景點的完整資訊。

---

## 架構決策

- `page.tsx` 採用 **Server Component**，直接用 Prisma 查詢 DB，無需 loading state
- **Action Bar**（收藏 + 導航）抽為獨立 `"use client"` island（需要 `window.open`、之後接 Zustand）
- 同步建立 `/api/spots/[id]` route，供未來 client 呼叫使用

---

## 新建 / 修改檔案

| 檔案 | 動作 |
|------|------|
| `src/app/api/spots/[id]/route.ts` | 新建 |
| `src/types/spots.ts` | 新增 `SpotDetail` 型別 |
| `src/app/spots/[id]/page.tsx` | 改寫（server component） |
| `src/components/spots/SpotActionBar.tsx` | 新建（client island） |

---

## API 規格：`GET /api/spots/[id]`

**回應（成功）**：
```json
{
  "success": true,
  "data": {
    "id": "...",
    "name": "...",
    "images": ["url1", "url2"],   // 已解析，非 JSON string
    ...
  }
}
```

**回應（找不到）**：HTTP 404 + `{ "success": false, "error": "找不到景點" }`

---

## 頁面版型

```
┌──────────────────────────┐
│  Hero 圖片（55vh）        │  bg-zinc-800 fallback，object-cover
│  ← 返回按鈕（左上角）     │  glassmorphism: bg-white/20 backdrop-blur-md
├──────────────────────────┤  rounded-t-3xl -mt-6 overlap
│  bg-zinc-900 圓角內容區   │
│  - 分類 badge + 狀態 badge│
│  - 名稱（中）             │
│  - 名稱（英，如有）        │
│  - 地址（如有）            │
│  - 描述（如有）            │
│  - 傳說（如有，分隔線隔開）│
│  - 推薦到訪時段（如有）    │
│  pb-32（預留 action bar） │
└──────────────────────────┘
│  SpotActionBar（fixed bottom）
│  bg-zinc-900/80 backdrop-blur-md border-t border-white/5
│  [♡ 收藏（secondary）] [導航前往（primary）]
└──────────────────────────┘
```

---

## 元件細節

### Hero 圖片
- 以 CSS `background-image` + `bg-cover bg-center` 呈現
- 無圖片時顯示 `bg-zinc-800`
- 圖片上疊加 `bg-gradient-to-b from-black/30 to-transparent`（提升返回按鈕可讀性）

### SpotActionBar props
```typescript
interface SpotActionBarProps {
  lat: number;
  lng: number;
  spotId: string;
}
```
- 導航 URL：`https://www.google.com/maps/dir/?api=1&destination={lat},{lng}`
- 收藏按鈕：v1 無功能，加 TODO 註解（Step 5 接 useSavedStore）

---

## 未來擴充（不在 v1 範圍）

- 圖片輪播（多張 swipe）
- 收藏功能（Step 5 NextAuth + Zustand sync）
- visitCount 統計更新
