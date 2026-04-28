import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AppTheme = "terminal" | "blueprint" | "caution" | "midnight";

export const APP_THEMES: AppTheme[] = ["terminal", "blueprint", "caution", "midnight"];

interface AppState {
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  cycleTheme: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: "terminal",
      setTheme: (theme) => set({ theme }),
      cycleTheme: () => {
        const { theme } = get();
        const idx = APP_THEMES.indexOf(theme);
        const next = APP_THEMES[(idx + 1) % APP_THEMES.length];
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
        if (APP_THEMES.includes(old as AppTheme)) {
          return obj as Partial<AppState>;
        }
        return { theme: "terminal" } as Partial<AppState>;
      },
      version: 2,
    }
  )
);
