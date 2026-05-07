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

// 替換 base-template 內所有 @@token@@ 字串成主題對應 hex，
// 透過 stringify/replace/parse 一次處理所有出現位置（含 layer 內巢狀屬性）。
// 回傳 unknown，呼叫端自行 cast 為 mapbox-gl 的 StyleSpecification。
export function loadMapStyle(theme: MapTheme): unknown {
  let serialized = JSON.stringify(baseTemplate);
  const { tokens } = THEMES[theme];
  for (const [token, hex] of Object.entries(tokens)) {
    serialized = serialized.split(token).join(hex);
  }
  return JSON.parse(serialized);
}
