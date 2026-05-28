import { create } from "zustand";
import type { SpotMapPoint } from "@/types/spots";
import {
  fetchOptimizedRoute,
  fetchRouteInOrder,
  type DirectionsResponse,
} from "@/lib/mapbox/directions";
import {
  getBrowserRouteStorage,
  readRouteSpotsFromStorage,
  writeRouteSpotsToStorage,
} from "./routePlannerPersistence";

// 路線規劃 store。
// Stage 3 骨架：selectedSpots + add/remove/clear
// Stage 4 擴充：sheet 開關、route 結果、optimize 流程、reorder

const MAX_WAYPOINTS = 5;

function persistRouteSpots(spots: SpotMapPoint[]) {
  writeRouteSpotsToStorage(getBrowserRouteStorage(), spots);
}

interface LngLat {
  lat: number;
  lng: number;
}

interface RoutePlannerStore {
  // 選點清單（不包含使用者位置；使用者位置由呼叫 optimize() 時傳入當 origin）
  selectedSpots: SpotMapPoint[];

  // Sheet 開關
  isOpen: boolean;

  // 路線結果
  route: DirectionsResponse | null;
  isOptimizing: boolean;
  error: string | null;

  // selection actions
  addSpot: (spot: SpotMapPoint) => void;
  removeSpot: (id: string) => void;
  reorder: (oldIndex: number, newIndex: number) => void;
  clear: () => void;

  // sheet actions
  toggleSheet: () => void;
  openSheet: () => void;
  closeSheet: () => void;

  // routing
  optimize: (origin: LngLat | null) => Promise<void>;
  planInOrder: (origin: LngLat | null) => Promise<void>;
}

export const useRoutePlannerStore = create<RoutePlannerStore>((set, get) => ({
  selectedSpots: readRouteSpotsFromStorage(getBrowserRouteStorage()),
  isOpen: false,
  route: null,
  isOptimizing: false,
  error: null,

  addSpot: (spot) =>
    set((state) => {
      // 避免重複加入
      if (state.selectedSpots.some((s) => s.id === spot.id)) return state;
      // 上限 5 個 waypoint
      if (state.selectedSpots.length >= MAX_WAYPOINTS) return state;
      const selectedSpots = [...state.selectedSpots, spot];
      persistRouteSpots(selectedSpots);
      // 新增點時 sheet 自動展開、清掉舊路線（因為點變了）
      return {
        selectedSpots,
        isOpen: true,
        route: null,
        error: null,
      };
    }),

  removeSpot: (id) =>
    set((state) => {
      const selectedSpots = state.selectedSpots.filter((s) => s.id !== id);
      persistRouteSpots(selectedSpots);
      return {
        selectedSpots,
        route: null,
        error: null,
      };
    }),

  reorder: (oldIndex, newIndex) =>
    set((state) => {
      if (
        oldIndex < 0 ||
        oldIndex >= state.selectedSpots.length ||
        newIndex < 0 ||
        newIndex >= state.selectedSpots.length ||
        oldIndex === newIndex
      ) {
        return state;
      }
      const next = [...state.selectedSpots];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      persistRouteSpots(next);
      return { selectedSpots: next, route: null, error: null };
    }),

  clear: () => {
    persistRouteSpots([]);
    set({
      selectedSpots: [],
      route: null,
      error: null,
      isOpen: false,
    });
  },

  toggleSheet: () => set((state) => ({ isOpen: !state.isOpen })),
  openSheet: () => set({ isOpen: true }),
  closeSheet: () => set({ isOpen: false }),

  planInOrder: async (origin) => {
    const { selectedSpots } = get();

    const minSpots = origin ? 1 : 2;
    if (selectedSpots.length < minSpots) {
      set({ error: "至少需要兩個點才能規劃路線" });
      return;
    }

    set({ isOptimizing: true, error: null });

    try {
      const inputPoints: LngLat[] = origin
        ? [origin, ...selectedSpots.map((s) => ({ lat: s.lat, lng: s.lng }))]
        : selectedSpots.map((s) => ({ lat: s.lat, lng: s.lng }));

      const result = await fetchRouteInOrder({
        origin: inputPoints[0],
        destination: inputPoints[inputPoints.length - 1],
        waypoints: inputPoints.slice(1, -1),
      });

      set({
        route: result,
        isOptimizing: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "路線規劃失敗",
        isOptimizing: false,
      });
    }
  },

  optimize: async (origin) => {
    const { selectedSpots } = get();

    // 有 origin（使用者位置）時，最少需要 1 個 spot（origin + spot = 2 點）
    // 沒 origin 時，最少需要 2 個 spot
    const minSpots = origin ? 1 : 2;
    if (selectedSpots.length < minSpots) {
      set({ error: "至少需要兩個點才能規劃路線" });
      return;
    }

    set({ isOptimizing: true, error: null });

    try {
      const inputPoints: LngLat[] = origin
        ? [origin, ...selectedSpots.map((s) => ({ lat: s.lat, lng: s.lng }))]
        : selectedSpots.map((s) => ({ lat: s.lat, lng: s.lng }));

      const result = await fetchOptimizedRoute({
        origin: inputPoints[0],
        destination: inputPoints[inputPoints.length - 1],
        waypoints: inputPoints.slice(1, -1),
      });

      // 套用最佳化後的順序到 selectedSpots
      // optimizedOrder[newPos] = originalInputIdx
      // - 有 origin：input[0] 是 origin，input[i] (i>=1) 是 selectedSpots[i-1]
      //   過濾掉 originalIdx === 0 後，剩下的就是 spots 的新順序
      // - 沒 origin：input[i] 是 selectedSpots[i]，直接 map
      let reorderedSpots: SpotMapPoint[];
      if (origin) {
        reorderedSpots = result.optimizedOrder
          .filter((originalIdx) => originalIdx !== 0)
          .map((originalIdx) => selectedSpots[originalIdx - 1])
          .filter((s): s is SpotMapPoint => Boolean(s));
      } else {
        reorderedSpots = result.optimizedOrder
          .map((originalIdx) => selectedSpots[originalIdx])
          .filter((s): s is SpotMapPoint => Boolean(s));
      }

      // 若映射後數量對得起來才套用，否則退回原順序避免漏點
      const finalSpots =
        reorderedSpots.length === selectedSpots.length
          ? reorderedSpots
          : selectedSpots;

      set({
        selectedSpots: finalSpots,
        route: result,
        isOptimizing: false,
      });
      persistRouteSpots(finalSpots);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "路線規劃失敗",
        isOptimizing: false,
      });
    }
  },
}));
