"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CATEGORY_OPTIONS } from "@/lib/constants/categories";

interface PendingSpot {
  id: string;
  name: string;
  nameEn: string | null;
  category: string;
  lat: number;
  lng: number;
  address: string | null;
  description: string | null;
  difficulty: string;
  images: string;
  submittedById: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [spots, setSpots] = useState<PendingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) { router.push("/map"); return; }

    fetch("/api/admin/spots")
      .then((res) => {
        if (res.status === 403) { setForbidden(true); return null; }
        return res.json();
      })
      .then((data) => {
        if (data?.success) setSpots(data.data);
      })
      .catch((err) => console.error("載入待審核景點失敗", err))
      .finally(() => setLoading(false));
  }, [session, status, router]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/spots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setSpots((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      console.error("操作失敗", err);
    } finally {
      setProcessing(null);
    }
  }

  function getCategoryLabel(value: string) {
    return CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-500 text-sm">載入中...</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push("/map")}
            className="text-zinc-500 hover:text-zinc-300"
          >
            ←
          </button>
          <h1 className="text-lg font-medium">景點審核</h1>
          <span className="ml-auto text-xs text-zinc-600">
            {spots.length} 筆待審核
          </span>
        </div>

        {forbidden && (
          <div className="text-center py-12 text-zinc-500 text-sm">
            <p>你沒有管理員權限</p>
            <p className="mt-1 text-xs text-zinc-600">
              請確認 .env 的 ADMIN_EMAIL 設定是否正確
            </p>
          </div>
        )}

        {!forbidden && spots.length === 0 && (
          <div className="text-center py-12 text-zinc-600 text-sm">
            目前沒有待審核的景點
          </div>
        )}

        {!forbidden && spots.map((spot) => {
          const images: string[] = JSON.parse(spot.images || "[]");
          const coverImage = images[0];
          const expiresAt = spot.expiresAt ? new Date(spot.expiresAt) : null;
          const isExpiringSoon = expiresAt && expiresAt.getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

          return (
            <div
              key={spot.id}
              className="bg-zinc-900 rounded-xl p-4 mb-3 border border-zinc-800"
            >
              <div className="flex gap-3">
                {coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImage}
                    alt={spot.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0 bg-zinc-800"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm">{spot.name}</h3>
                    {isExpiringSoon && (
                      <span className="text-xs text-yellow-500 flex-shrink-0">即將到期</span>
                    )}
                  </div>
                  {spot.nameEn && (
                    <p className="text-xs text-zinc-500 mt-0.5">{spot.nameEn}</p>
                  )}
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      {getCategoryLabel(spot.category)}
                    </span>
                    <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
                      {spot.difficulty === "easy" ? "容易" : spot.difficulty === "medium" ? "中等" : "困難"}
                    </span>
                  </div>
                  {spot.address && (
                    <p className="text-xs text-zinc-600 mt-1">{spot.address}</p>
                  )}
                  {spot.description && (
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{spot.description}</p>
                  )}
                  <p className="text-xs text-zinc-700 mt-1">
                    座標：{spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleAction(spot.id, "approve")}
                  disabled={processing === spot.id}
                  className="flex-1 py-2 text-sm bg-white text-zinc-900 rounded-lg font-medium disabled:opacity-50"
                >
                  {processing === spot.id ? "處理中..." : "通過"}
                </button>
                <button
                  onClick={() => handleAction(spot.id, "reject")}
                  disabled={processing === spot.id}
                  className="flex-1 py-2 text-sm border border-zinc-700 text-zinc-400 rounded-lg disabled:opacity-50"
                >
                  拒絕刪除
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
