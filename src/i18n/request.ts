import { getRequestConfig } from "next-intl/server";
import { messages, defaultLocale } from "@/lib/i18n";

// Server Component 用的 next-intl 設定
// 因為語言偏好存在 Zustand（client-side），server side 固定使用預設語言 zh-TW
export default getRequestConfig(async () => {
  return {
    locale: defaultLocale,
    messages: messages[defaultLocale],
    timeZone: "Asia/Taipei",
  };
});
