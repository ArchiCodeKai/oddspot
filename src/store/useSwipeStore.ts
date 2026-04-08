import { create } from "zustand";

const MAX_TRIP_SPOTS = 5;

interface SwipeState {
  // session 內略過的景點（不再出現），不 persist
  skippedIds: string[];
  // 今日行程選擇（最多 5 個），不 persist
  tripSpotIds: string[];

  addSkipped: (id: string) => void;
  // 加入行程，回傳 false 代表已滿
  addToTrip: (id: string) => boolean;
  removeFromTrip: (id: string) => void;
  isInTrip: (id: string) => boolean;
  clearSession: () => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  skippedIds: [],
  tripSpotIds: [],

  addSkipped: (id) =>
    set((state) => ({
      skippedIds: state.skippedIds.includes(id)
        ? state.skippedIds
        : [...state.skippedIds, id],
    })),

  addToTrip: (id) => {
    const { tripSpotIds } = get();
    if (tripSpotIds.length >= MAX_TRIP_SPOTS) return false;
    if (tripSpotIds.includes(id)) return true;
    set({ tripSpotIds: [...tripSpotIds, id] });
    return true;
  },

  removeFromTrip: (id) =>
    set((state) => ({
      tripSpotIds: state.tripSpotIds.filter((i) => i !== id),
    })),

  isInTrip: (id) => get().tripSpotIds.includes(id),

  clearSession: () => set({ skippedIds: [], tripSpotIds: [] }),
}));
