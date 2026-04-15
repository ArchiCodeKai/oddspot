"use client";

import { useAppStore } from "@/store/useAppStore";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    // 44×44 最小 touch target（WCAG 2.5.5）
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "切換為淺色模式" : "切換為深色模式"}
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
      {theme === "dark" ? (
        // 月亮（深色模式下顯示）
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        // 太陽（淺色模式下顯示）
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}
