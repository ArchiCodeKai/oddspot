"use client";

import { useState } from "react";
import { useSession } from "@/contexts/SessionContext";
import { useLoginPromptStore } from "@/store/useLoginPromptStore";

interface SwipeActionBarProps {
  onSkip: () => void;
  onAddToTrip: () => void;
  onSave: () => void;
  tripCount: number;
  showTripFlash: boolean;
}

export function SwipeActionBar({
  onSkip,
  onAddToTrip,
  onSave,
  tripCount,
  showTripFlash,
}: SwipeActionBarProps) {
  const { user } = useSession();
  const openLoginPrompt = useLoginPromptStore((s) => s.open);
  const [heartFlash, setHeartFlash] = useState(false);

  const handleSaveClick = () => {
    // 未登入 → 彈出 lazy auth modal
    if (!user) {
      openLoginPrompt();
      return;
    }
    setHeartFlash(true);
    setTimeout(() => setHeartFlash(false), 500);
    onSave();
  };

  const btnBase: React.CSSProperties = {
    width: 52,
    height: 52,
    borderRadius: "2px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#091310",
    border: "1px solid rgba(0,229,204,0.12)",
    color: "var(--muted)",
    transition: "all 0.2s ease",
    cursor: "pointer",
    position: "relative",
  };

  return (
    <div className="flex items-center justify-center gap-5">
      {/* 跳過 */}
      <button
        onClick={onSkip}
        style={btnBase}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)";
          (e.currentTarget as HTMLButtonElement).style.color = "#f87171";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(0,229,204,0.12)";
          (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
        }}
        aria-label="跳過"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 加入今日行程 */}
      <button
        onClick={onAddToTrip}
        style={{
          ...btnBase,
          ...(showTripFlash
            ? {
                background: "rgba(0,229,204,0.15)",
                borderColor: "rgba(0,229,204,0.5)",
                color: "var(--accent)",
                transform: "scale(1.1)",
                boxShadow: "0 0 16px rgba(0,229,204,0.25)",
              }
            : {}),
        }}
        aria-label="加入今日行程"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {tripCount > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center"
            style={{ background: "var(--accent)", color: "#040c0a" }}
          >
            {tripCount}
          </span>
        )}
      </button>

      {/* 收藏（未登入時 → lazy auth） */}
      <button
        onClick={handleSaveClick}
        style={{
          ...btnBase,
          ...(heartFlash
            ? {
                borderColor: "rgba(236,72,153,0.5)",
                color: "#ec4899",
                boxShadow: "0 0 16px rgba(236,72,153,0.2)",
              }
            : {}),
        }}
        aria-label="收藏"
        title={!user ? "登入後即可收藏" : "收藏"}
      >
        {heartFlash ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#ec4899" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
