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
      {/* 主題色切換：四格色票，避免沿用舊 light/dark 月亮語意 */}
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="square" aria-hidden="true">
        <rect x="4" y="4" width="6" height="6" />
        <rect x="14" y="4" width="6" height="6" />
        <rect x="4" y="14" width="6" height="6" />
        <rect x="14" y="14" width="6" height="6" />
      </svg>
    </button>
  );
}
