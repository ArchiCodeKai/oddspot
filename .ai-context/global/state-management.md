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
收藏的單一 source of truth。未登入時等同 localStorage 快取；登入後由 store 內部自動同步後端 `/api/saved`。
只持久化 `savedSpotIds`（`partialize`），`userId` 不落地、每次由 session 重設。

```typescript
// 使用方式（建議用 reactive selector 讀取，hydrate / 樂觀更新後才會即時反映）
import { useSavedStore } from "@/store/useSavedStore";
const isSaved = useSavedStore((s) => s.savedSpotIds.includes(spotId));
const addSave = useSavedStore((s) => s.addSave);
```

| 方法 | 說明 |
|------|------|
| `addSave(spotId)` | 加入收藏；登入態下樂觀更新後 POST `/api/saved`，失敗自動還原 |
| `removeSave(spotId)` | 移除收藏；登入態下樂觀更新後 DELETE `/api/saved/[spotId]`，失敗自動還原 |
| `isSaved(spotId)` | 是否已收藏 |
| `setUserId(userId)` | 由 `useAuthSync` 在登入狀態變更時設定；決定是否同步後端 |
| `hydrateFromServer(spotIds)` | 登入後把 DB 完整收藏載回 store（取代舊版 sync 後清空）|
| `clearAll()` | 登出時清掉快取 |

### useRoutePlannerStore（`src/store/useRoutePlannerStore.ts`）
地圖 RouteSheet 與探索 Swipe 共用的路線選點狀態，`selectedSpots` 會持久化到 localStorage key `oddspot-route`。

| 方法 | 說明 |
|------|------|
| `addSpot(spot)` | 加入目前路線，最多 5 點 |
| `removeSpot(id)` | 從目前路線移除 |
| `reorder(oldIndex, newIndex)` | 調整路線順序 |
| `clear()` | 清空目前路線與 localStorage |
| `optimize(origin)` | 呼叫 Mapbox Directions 並套用最佳化後順序 |

### useActionToastStore（`src/store/useActionToastStore.ts`）
寫入動作（收藏等）完成後的全域提示狀態，由 layout 掛載的 `ActionToast` 元件消費。
訊息可附「去哪看結果」入口連結（如收藏成功 → `/saved`）；`nonce` 讓連續觸發重置自動消失計時。

| 方法 | 說明 |
|------|------|
| `show(message, href?, linkLabel?)` | 顯示提示；有 href 時 toast 內出現可點連結 |
| `clear()` | 清除提示（自動消失或點連結後） |

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
