"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useSession } from "@/contexts/SessionContext";
import {
  getCategoryLabel as getTranslatedCategoryLabel,
  getDifficultyLabel,
} from "@/lib/i18n/spotMeta";

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

// 拒絕原因預設選項，點選後可再編輯
const REJECT_REASON_PRESETS = [
  "重複景點",
  "資訊不足，無法定位",
  "照片與描述不符",
  "不符合收錄方向",
];

interface AdminHealthPayload {
  readiness: {
    missing: string[];
  };
  database: {
    ok: boolean;
    error?: string;
  };
}

export default function AdminPage() {
  const router = useRouter();
  const { user } = useSession();
  const tMeta = useTranslations("spotMeta");
  const [spots, setSpots] = useState<PendingSpot[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [healthStatus, setHealthStatus] = useState("");
  const [blobStatus, setBlobStatus] = useState("");
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [checkingBlob, setCheckingBlob] = useState(false);
  // 過期 pending 清理：先查筆數、二次確認才執行
  const [cleanupCount, setCleanupCount] = useState<number | null>(null);
  const [cleanupStatus, setCleanupStatus] = useState("");
  const [cleaning, setCleaning] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      router.push("/map");
      return;
    }

    let active = true;
    setLoading(true);
    setForbidden(false);
    fetch("/api/admin/spots")
      .then((res) => {
        if (res.status === 403) {
          if (active) setForbidden(true);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (active && data?.success) setSpots(data.data);
      })
      .catch((err) => console.error("載入待審核景點失敗", err))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user, router]);

  async function handleAction(id: string, action: "approve" | "reject", reason?: string) {
    setProcessing(id);
    try {
      const res = await fetch(`/api/admin/spots/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          action === "reject" && reason ? { action, rejectReason: reason } : { action },
        ),
      });
      const data = await res.json();
      if (data.success) {
        setSpots((prev) => prev.filter((s) => s.id !== id));
        setRejectingId(null);
        setRejectReason("");
      }
    } catch (err) {
      console.error("操作失敗", err);
    } finally {
      setProcessing(null);
    }
  }

  async function handleHealthCheck() {
    setCheckingHealth(true);
    setHealthStatus("");
    try {
      const res = await fetch("/api/admin/health");
      const payload = await res.json();
      if (!payload.success) {
        setHealthStatus(payload.error ?? "Production 檢查失敗");
        return;
      }
      const data = payload.data as AdminHealthPayload;
      const missing = data.readiness.missing.length;
      setHealthStatus(
        `DB ${data.database.ok ? "OK" : "ERR"} · 缺 ${missing} 個 env${missing > 0 ? `：${data.readiness.missing.join(", ")}` : ""}`,
      );
    } catch {
      setHealthStatus("Production 檢查失敗");
    } finally {
      setCheckingHealth(false);
    }
  }

  async function handleCleanupCheck() {
    setCleaning(true);
    setCleanupStatus("");
    setCleanupCount(null);
    try {
      const res = await fetch("/api/admin/cleanup");
      const payload = await res.json();
      if (!payload.success) {
        setCleanupStatus(payload.error ?? "查詢過期 pending 失敗");
        return;
      }
      setCleanupCount(payload.data.count);
      if (payload.data.count === 0) {
        setCleanupStatus("沒有過期的 pending 投稿");
      }
    } catch {
      setCleanupStatus("查詢過期 pending 失敗");
    } finally {
      setCleaning(false);
    }
  }

  async function handleCleanupConfirm() {
    setCleaning(true);
    try {
      const res = await fetch("/api/admin/cleanup", { method: "POST" });
      const payload = await res.json();
      if (!payload.success) {
        setCleanupStatus(payload.error ?? "清理失敗");
        return;
      }
      const { deleted, blobFailed } = payload.data;
      setCleanupStatus(
        `已清理 ${deleted} 筆過期 pending${blobFailed > 0 ? `（${blobFailed} 張圖片清理失敗，待後續回收）` : ""}`,
      );
    } catch {
      setCleanupStatus("清理失敗");
    } finally {
      setCleanupCount(null);
      setCleaning(false);
    }
  }

  async function handleBlobSmokeTest() {
    setCheckingBlob(true);
    setBlobStatus("");
    try {
      const res = await fetch("/api/admin/blob-smoke", { method: "POST" });
      const payload = await res.json();
      setBlobStatus(payload.success ? "Blob upload/delete OK" : (payload.error ?? "Blob smoke test 失敗"));
    } catch {
      setBlobStatus("Blob smoke test 失敗");
    } finally {
      setCheckingBlob(false);
    }
  }

  function getCategoryLabel(value: string) {
    return getTranslatedCategoryLabel(tMeta, value);
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-zinc-500 text-sm">載入中...</div>
      </div>
    );
  }

  if (!user) return null;

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

        {!forbidden && (
          <div className="mb-6 rounded-xs border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
              Production checks
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleHealthCheck}
                disabled={checkingHealth}
                className="rounded-xs border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"
              >
                {checkingHealth ? "檢查中..." : "檢查 env / DB"}
              </button>
              <button
                onClick={handleBlobSmokeTest}
                disabled={checkingBlob}
                className="rounded-xs border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"
              >
                {checkingBlob ? "測試中..." : "Blob smoke test"}
              </button>
              {cleanupCount !== null && cleanupCount > 0 ? (
                <span className="flex items-center gap-2">
                  <button
                    onClick={handleCleanupConfirm}
                    disabled={cleaning}
                    className="rounded-xs border border-yellow-700 px-3 py-2 text-xs text-yellow-500 disabled:opacity-50"
                  >
                    {cleaning ? "清理中..." : `確認清理 ${cleanupCount} 筆`}
                  </button>
                  <button
                    onClick={() => setCleanupCount(null)}
                    disabled={cleaning}
                    className="px-2 py-2 text-xs text-zinc-500 disabled:opacity-50"
                  >
                    取消
                  </button>
                </span>
              ) : (
                <button
                  onClick={handleCleanupCheck}
                  disabled={cleaning}
                  className="rounded-xs border border-zinc-700 px-3 py-2 text-xs text-zinc-300 disabled:opacity-50"
                >
                  {cleaning ? "查詢中..." : "清理過期 pending"}
                </button>
              )}
            </div>
            {(healthStatus || blobStatus || cleanupStatus) && (
              <div className="mt-3 space-y-1 text-xs text-zinc-500">
                {healthStatus && <p>{healthStatus}</p>}
                {blobStatus && <p>{blobStatus}</p>}
                {cleanupStatus && <p>{cleanupStatus}</p>}
              </div>
            )}
          </div>
        )}

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
              className="bg-zinc-900 rounded-xs p-4 mb-3 border border-zinc-800"
            >
              <div className="flex gap-3">
                {coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverImage}
                    alt={spot.name}
                    className="w-16 h-16 rounded-xs object-cover flex-shrink-0 bg-zinc-800"
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
                      {getDifficultyLabel(tMeta, spot.difficulty)}
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

              {rejectingId === spot.id ? (
                <div className="mt-3 rounded-xs border border-zinc-800 bg-zinc-950 p-3">
                  <p className="text-xs text-zinc-500">拒絕原因（會顯示給投稿者）</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {REJECT_REASON_PRESETS.map((preset) => (
                      <button
                        key={preset}
                        onClick={() => setRejectReason(preset)}
                        className={`rounded-xs border px-2 py-1 text-xs ${
                          rejectReason === preset
                            ? "border-zinc-400 text-zinc-200"
                            : "border-zinc-700 text-zinc-500"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    maxLength={200}
                    placeholder="或自行輸入，留空則存預設文案"
                    className="mt-2 w-full rounded-xs border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => handleAction(spot.id, "reject", rejectReason.trim())}
                      disabled={processing === spot.id}
                      className="flex-1 py-1.5 text-xs border border-zinc-600 text-zinc-300 rounded-xs disabled:opacity-50"
                    >
                      {processing === spot.id ? "處理中..." : "確認拒絕並清圖"}
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason("");
                      }}
                      disabled={processing === spot.id}
                      className="px-3 py-1.5 text-xs text-zinc-500 disabled:opacity-50"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleAction(spot.id, "approve")}
                    disabled={processing === spot.id}
                    className="flex-1 py-2 text-sm bg-white text-zinc-900 rounded-xs font-medium disabled:opacity-50"
                  >
                    {processing === spot.id ? "處理中..." : "通過"}
                  </button>
                  <button
                    onClick={() => {
                      setRejectingId(spot.id);
                      setRejectReason("");
                    }}
                    disabled={processing === spot.id}
                    className="flex-1 py-2 text-sm border border-zinc-700 text-zinc-400 rounded-xs disabled:opacity-50"
                  >
                    拒絕並清圖
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
