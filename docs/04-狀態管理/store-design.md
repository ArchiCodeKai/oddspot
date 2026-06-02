# Zustand Store 設計

## 設計原則

- Store 只存 UI 狀態，**不存伺服器資料**
- 伺服器資料由 TanStack React Query 管理
- 各 Store 職責單一，不互相依賴

## 現有 Stores

### useMapStore

**路徑**：`src/store/useMapStore.ts`
**用途**：地圖頁 UI 狀態

```typescript
// 完整 interface
interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  selectedSpot: SpotMapPoint | null;
  filters: SpotFilters;
  radius: number;
  viewportBbox: Bbox | null;
  queryMode: "radius" | "viewport";
}
```

### useSavedStore

**路徑**：`src/store/useSavedStore.ts`
**用途**：Guest mode 收藏，自動同步 localStorage

```typescript
interface SavedState {
  savedSpotIds: string[];
  addSave(spotId: string): void;
  removeSave(spotId: string): void;
  isSaved(spotId: string): boolean;
  clearAll(): void; // 登入後 sync 完成時呼叫
}
```

localStorage key：`"oddspot-saved-spots"`

### useRoutePlannerStore

**路徑**：`src/store/useRoutePlannerStore.ts`
**用途**：地圖 RouteSheet 與探索 Swipe 共用的路線選點狀態
**localStorage key**：`"oddspot-route"`

```typescript
interface RoutePlannerStore {
  selectedSpots: SpotMapPoint[];
  isOpen: boolean;
  route: DirectionsResponse | null;
  isOptimizing: boolean;
  error: string | null;
  addSpot(spot: SpotMapPoint): void;
  removeSpot(id: string): void;
  reorder(oldIndex: number, newIndex: number): void;
  clear(): void;
  planInOrder(origin: LngLat | null): Promise<void>;
  optimize(origin: LngLat | null): Promise<void>;
}
```

`selectedSpots` 是「目前路徑」的唯一資料來源。Swipe 的右滑 / 打勾會呼叫 `addSpot` 並同步收藏；Swipe 的中間 + 按鈕只收藏不加入路線。地圖 RouteSheet 直接讀同一份資料做 OPTIMIZE / START。

`selectedSpots` 會持久化到 localStorage，使用者重新整理後仍保留目前路線。`addSpot` / `removeSpot` / `reorder` / `clear` / `optimize` 都會同步更新 storage。

`planInOrder()` 只依目前排序畫路線；`optimize()` 會依 Mapbox 最佳化結果重排 `selectedSpots`。

### useSwipeStore

**路徑**：`src/store/useSwipeStore.ts`
**用途**：滑卡片 session 狀態，不存路線資料

```typescript
interface SwipeState {
  skippedIds: string[];
  lastSkippedId: string | null;
  addSkipped(id: string): void;
  undoSkip(): string | null;
  clearSkipped(): void;
}
```

設計取捨：`useSwipeStore` 只處理 swipe 行為本身；路線選點放在 `useRoutePlannerStore`，避免探索頁與地圖頁出現兩份互相不同步的行程狀態。

## 擴充指南

新增 Store 步驟：
1. 在 `src/store/` 建立 `useXxxStore.ts`
2. 更新此文件
3. 更新 `src/store/README.md`
4. 更新 CLAUDE.md 的開發進度（如有必要）
