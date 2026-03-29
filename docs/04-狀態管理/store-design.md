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
  // TODO Step 4: viewMode: "map" | "swipe"
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

## 計畫中的 Store（Step 4）

### useSwipeStore（討論中）

可能的結構：
```typescript
interface SwipeState {
  skippedIds: string[];     // session 內略過的景點
  addSkipped(id: string): void;
  clearSkipped(): void;
}
```

是否需要獨立 store，或合併進 useMapStore，待 Step 4 討論決定。

## 擴充指南

新增 Store 步驟：
1. 在 `src/store/` 建立 `useXxxStore.ts`
2. 更新此文件
3. 更新 `src/store/README.md`
4. 更新 CLAUDE.md 的開發進度（如有必要）
