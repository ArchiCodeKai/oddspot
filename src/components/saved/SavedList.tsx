"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { getCategoryLabel } from "@/lib/i18n/spotMeta";
import { useRoutePlannerStore } from "@/store/useRoutePlannerStore";
import { useSavedStore } from "@/store/useSavedStore";
import type { SpotMapPoint } from "@/types/spots";

const DISSOLVE_DURATION = 0.5;

// 8px 棋盤格 mask：溶解動畫用，mask-size 逐步放大 = 像素塊被吃掉的效果
const CHECKER_MASK =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8'%3E%3Crect width='4' height='4' fill='black'/%3E%3Crect x='4' y='4' width='4' height='4' fill='black'/%3E%3C/svg%3E\")";

interface SavedListProps {
  spots: SpotMapPoint[];
}

// 收藏清單（client）：移除採樂觀更新——先播溶解動畫再叫 useSavedStore
// 背景同步後端，不做 blocking loading
export function SavedList({ spots }: SavedListProps) {
  const t = useTranslations("savedPage");
  const tMeta = useTranslations("spotMeta");
  const addSpot = useRoutePlannerStore((s) => s.addSpot);
  const removeSave = useSavedStore((s) => s.removeSave);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [dissolvingIds, setDissolvingIds] = useState<string[]>([]);

  const visibleSpots = spots.filter((spot) => !removedIds.includes(spot.id));

  const startRemove = (id: string) => {
    setDissolvingIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const finishRemove = (id: string) => {
    setRemovedIds((prev) => [...prev, id]);
    setDissolvingIds((prev) => prev.filter((value) => value !== id));
    // 後端同步交給 store（樂觀更新 + 失敗還原），UI 不等待
    removeSave(id);
  };

  return (
    <>
      <style>{`
        @keyframes saved-pixel-out {
          0% {
            opacity: 1;
            -webkit-mask-size: 3px 3px;
            mask-size: 3px 3px;
          }
          40% {
            opacity: 0.8;
            -webkit-mask-size: 8px 8px;
            mask-size: 8px 8px;
          }
          75% {
            opacity: 0.5;
            -webkit-mask-size: 16px 16px;
            mask-size: 16px 16px;
          }
          100% {
            opacity: 0;
            -webkit-mask-size: 28px 28px;
            mask-size: 28px 28px;
          }
        }
        .saved-card-dissolve {
          -webkit-mask-image: ${CHECKER_MASK};
          mask-image: ${CHECKER_MASK};
          -webkit-mask-repeat: repeat;
          mask-repeat: repeat;
          animation: saved-pixel-out ${DISSOLVE_DURATION}s steps(4, end) forwards;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .saved-card-dissolve {
            animation-duration: 0.15s;
          }
        }
        .saved-back-button:hover,
        .saved-back-button:focus-visible {
          background: rgb(var(--accent-rgb) / 0.22) !important;
          box-shadow: 0 0 20px rgb(var(--accent-rgb) / 0.32) !important;
        }
      `}</style>

      <div className="mb-5 flex items-center gap-3">
        <Link
          href="/map"
          className="saved-back-button flex items-center gap-1.5 px-3 py-2 text-xs uppercase transition-all"
          style={{
            background: "rgb(var(--accent-rgb) / 0.15)",
            border: "1px solid rgb(var(--accent-rgb) / 0.6)",
            color: "var(--accent)",
            borderRadius: 2,
            boxShadow: "0 0 12px rgb(var(--accent-rgb) / 0.2)",
            fontFamily: "var(--font-jetbrains-mono), monospace",
            letterSpacing: "0.18em",
            fontWeight: 700,
          }}
        >
          ← {t("back")}
        </Link>
        <span
          className="ml-auto text-xs tracking-[0.18em]"
          style={{ color: "var(--muted)" }}
        >
          {t("count", { count: visibleSpots.length })}
        </span>
      </div>

      <h1 className="font-content text-2xl font-bold">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
        {t("description")}
      </p>

      {visibleSpots.length === 0 ? (
        <div
          className="mt-8 p-5 text-sm"
          style={{
            border: "1px dashed var(--line-strong)",
            color: "var(--muted)",
            borderRadius: 2,
          }}
        >
          {t("empty")}
        </div>
      ) : (
        <div className="mt-6 grid gap-3">
          {visibleSpots.map((spot) => {
            const dissolving = dissolvingIds.includes(spot.id);
            return (
              <motion.article
                key={spot.id}
                layout
                animate={dissolving ? { x: 480, rotate: 1.5 } : { x: 0, rotate: 0 }}
                transition={
                  dissolving
                    ? { duration: DISSOLVE_DURATION, ease: [0.5, 0, 0.85, 0.35] }
                    : { type: "spring", stiffness: 320, damping: 30 }
                }
                onAnimationComplete={() => {
                  if (dissolving) finishRemove(spot.id);
                }}
                className={`p-4${dissolving ? " saved-card-dissolve" : ""}`}
                style={{
                  background: "var(--panel-glass)",
                  border: "1px solid var(--line)",
                  borderRadius: 2,
                }}
              >
                <div className="flex gap-3">
                  <Link
                    href={`/spots/${spot.id}`}
                    className="h-20 w-20 flex-shrink-0 overflow-hidden"
                    style={{ background: "var(--panel-light)", borderRadius: 2 }}
                  >
                    {spot.coverImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={spot.coverImage}
                        alt={spot.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs">
                        NO IMG
                      </div>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap gap-2">
                      <CategoryBadge
                        category={spot.category}
                        label={getCategoryLabel(tMeta, spot.category)}
                      />
                      <StatusBadge status={spot.status} />
                    </div>
                    <Link href={`/spots/${spot.id}`} className="font-content text-base font-bold">
                      {spot.name}
                    </Link>
                    {spot.nameEn && (
                      <p className="mt-1 truncate text-xs" style={{ color: "var(--muted)" }}>
                        {spot.nameEn}
                      </p>
                    )}
                    {spot.address && (
                      <p className="mt-2 line-clamp-1 text-xs" style={{ color: "var(--muted)" }}>
                        {spot.address}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addSpot(spot)}
                        className="px-3 py-2 text-xs tracking-[0.16em]"
                        style={{
                          border: "1px solid var(--accent)",
                          color: "var(--accent)",
                          background: "rgb(var(--accent-rgb) / 0.1)",
                          borderRadius: 2,
                          cursor: "pointer",
                        }}
                      >
                        {t("addToTrip")}
                      </button>
                      <button
                        type="button"
                        onClick={() => startRemove(spot.id)}
                        disabled={dissolving}
                        className="px-3 py-2 text-xs tracking-[0.16em] disabled:opacity-50"
                        style={{
                          border: "1px solid var(--line)",
                          color: "var(--muted)",
                          background: "transparent",
                          borderRadius: 2,
                          cursor: "pointer",
                        }}
                      >
                        {t("remove")}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </>
  );
}
