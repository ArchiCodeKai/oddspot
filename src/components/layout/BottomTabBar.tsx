"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

type ViewMode = "map" | "swipe";

interface BottomTabBarProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function BottomTabBar({ viewMode, onChange }: BottomTabBarProps) {
  const router = useRouter();
  const t = useTranslations("tabs");

  const activeStyle: React.CSSProperties = {
    color: "var(--accent)",
    cursor: "pointer",
    minHeight: 56,
  };
  const inactiveStyle: React.CSSProperties = {
    color: "var(--muted)",
    cursor: "pointer",
    minHeight: 56,
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md"
      style={{
        background: "var(--panel-glass-strong)",
        borderTop: "1px solid var(--line)",
        boxShadow: "var(--shadow-glow)",
      }}
    >
      <div className="flex">
        {/* 地圖 tab */}
        <button
          onClick={() => onChange("map")}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] tracking-widest uppercase transition-colors relative"
          style={viewMode === "map" ? activeStyle : inactiveStyle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
            <line x1="9" y1="3" x2="9" y2="18"/>
            <line x1="15" y1="6" x2="15" y2="21"/>
          </svg>
          {t("map")}
          {viewMode === "map" && (
            <span
              className="absolute bottom-0 w-10 h-px rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 8px rgb(var(--accent-rgb) / 0.6)" }}
            />
          )}
        </button>

        {/* 探索 tab */}
        <button
          onClick={() => onChange("swipe")}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] tracking-widest uppercase transition-colors relative"
          style={viewMode === "swipe" ? activeStyle : inactiveStyle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="20" height="16" rx="2"/>
            <path d="M8 21h8M12 17v4"/>
          </svg>
          {t("explore")}
          {viewMode === "swipe" && (
            <span
              className="absolute bottom-0 w-10 h-px rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 8px rgb(var(--accent-rgb) / 0.6)" }}
            />
          )}
        </button>

        {/* 投稿 tab */}
        <button
          onClick={() => router.push("/submit")}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] tracking-widest uppercase transition-colors"
          style={inactiveStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="16"/>
            <line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          {t("submit")}
        </button>
      </div>
    </div>
  );
}
