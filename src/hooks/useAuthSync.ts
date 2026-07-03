"use client";

import { useEffect, useRef } from "react";
import { useSavedStore } from "@/store/useSavedStore";

export function useAuthSync(userId: string | undefined) {
  const setUserId = useSavedStore((s) => s.setUserId);
  const hydrateFromServer = useSavedStore((s) => s.hydrateFromServer);
  const clearAll = useSavedStore((s) => s.clearAll);
  const syncedRef = useRef(false);
  const prevUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const prev = prevUserIdRef.current;
    prevUserIdRef.current = userId;

    // 未登入
    if (!userId) {
      setUserId(null);
      // 只有「先前已登入 → 現在登出」才清快取，避免把 guest 自己的 localStorage 收藏清掉
      if (prev) clearAll();
      syncedRef.current = false;
      return;
    }

    if (syncedRef.current) return;
    syncedRef.current = true;
    setUserId(userId);

    const sync = async () => {
      try {
        // 1. 先把 guest 期間存在 localStorage 的收藏合併進 DB
        const guestIds = useSavedStore.getState().savedSpotIds;
        if (guestIds.length > 0) {
          await fetch("/api/saved/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ spotIds: guestIds }),
          });
        }
        // 2. 從 DB 取回完整收藏清單 hydrate 回 store（取代舊版同步後 clearAll 清空的做法）
        const res = await fetch("/api/saved");
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          hydrateFromServer(
            data.data.map((item: { spotId: string }) => item.spotId)
          );
        }
      } catch (error) {
        console.error("同步收藏失敗:", error);
        syncedRef.current = false; // 允許下次重試
      }
    };

    void sync();
  }, [userId, setUserId, hydrateFromServer, clearAll]);
}
