"use client";

import { useAppStore } from "@/store/useAppStore";

export function ThemeToggle() {
  const { theme, cycleTheme } = useAppStore();

  return (
    // 44×44 最小 touch target（WCAG 2.5.5）
    <button
      onClick={cycleTheme}
      aria-label={`切換主題（目前：${theme}）`}
      style={{
        width: 44,
        height: 44,
        borderRadius: "2px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(var(--foreground-rgb) / 0.02)",
        border: "1px solid var(--line)",
        color: "var(--muted)",
        cursor: "pointer",
        transition: "border-color 0.2s ease, color 0.2s ease",
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
      {/* 月亮：所有 AppTheme 皆為深色系 */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
