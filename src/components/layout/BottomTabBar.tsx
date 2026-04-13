"use client";

import { useRouter } from "next/navigation";

type ViewMode = "map" | "swipe";

interface BottomTabBarProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function BottomTabBar({ viewMode, onChange }: BottomTabBarProps) {
  const router = useRouter();

  const activeStyle = { color: "var(--accent)" };
  const inactiveStyle = { color: "var(--muted)" };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 backdrop-blur-md"
      style={{
        background: "rgba(4,12,10,0.92)",
        borderTop: "1px solid rgba(0,229,204,0.08)",
      }}
    >
      <div className="flex">
        <button
          onClick={() => onChange("map")}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] tracking-widest uppercase transition-colors relative"
          style={viewMode === "map" ? activeStyle : inactiveStyle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          地圖
          {viewMode === "map" && (
            <span
              className="absolute bottom-0 w-10 h-px rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 8px rgba(0,229,204,0.6)" }}
            />
          )}
        </button>

        <button
          onClick={() => onChange("swipe")}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] tracking-widest uppercase transition-colors relative"
          style={viewMode === "swipe" ? activeStyle : inactiveStyle}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="16" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          探索
          {viewMode === "swipe" && (
            <span
              className="absolute bottom-0 w-10 h-px rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 8px rgba(0,229,204,0.6)" }}
            />
          )}
        </button>

        <button
          onClick={() => router.push("/submit")}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-[11px] tracking-widest uppercase transition-colors"
          style={inactiveStyle}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--accent)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
          投稿
        </button>
      </div>
    </div>
  );
}
