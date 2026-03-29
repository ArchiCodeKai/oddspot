"use client";

// TODO Step 4 — 卡片滑動 UI 整合計畫：
// 1. 新增 viewMode: "map" | "swipe" 切換按鈕
// 2. spots 資料由此頁統一管理，MapView 和 SwipeView 共用同一份
// 3. SwipeView 需要額外的狀態：skippedIds（session 內略過的景點，不再出現）
// 4. 當附近景點全部滑完時，觸發 load more（增加 offset 或換搜尋半徑）
// 詳細討論見：docs/03-元件設計/swipe-ui.md

// TODO Step 4 — Guest mode 整合：
// 右滑收藏時，呼叫 useSavedStore.addSave(spotId)
// 登入後在此頁或 layout 層觸發 sync，見：docs/04-狀態管理/guest-mode.md

import { useState, useEffect } from "react";
import { MapView } from "@/components/map/MapView";
import type { SpotMapPoint } from "@/types/spots";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5319 };

export default function MapPage() {
  const [spots, setSpots] = useState<SpotMapPoint[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      () => {
        setUserLocation(null);
      }
    );
  }, []);

  useEffect(() => {
    const lat = userLocation?.lat ?? TAIPEI_CENTER.lat;
    const lng = userLocation?.lng ?? TAIPEI_CENTER.lng;

    fetch(`/api/spots?lat=${lat}&lng=${lng}&radius=5`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setSpots(data.data);
      })
      .catch((err) => console.error("載入景點失敗", err))
      .finally(() => setLoading(false));
  }, [userLocation]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">定位中...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <MapView spots={spots} userLocation={userLocation} />
    </div>
  );
}
