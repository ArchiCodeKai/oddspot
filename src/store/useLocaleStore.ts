import { create } from "zustand";
import { persist } from "zustand/middleware";
import { nextLocale, type Locale } from "@/lib/i18n";

interface LocaleState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: "zh-TW",
      setLocale: (locale) => set({ locale }),
      // 循環切換：zh-TW → en → ja → zh-TW
      toggleLocale: () => set({ locale: nextLocale(get().locale) }),
    }),
    { name: "oddspot-locale" }
  )
);
