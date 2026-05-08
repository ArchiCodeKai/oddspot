import { create } from "zustand";
import type { SpotMapPoint } from "@/types/spots";

// Stage 3 骨架：只支援 add / remove / clear。
// Stage 4 才會加：route, optimize, isOpen, toggleSheet 等。
const MAX_WAYPOINTS = 5;

interface RoutePlannerStore {
  selectedSpots: SpotMapPoint[];
  addSpot: (spot: SpotMapPoint) => void;
  removeSpot: (id: string) => void;
  clear: () => void;
}

export const useRoutePlannerStore = create<RoutePlannerStore>((set) => ({
  selectedSpots: [],
  addSpot: (spot) =>
    set((state) => {
      // 避免重複加入
      if (state.selectedSpots.some((s) => s.id === spot.id)) return state;
      // 上限 5 個 waypoint
      if (state.selectedSpots.length >= MAX_WAYPOINTS) return state;
      return { selectedSpots: [...state.selectedSpots, spot] };
    }),
  removeSpot: (id) =>
    set((state) => ({
      selectedSpots: state.selectedSpots.filter((s) => s.id !== id),
    })),
  clear: () => set({ selectedSpots: [] }),
}));
