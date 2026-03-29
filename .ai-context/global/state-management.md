# 狀態管理規範

## 分工原則

| 狀態類型 | 工具 | 說明 |
|----------|------|------|
| 伺服器資料 | TanStack React Query | API 呼叫、快取、重新 fetch |
| UI 狀態 | Zustand | 選中景點、篩選器、地圖位置 |
| Guest 收藏 | Zustand + localStorage | useSavedStore（persist 中介層）|
| 表單狀態 | local useState | 不需要跨元件的臨時狀態 |

## 現有 Stores

### useMapStore（`src/store/useMapStore.ts`）
地圖頁 UI 狀態。

```typescript
// 使用方式
import { useMapStore } from "@/store/useMapStore";
const { selectedSpot, setSelectedSpot, filters, setFilters } = useMapStore();
```

| 狀態 | 型別 | 說明 |
|------|------|------|
| `center` | `{lat, lng}` | 地圖中心點 |
| `zoom` | `number` | 縮放層級 |
| `selectedSpot` | `SpotMapPoint \| null` | 目前選中景點（控制 Popup）|
| `filters` | `SpotFilters` | 篩選條件 |

### useSavedStore（`src/store/useSavedStore.ts`）
Guest mode 收藏，自動持久化到 localStorage。

```typescript
// 使用方式
import { useSavedStore } from "@/store/useSavedStore";
const { isSaved, addSave, removeSave } = useSavedStore();
```

| 方法 | 說明 |
|------|------|
| `addSave(spotId)` | 加入收藏 |
| `removeSave(spotId)` | 移除收藏 |
| `isSaved(spotId)` | 是否已收藏 |
| `clearAll()` | 登入 sync 後清空 |

## React Query 使用模式

```typescript
// 標準景點資料 fetch（待實作）
// 目前 map/page.tsx 用 fetch，Step 2 完成後可升級成 React Query
import { useQuery } from "@tanstack/react-query";

const { data, isLoading } = useQuery({
  queryKey: ["spots", lat, lng, radius],
  queryFn: () => fetch(`/api/spots?lat=${lat}&lng=${lng}&radius=${radius}`)
    .then(res => res.json()),
  staleTime: 5 * 60 * 1000, // 5 分鐘
});
```

## TODO（Step 4）
- 滑卡片需要 `skippedIds: string[]` 狀態（session 內略過的景點）
- 討論是否加入 useMapStore 或獨立一個 useSwipeStore
