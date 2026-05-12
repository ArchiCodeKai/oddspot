import { create } from "zustand";
import type { SpotMapPoint, SpotFilters } from "@/types/spots";

// 地圖頁的 UI 狀態
// 注意：spots 資料本身由 TanStack Query 管理，這裡只存 UI 狀態
// TanStack Query = 伺服器資料快取
// Zustand = 純 UI 狀態（選中景點、篩選器、查詢條件、地圖位置）

// 經緯度 bounding box（地圖視窗範圍）
export interface Bbox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

// 查詢模式：
//   "radius"   = 以使用者位置為中心 + 半徑（適合「找附近」）
//   "viewport" = 用當前地圖視窗 bbox（適合「看這區域有什麼」）
// 使用者拖曳/縮放地圖 → 自動切到 viewport；點 RadiusToggle 切回 radius
export type QueryMode = "radius" | "viewport";

interface MapState {
  // 地圖中心點（使用者位置或台北市預設）
  center: { lat: number; lng: number };
  zoom: number;
  // 目前點擊/選中的景點，控制 SpotPopup 顯示
  selectedSpot: SpotMapPoint | null;
  // 篩選條件（分類、難度、狀態）
  filters: SpotFilters;

  // 雙模式查詢控制
  radius: number;            // km，5 / 10 / 20 / 50
  viewportBbox: Bbox | null; // 當前地圖視窗範圍（onMoveEnd 寫入）
  queryMode: QueryMode;

  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setSelectedSpot: (spot: SpotMapPoint | null) => void;
  setFilters: (filters: SpotFilters) => void;

  setRadius: (radius: number) => void;
  setViewportBbox: (bbox: Bbox | null) => void;
  setQueryMode: (mode: QueryMode) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: { lat: 25.0478, lng: 121.5319 }, // 台北市中心預設
  zoom: 14,
  selectedSpot: null,
  filters: {},

  radius: 20,           // 預設 20km — 比 5km 友善，初次打開就看得到附近多數景點
  viewportBbox: null,   // 首次 mount 還沒拿到 bbox
  queryMode: "radius",  // 預設 radius 模式

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedSpot: (selectedSpot) => set({ selectedSpot }),
  setFilters: (filters) => set({ filters }),

  setRadius: (radius) => set({ radius }),
  setViewportBbox: (viewportBbox) => set({ viewportBbox }),
  setQueryMode: (queryMode) => set({ queryMode }),
}));
