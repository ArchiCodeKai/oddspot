# 狀態管理規範

## 分工原則

| 狀態類型 | 工具 | 說明 |
|----------|------|------|
| 伺服器資料 | TanStack React Query | API 呼叫、快取、重新 fetch |
| UI 狀態 | Zustand | 選中景點、篩選器、地圖位置 |
| Guest 收藏 | Zustand + localStorage | useSavedStore（persist 中介層）|
| Guest 路線選點 | Zustand + localStorage | useRoutePlannerStore（`oddspot-route`）|
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

### useRoutePlannerStore（`src/store/useRoutePlannerStore.ts`）
地圖 RouteSheet 與探索 Swipe 共用的路線選點狀態，`selectedSpots` 會持久化到 localStorage key `oddspot-route`。

| 方法 | 說明 |
|------|------|
| `addSpot(spot)` | 加入目前路線，最多 5 點 |
| `removeSpot(id)` | 從目前路線移除 |
| `reorder(oldIndex, newIndex)` | 調整路線順序 |
| `clear()` | 清空目前路線與 localStorage |
| `optimize(origin)` | 呼叫 Mapbox Directions 並套用最佳化後順序 |

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

## TODO
- 評估是否需要完整 swipe history（目前只支援救回最近一次 skip）
