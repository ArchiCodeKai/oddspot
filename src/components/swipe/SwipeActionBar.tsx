"use client";

import { useState } from "react";

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
  // ✓ 按鈕的 ♡ 閃爍動畫由內部管理，不影響父層 re-render
  const [heartFlash, setHeartFlash] = useState(false);

  const handleSaveClick = () => {
    setHeartFlash(true);
    setTimeout(() => setHeartFlash(false), 500);
    onSave();
  };

  return (
    <div className="flex items-center justify-center gap-5">
      {/* 跳過 */}
      <button
        onClick={onSkip}
        className="w-14 h-14 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-red-400 transition-all active:scale-95"
        aria-label="跳過"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* 加入今日行程 */}
      <button
        onClick={onAddToTrip}
        className={`w-14 h-14 rounded-full border flex items-center justify-center transition-all active:scale-95 relative ${
          showTripFlash
            ? "bg-blue-500 border-blue-400 text-white scale-110"
            : "bg-zinc-800 border-white/10 text-zinc-400 hover:bg-zinc-700 hover:text-blue-400"
        }`}
        aria-label="加入今日行程"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        {tripCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
            {tripCount}
          </span>
        )}
      </button>

      {/* 收藏 */}
      <button
        onClick={handleSaveClick}
        className="w-14 h-14 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center transition-all active:scale-95 hover:bg-zinc-700"
        aria-label="收藏"
      >
        {heartFlash ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#ec4899" stroke="#ec4899" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </button>
    </div>
  );
}
