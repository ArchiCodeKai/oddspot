import zhTW from "./messages/zh-TW.json";
import en from "./messages/en.json";

export const messages = {
  "zh-TW": zhTW,
  en,
} as const;

export type Locale = keyof typeof messages;
export const defaultLocale: Locale = "zh-TW";
export const locales: Locale[] = ["zh-TW", "en"];
