import { create } from "zustand";
import { persist } from "zustand/middleware";

// Guest mode 收藏機制
// 未登入 → 收藏存在 localStorage（此 store）
// 登入後 → 呼叫 /api/saved/sync，將 savedSpotIds 同步到後端，清空 localStorage
//
// TODO: Step 4/5 — 在 auth state change 時觸發 sync
// 參考設計：docs/04-狀態管理/guest-mode.md

interface SavedState {
  // 收藏的景點 ID 陣列（存 localStorage）
  savedSpotIds: string[];

  addSave: (spotId: string) => void;
  removeSave: (spotId: string) => void;
  isSaved: (spotId: string) => boolean;
  // 登入後 sync 完成時呼叫，清空 localStorage
  clearAll: () => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => ({
      savedSpotIds: [],

      addSave: (spotId) =>
        set((state) => ({
          savedSpotIds: state.savedSpotIds.includes(spotId)
            ? state.savedSpotIds
            : [...state.savedSpotIds, spotId],
        })),

      removeSave: (spotId) =>
        set((state) => ({
          savedSpotIds: state.savedSpotIds.filter((id) => id !== spotId),
        })),

      isSaved: (spotId) => get().savedSpotIds.includes(spotId),

      clearAll: () => set({ savedSpotIds: [] }),
    }),
    {
      name: "oddspot-saved-spots", // localStorage key
    }
  )
);
