"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";
import { useSavedStore } from "@/store/useSavedStore";
import type { SpotMapPoint } from "@/types/spots";

interface SavedSpotActionsProps {
  spot: SpotMapPoint;
}

export function SavedSpotActions({ spot }: SavedSpotActionsProps) {
  const router = useRouter();
  const t = useTranslations("savedPage");
  const addSpot = useRoutePlannerStore((state) => state.addSpot);
  const removeSave = useSavedStore((state) => state.removeSave);
  const [removing, setRemoving] = useState(false);

  const handleAddToTrip = () => {
    addSpot(spot);
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const response = await fetch(`/api/saved/${spot.id}`, { method: "DELETE" });
      if (response.ok) {
        removeSave(spot.id);
        router.refresh();
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <button
        type="button"
        onClick={handleAddToTrip}
        className="px-3 py-2 text-xs tracking-[0.16em]"
        style={{
          border: "1px solid var(--accent)",
          color: "var(--accent)",
          background: "rgb(var(--accent-rgb) / 0.1)",
          borderRadius: 2,
        }}
      >
        {t("addToTrip")}
      </button>
      <button
        type="button"
        onClick={handleRemove}
        disabled={removing}
        className="px-3 py-2 text-xs tracking-[0.16em] disabled:opacity-50"
        style={{
          border: "1px solid var(--line)",
          color: "var(--muted)",
          background: "transparent",
          borderRadius: 2,
        }}
      >
        {removing ? t("removing") : t("remove")}
      </button>
    </div>
  );
}
