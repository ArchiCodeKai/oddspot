"use client";

import { useRouter } from "next/navigation";

type ViewMode = "map" | "swipe";

interface BottomTabBarProps {
  viewMode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function BottomTabBar({ viewMode, onChange }: BottomTabBarProps) {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-zinc-900/90 backdrop-blur-md border-t border-white/5">
      <div className="flex">
        <button
          onClick={() => onChange("map")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors relative ${
            viewMode === "map" ? "text-white" : "text-zinc-500"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
            <line x1="9" y1="3" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="21" />
          </svg>
          地圖
          {viewMode === "map" && (
            <span className="absolute bottom-0 w-12 h-0.5 bg-white rounded-full" />
          )}
        </button>

        <button
          onClick={() => onChange("swipe")}
          className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors relative ${
            viewMode === "swipe" ? "text-white" : "text-zinc-500"
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="16" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
          探索
          {viewMode === "swipe" && (
            <span className="absolute bottom-0 w-12 h-0.5 bg-white rounded-full" />
          )}
        </button>
        <button
          onClick={() => router.push("/submit")}
          className="flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors text-zinc-500 hover:text-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
