import zhTW from "./messages/zh-TW.json";
import en from "./messages/en.json";
import ja from "./messages/ja.json";

export const messages = {
  "zh-TW": zhTW,
  en,
  ja,
} as const;

export type Locale = keyof typeof messages;
export const defaultLocale: Locale = "zh-TW";
// Locale 切換順序：中 → 英 → 日 → 中
export const locales: Locale[] = ["zh-TW", "en", "ja"];

export function nextLocale(current: Locale): Locale {
  const idx = locales.indexOf(current);
  return locales[(idx + 1) % locales.length];
}
