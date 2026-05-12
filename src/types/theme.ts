// 全站主題型別。useAppStore（全站 theme 切換）跟 mapbox style-loader（地圖樣式）共用同一份。
export type Theme = "terminal" | "blueprint" | "caution" | "midnight";

export const THEMES: readonly Theme[] = [
  "terminal",
  "blueprint",
  "caution",
  "midnight",
] as const;
