import type { StyleSpecification } from "mapbox-gl";
import baseTemplate from "../mapbox-styles/base-template.json";
import terminalTokens from "../mapbox-styles/terminal.json";
import blueprintTokens from "../mapbox-styles/blueprint.json";
import cautionTokens from "../mapbox-styles/caution.json";
import midnightTokens from "../mapbox-styles/midnight.json";

export type MapTheme = "terminal" | "blueprint" | "caution" | "midnight";

export const MAP_THEMES: readonly MapTheme[] = [
  "terminal",
  "blueprint",
  "caution",
  "midnight",
] as const;

interface ThemeTokens {
  name: string;
  description?: string;
  tokens: Record<string, string>;
}

const THEMES: Record<MapTheme, ThemeTokens> = {
  terminal: terminalTokens as ThemeTokens,
  blueprint: blueprintTokens as ThemeTokens,
  caution: cautionTokens as ThemeTokens,
  midnight: midnightTokens as ThemeTokens,
};

// 對每個主題只計算一次 style，第二次起直接回 cache。
// 4 themes × stringify/replace/parse 約 3-10ms × 4 = 12-40ms 總量，但分散到首次切換時。
const styleCache: Partial<Record<MapTheme, StyleSpecification>> = {};

// 替換 base-template 內所有 @@token@@ 字串成主題對應 hex，
// 透過 stringify/replace/parse 一次處理所有出現位置（含 layer 內巢狀屬性）。
export function loadMapStyle(theme: MapTheme): StyleSpecification {
  const cached = styleCache[theme];
  if (cached) return cached;

  let serialized = JSON.stringify(baseTemplate);
  const { tokens } = THEMES[theme];
  for (const [token, hex] of Object.entries(tokens)) {
    serialized = serialized.split(token).join(hex);
  }
  const result = JSON.parse(serialized) as StyleSpecification;
  styleCache[theme] = result;
  return result;
}
