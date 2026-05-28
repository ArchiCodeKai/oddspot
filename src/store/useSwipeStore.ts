import { create } from "zustand";

interface SwipeState {
  // session 內略過的景點（不再出現），不 persist
  skippedIds: string[];
  // 最近一次 skip 的 id（給 Undo 按鈕讀；只保留最近一個，模擬「救一張回來」）
  lastSkippedId: string | null;

  addSkipped: (id: string) => void;
  // Undo 最近 skip：把 lastSkippedId 從 skippedIds 拿掉，回傳該 id 讓 caller 把卡片倒回去
  undoSkip: () => string | null;
  clearSkipped: () => void;
}

export const useSwipeStore = create<SwipeState>((set, get) => ({
  skippedIds: [],
  lastSkippedId: null,

  addSkipped: (id) =>
    set((state) => ({
      skippedIds: state.skippedIds.includes(id)
        ? state.skippedIds
        : [...state.skippedIds, id],
      lastSkippedId: id,
    })),

  undoSkip: () => {
    const { lastSkippedId, skippedIds } = get();
    if (!lastSkippedId) return null;
    set({
      skippedIds: skippedIds.filter((i) => i !== lastSkippedId),
      lastSkippedId: null,
    });
    return lastSkippedId;
  },

  clearSkipped: () => set({ skippedIds: [], lastSkippedId: null }),
}));
