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
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-900/80 backdrop-blur-md border-t border-white/5 px-5 py-4 flex gap-3">
      <button
        onClick={handleToggleSave}
        disabled={loading}
        className={`flex-1 py-3 rounded-xl text-sm font-medium transition-colors ${
          saved
            ? "bg-white/10 border border-white/20 text-white"
            : "border border-zinc-700 text-zinc-300"
        }`}
      >
        {saved ? "♥" : "♡"} {saved ? "已收藏" : "收藏"}
      </button>
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 py-3 rounded-xl bg-white text-zinc-900 text-sm font-semibold text-center"
      >
        導航前往
      </a>
    </div>
  );
}
