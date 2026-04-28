"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { motion, useMotionValue, animate } from "framer-motion";
import { ROUTES } from "@/lib/constants/routes";
import { getCategoryLabel, getDifficultyLabel } from "@/lib/i18n/spotMeta";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CATEGORY_GLYPHS } from "@/lib/constants/categoryGlyphs";
import { useSavedStore } from "@/store/useSavedStore";
import { useSession } from "@/contexts/SessionContext";
import { useLoginPromptStore } from "@/store/useLoginPromptStore";
import type { SpotMapPoint } from "@/types/spots";
import type { SpotCategory } from "@/lib/constants/categories";
import type { SpotStatus } from "@/lib/constants/status";

interface SpotPopupProps {
  spot: SpotMapPoint;
  userLocation?: { lat: number; lng: number } | null;
  onClose: () => void;
}

const SWIPE_UP_THRESHOLD = 60;

// 球面距離（haversine）— 單位 km
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// v3 monochrome peek sheet：點 pin 不換 route，從底部浮出小卡片
// 上滑或點 view detail 才進全屏詳情
export function SpotPopup({ spot, userLocation = null, onClose }: SpotPopupProps) {
  const tMeta = useTranslations("spotMeta");
  const tSwipe = useTranslations("swipe");
  const router = useRouter();
  const y = useMotionValue(0);

  const category = spot.category as SpotCategory;
  const Glyph = CATEGORY_GLYPHS[category];
  const categoryLabel = getCategoryLabel(tMeta, category);

  const { user } = useSession();
  const openLoginPrompt = useLoginPromptStore((s) => s.open);
  const isSaved = useSavedStore((s) => s.savedSpotIds.includes(spot.id));
  const addSave = useSavedStore((s) => s.addSave);
  const removeSave = useSavedStore((s) => s.removeSave);

  // 距離：spot.distance 已存在則用；沒有時才從 userLocation 算
  const distanceKm = spot.distance ?? (userLocation ? haversineKm(userLocation, spot) : null);

  const goDetail = () => router.push(ROUTES.SPOT_DETAIL(spot.id));

  const handleSave = () => {
    if (!user) {
      openLoginPrompt();
      return;
    }
    if (isSaved) removeSave(spot.id);
    else addSave(spot.id);
  };

  const handleNavigate = () => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}&travelmode=walking`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      className="absolute bottom-24 left-4 right-4 z-20 max-w-md mx-auto pointer-events-auto"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
    >
      <motion.div
        style={{
          y,
          background: "var(--panel-glass-strong)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid var(--line-strong)",
          borderRadius: 2,
          boxShadow: "0 16px 48px rgb(var(--background-rgb) / 0.5), 0 0 32px rgb(var(--accent-rgb) / 0.1)",
          touchAction: "none",
        }}
        drag="y"
        dragConstraints={{ top: -100, bottom: 30 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.y < -SWIPE_UP_THRESHOLD) {
            goDetail();
          } else {
            animate(y, 0, { type: "spring", stiffness: 220, damping: 22 });
          }
        }}
      >
        {/* 拖曳把手 — v3 提示「可以上滑」 */}
        <div className="flex justify-center pt-2 pb-1">
          <div
            className="w-10 h-1"
            style={{ background: "var(--muted)", opacity: 0.35, borderRadius: 2 }}
          />
        </div>

        <div className="p-3 pt-1">
          <div className="flex gap-3">
            {/* 封面縮圖（v3 monochrome：無圖時顯示 glyph） */}
            <div
              className="w-16 h-16 flex-shrink-0 relative overflow-hidden"
              style={{
                background: "var(--panel-light)",
                border: "1px solid var(--line)",
                borderRadius: 2,
              }}
            >
              {spot.coverImage ? (
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${spot.coverImage})` }}
                />
              ) : (
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    color: "var(--accent)",
                    opacity: 0.7,
                    filter: "drop-shadow(0 0 6px rgb(var(--accent-rgb) / 0.4))",
                  }}
                >
                  <Glyph size={28} />
                </div>
              )}
              {/* 縮圖上微弱 scanline */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgb(var(--accent-rgb) / 0.04) 2px, rgb(var(--accent-rgb) / 0.04) 3px)",
                }}
              />
            </div>

            {/* 內容 */}
            <div className="flex-1 min-w-0 pr-7">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <CategoryBadge category={category} label={categoryLabel} compact />
                <StatusBadge status={spot.status as SpotStatus} />
              </div>
              <h3
                className="text-sm font-bold leading-tight font-content truncate"
                style={{ color: "var(--foreground)" }}
              >
                {spot.name}
              </h3>
              <p
                className="text-[10px] mt-0.5 truncate"
                style={{
                  color: "var(--muted)",
                  fontFamily: "var(--font-jetbrains-mono), monospace",
                  letterSpacing: "0.08em",
                }}
              >
                {distanceKm !== null && (
                  <span>{distanceKm.toFixed(1)} KM · </span>
                )}
                {getDifficultyLabel(tMeta, spot.difficulty)}
              </p>
            </div>

            {/* 關閉按鈕 */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center transition-colors"
              style={{
                background: "rgb(var(--accent-rgb) / 0.08)",
                color: "var(--muted)",
                border: "1px solid var(--line)",
                borderRadius: 2,
                cursor: "pointer",
              }}
              aria-label="關閉"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* 快速動作列：收藏 / 導航 / 詳情 */}
          <div className="flex gap-2 mt-3">
            {/* 收藏 */}
            <button
              onClick={handleSave}
              aria-label={isSaved ? "取消收藏" : "收藏"}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 transition-all uppercase"
              style={{
                background: isSaved ? "rgb(var(--accent-rgb) / 0.15)" : "transparent",
                border: `1px solid ${isSaved ? "rgb(var(--accent-rgb) / 0.6)" : "var(--line)"}`,
                color: isSaved ? "var(--accent)" : "var(--muted)",
                borderRadius: 2,
                cursor: "pointer",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.18em",
                fontWeight: 700,
                boxShadow: isSaved ? "0 0 12px rgb(var(--accent-rgb) / 0.18)" : "none",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24"
                fill={isSaved ? "currentColor" : "none"}
                stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6C19 16.5 12 21 12 21z" />
              </svg>
              {tSwipe("save")}
            </button>

            {/* 導航 */}
            <button
              onClick={handleNavigate}
              className="flex-1 h-9 flex items-center justify-center gap-1.5 transition-all uppercase"
              style={{
                background: "transparent",
                border: "1px solid var(--line)",
                color: "var(--muted)",
                borderRadius: 2,
                cursor: "pointer",
                fontFamily: "var(--font-jetbrains-mono), monospace",
                fontSize: 10,
                letterSpacing: "0.18em",
                fontWeight: 700,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line-strong)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--muted)";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--line)";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              GO
            </button>
          </div>

          {/* View detail：上滑或點此進全屏 */}
          <button
            onClick={goDetail}
            className="block w-full mt-2 py-2 text-center text-xs uppercase tracking-widest font-bold transition-all"
            style={{
              background: "transparent",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              borderRadius: 2,
              fontFamily: "var(--font-jetbrains-mono), monospace",
              letterSpacing: "0.18em",
              cursor: "pointer",
            }}
          >
            {tSwipe("viewDetail")}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
