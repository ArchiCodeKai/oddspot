"use client";

import { NextIntlClientProvider } from "next-intl";
import { useLocaleStore } from "@/store/useLocaleStore";
import { messages } from "@/lib/i18n";

interface LocaleProviderProps {
  children: React.ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const locale = useLocaleStore((s) => s.locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages[locale]} timeZone="Asia/Taipei">
      {children}
    </NextIntlClientProvider>
  );
}
