"use client";

import { useEffect, useRef } from "react";
import { useSavedStore } from "@/store/useSavedStore";

export function useAuthSync(userId: string | undefined) {
  const { savedSpotIds, clearAll } = useSavedStore();
  const syncedRef = useRef(false);

  useEffect(() => {
    // 只在用戶登入且有 localStorage 收藏時執行同步
    if (!userId || savedSpotIds.length === 0 || syncedRef.current) {
      return;
    }

    const syncSavedSpots = async () => {
      try {
        const response = await fetch("/api/saved/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spotIds: savedSpotIds }),
        });

        const data = await response.json();

        if (data.success) {
          // 同步成功，清空 localStorage
          clearAll();
          syncedRef.current = true;
          console.log(`已同步 ${data.data.synced} 個收藏到帳戶`);
        }
      } catch (error) {
        console.error("同步收藏失敗:", error);
      }
    };

    syncSavedSpots();
  }, [userId, savedSpotIds, clearAll]);
}
