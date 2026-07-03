import { create } from "zustand";
import { persist } from "zustand/middleware";

// 收藏同步機制（單一 source of truth）
// 未登入 → 收藏只存 localStorage（此 store）
// 登入後 → useAuthSync 會：先把 guest 收藏合併進 DB，再從 DB hydrate 回此 store，
//          並設定 userId；此後 addSave / removeSave 會即時同步到後端 /api/saved
// 參考設計：docs/04-狀態管理/guest-mode.md

interface SavedState {
  // 收藏的景點 ID 陣列（guest 時存 localStorage，登入時為 DB 快取）
  savedSpotIds: string[];
  // 目前登入使用者 ID；null = guest（不持久化）
  userId: string | null;

  addSave: (spotId: string) => void;
  removeSave: (spotId: string) => void;
  isSaved: (spotId: string) => boolean;
  // 登入狀態變更時由 useAuthSync 設定
  setUserId: (userId: string | null) => void;
  // 從後端載入完整收藏清單，取代目前 store 內容
  hydrateFromServer: (spotIds: string[]) => void;
  // 登出時清空快取
  clearAll: () => void;
}

export const useSavedStore = create<SavedState>()(
  persist(
    (set, get) => {
      // 登入態下把收藏寫入後端；失敗則還原樂觀更新
      const pushAdd = async (spotId: string) => {
        try {
          const res = await fetch("/api/saved", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spotId }),
          });
          if (!res.ok) throw new Error(String(res.status));
        } catch (error) {
          console.error("收藏寫入後端失敗，已還原:", error);
          set((state) => ({
            savedSpotIds: state.savedSpotIds.filter((id) => id !== spotId),
          }));
        }
      };

      const pushRemove = async (spotId: string) => {
        try {
          const res = await fetch(`/api/saved/${spotId}`, { method: "DELETE" });
          if (!res.ok) throw new Error(String(res.status));
        } catch (error) {
          console.error("移除收藏後端失敗，已還原:", error);
          set((state) => ({
            savedSpotIds: state.savedSpotIds.includes(spotId)
              ? state.savedSpotIds
              : [...state.savedSpotIds, spotId],
          }));
        }
      };

      return {
        savedSpotIds: [],
        userId: null,

        addSave: (spotId) => {
          let added = false;
          set((state) => {
            if (state.savedSpotIds.includes(spotId)) return state;
            added = true;
            return { savedSpotIds: [...state.savedSpotIds, spotId] };
          });
          if (added && get().userId) void pushAdd(spotId);
        },

        removeSave: (spotId) => {
          let removed = false;
          set((state) => {
            if (!state.savedSpotIds.includes(spotId)) return state;
            removed = true;
            return {
              savedSpotIds: state.savedSpotIds.filter((id) => id !== spotId),
            };
          });
          if (removed && get().userId) void pushRemove(spotId);
        },

        isSaved: (spotId) => get().savedSpotIds.includes(spotId),

        setUserId: (userId) => set({ userId }),

        hydrateFromServer: (spotIds) =>
          set({ savedSpotIds: Array.from(new Set(spotIds)) }),

        clearAll: () => set({ savedSpotIds: [] }),
      };
    },
    {
      name: "oddspot-saved-spots", // localStorage key
      // 只持久化收藏清單；userId 不落地，每次由 session 重新設定
      partialize: (state) => ({ savedSpotIds: state.savedSpotIds }),
    }
  )
);
