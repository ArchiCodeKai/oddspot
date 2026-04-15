"use client";

import { useLocaleStore } from "@/store/useLocaleStore";
import { useTranslations } from "next-intl";

export function LangToggle() {
  const { locale, toggleLocale } = useLocaleStore();
  const t = useTranslations("lang");

  return (
    <button
      onClick={toggleLocale}
      aria-label={t("toggle")}
      style={{
        width: 44,
        height: 44,
        borderRadius: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(var(--foreground-rgb) / 0.02)",
        border: "1px solid var(--line)",
        // 英文用 Space Mono，中文用系統字體保持簡潔
        fontFamily: "var(--font-space-mono), monospace",
        fontSize: "0.65rem",
        fontWeight: 700,
        letterSpacing: locale === "zh-TW" ? "0.08em" : "0.15em",
        color: "var(--muted)",
        cursor: "pointer",
        transition: "border-color 0.2s ease, color 0.2s ease",
        textTransform: "uppercase",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--line-strong)";
        e.currentTarget.style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--line)";
        e.currentTarget.style.color = "var(--muted)";
      }}
    >
      {t("label")}
    </button>
  );
}
