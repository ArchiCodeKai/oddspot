import { create } from "zustand";
import { persist } from "zustand/middleware";
import { THEMES, type Theme } from "@/types/theme";

// 向後相容（之前用 AppTheme/APP_THEMES 命名的檔案不用全部改 import）。
export type AppTheme = Theme;
export const APP_THEMES = THEMES;

interface AppState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "terminal",
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const { theme } = get();
        const idx = THEMES.indexOf(theme);
        const next = THEMES[(idx + 1) % THEMES.length];
        set({ theme: next });
      },
    }),
    {
      name: "oddspot-app",
      // 舊版 dark/light → 新 4 主題系統
      migrate: (persistedState: unknown) => {
        const obj = persistedState as { theme?: string };
        const old = obj?.theme;
        if (old === "light" || old === "dark" || !old) {
          return { theme: "terminal" } as Partial<AppState>;
        }
        if (THEMES.includes(old as Theme)) {
          return obj as Partial<AppState>;
        }
        return { theme: "terminal" } as Partial<AppState>;
      },
      version: 2,
    }
  )
);
