import { create } from "zustand";
import type { SpotMapPoint, SpotFilters } from "@/types/spots";

// 地圖頁的 UI 狀態
// 注意：spots 資料本身由 TanStack Query 管理，這裡只存 UI 狀態
// TanStack Query = 伺服器資料快取
// Zustand = 純 UI 狀態（選中景點、篩選器、地圖位置）

interface MapState {
  // 地圖中心點（使用者位置或台北市預設）
  center: { lat: number; lng: number };
  zoom: number;
  // 目前點擊/選中的景點，控制 SpotPopup 顯示
  selectedSpot: SpotMapPoint | null;
  // 篩選條件（分類、難度、狀態）
  filters: SpotFilters;
  // 目前視圖模式（地圖 or 卡片滑動）
  // TODO: Step 4 — 加入 viewMode 切換，共用 spots 資料
  // viewMode: "map" | "swipe";

  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  setSelectedSpot: (spot: SpotMapPoint | null) => void;
  setFilters: (filters: SpotFilters) => void;
}

export const useMapStore = create<MapState>((set) => ({
  center: { lat: 25.0478, lng: 121.5319 }, // 台北市中心預設
  zoom: 14,
  selectedSpot: null,
  filters: {},

  setCenter: (center) => set({ center }),
  setZoom: (zoom) => set({ zoom }),
  setSelectedSpot: (selectedSpot) => set({ selectedSpot }),
  setFilters: (filters) => set({ filters }),
}));
