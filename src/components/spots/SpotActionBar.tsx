"use client";

import { useState, useEffect } from "react";
import { useSavedStore } from "@/store/useSavedStore";

interface SpotActionBarProps {
  lat: number;
  lng: number;
  spotId: string;
}

export function SpotActionBar({ lat, lng, spotId }: SpotActionBarProps) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  const { addSave, removeSave, isSaved } = useSavedStore();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSaved(isSaved(spotId));
  }, [spotId, isSaved]);

  const handleToggleSave = async () => {
    setLoading(true);
    try {
      if (saved) {
        removeSave(spotId);
        setSaved(false);
      } else {
        addSave(spotId);
        setSaved(true);
      }
    } finally {
      setLoading(false);
    }
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
        disabled={loading}
        className="flex-1 py-3 text-sm font-medium transition-colors uppercase"
        style={{
          borderRadius: 2,
          background: saved ? "rgb(var(--accent-rgb) / 0.15)" : "transparent",
          color: saved ? "var(--accent)" : "var(--muted)",
          border: `1px solid ${saved ? "rgb(var(--accent-rgb) / 0.4)" : "var(--line)"}`,
          fontFamily: "var(--font-jetbrains-mono), monospace",
          letterSpacing: "0.12em",
          cursor: loading ? "wait" : "pointer",
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
