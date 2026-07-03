"use client";

import { useSavedStore } from "@/store/useSavedStore";
import { useSession } from "@/contexts/SessionContext";
import { useLoginPromptStore } from "@/store/useLoginPromptStore";

interface SpotActionBarProps {
  lat: number;
  lng: number;
  spotId: string;
}

export function SpotActionBar({ lat, lng, spotId }: SpotActionBarProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const { user } = useSession();
  const openLoginPrompt = useLoginPromptStore((s) => s.open);
  const saved = useSavedStore((s) => s.savedSpotIds.includes(spotId));
  const addSave = useSavedStore((s) => s.addSave);
  const removeSave = useSavedStore((s) => s.removeSave);

  const handleToggleSave = () => {
    // 未登入 → 彈出登入提示（與地圖 popup / 滑卡行為一致）
    if (!user) {
      openLoginPrompt();
      return;
    }
    if (saved) removeSave(spotId);
    else addSave(spotId);
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 backdrop-blur-md px-5 py-4 flex gap-3"
      style={{
        background: "var(--panel-glass-strong)",
        borderTop: "1px solid var(--line)",
      }}
    >
      <button
        onClick={handleToggleSave}
        className="flex-1 py-3 text-sm font-medium transition-colors uppercase"
        style={{
          borderRadius: 2,
          background: saved ? "rgb(var(--accent-rgb) / 0.15)" : "transparent",
          color: saved ? "var(--accent)" : "var(--muted)",
          border: `1px solid ${saved ? "rgb(var(--accent-rgb) / 0.4)" : "var(--line)"}`,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          letterSpacing: "0.12em",
          cursor: "pointer",
        }}
      >
        {saved ? "♥" : "♡"} {saved ? "已收藏" : "收藏"}
      </button>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-3 text-sm font-semibold text-center uppercase"
        style={{
          borderRadius: 2,
          background: "var(--accent)",
          color: "var(--background)",
          fontFamily: "var(--font-jetbrains-mono), monospace",
          letterSpacing: "0.12em",
        }}
      >
        導航前往
      </a>
    </div>
  );
}
